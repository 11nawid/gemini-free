export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';
import { CONFIG } from '@/lib/config';
import { resolveModel } from '@/lib/models';
import { generate } from '@/lib/gemini';
import { messagesToPrompt, parseToolCalls } from '@/lib/tools';
import { fetchImageBytes, detectImageMime, uploadImage } from '@/lib/multimodal';
import type { ImageItem } from '@/lib/types';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
  'Access-Control-Allow-Private-Network': 'true',
};

async function uploadImages(images: ImageItem[]): Promise<string[] | null> {
  if (!images.length) return null;
  const refs: string[] = [];
  for (const [data, mime] of images) {
    let bytes: Buffer = typeof data === 'string' ? await fetchImageBytes(data) : Buffer.isBuffer(data) ? data : Buffer.from(data);
    if (!bytes.length) throw new Error('image fetch failed');
    const detectedMime = detectImageMime(bytes, mime || 'image/png');
    refs.push(await uploadImage(bytes, 'image.png', detectedMime));
  }
  return refs.length ? refs : null;
}

export async function POST(req: Request) {
  try {
    if (!validateApiKey(req)) {
      return unauthorizedResponse();
    }

    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { message: 'invalid JSON' } }, { status: 400, headers: corsHeaders });
    }

    const resolved = resolveModel(body.model || CONFIG.default_model);
    if (resolved.error) {
      return NextResponse.json({ error: { message: resolved.error } }, { status: 400, headers: corsHeaders });
    }

    const inputItems = body.input || [];
    let tools = body.tools;
    const messages: any[] = [];

    if (body.instructions) {
      messages.push({ role: 'system', content: body.instructions });
    }

    if (typeof inputItems === 'string') {
      messages.push({ role: 'user', content: inputItems });
    } else if (Array.isArray(inputItems)) {
      for (const item of inputItems) {
        if (typeof item === 'string') {
          messages.push({ role: 'user', content: item });
        } else if (typeof item === 'object') {
          if (item.type === 'function_call_output') {
            messages.push({ role: 'tool', tool_call_id: item.call_id || '', name: item.name || '', content: item.output || '' });
          } else if (['input_text', 'input_image', 'image'].includes(item.type)) {
            messages.push({ role: 'user', content: [item] });
          } else if (item.role === 'assistant' || (item.type === 'message' && item.role === 'assistant')) {
            const cp = item.content || [];
            let textAcc = '';
            const tcList: any[] = [];
            if (Array.isArray(cp)) {
              for (const c of cp) {
                if (typeof c === 'object') {
                  if (c.type === 'output_text') textAcc += c.text || '';
                  else if (c.type === 'function_call') tcList.push(c);
                }
              }
            } else if (typeof cp === 'string') {
              textAcc = cp;
            }
            const m: any = { role: 'assistant', content: textAcc || null };
            if (tcList.length > 0) {
              m.tool_calls = tcList.map((tc: any, i: number) => ({
                id: tc.call_id || `call_${i}`, type: 'function',
                function: { name: tc.name || '', arguments: tc.arguments || '{}' },
              }));
            }
            messages.push(m);
          } else {
            messages.push({ role: item.role || 'user', content: item.content || '' });
          }
        }
      }
    }

    if (tools) {
      tools = tools.map((t: any) => {
        if (t.type === 'function' && !('function' in t)) {
          return { type: 'function', function: { name: t.name, description: t.description || '', parameters: t.parameters || {} } };
        }
        return t;
      });
    }

    const toolChoice = body.tool_choice || 'auto';
    const [prompt, images] = messagesToPrompt(messages, tools, toolChoice);

    if (!prompt.trim()) {
      return NextResponse.json({ error: { message: 'empty input' } }, { status: 400, headers: corsHeaders });
    }

    let fileRefs: string[] | null = null;
    let text: string;
    try {
      fileRefs = await uploadImages(images);
      text = await generate(prompt, resolved.modeId, resolved.thinkMode, fileRefs ?? undefined, resolved.extraFields ?? undefined);
    } catch (e: any) {
      return NextResponse.json({ error: { message: `upstream error: ${e.message}` } }, { status: 502, headers: corsHeaders });
    }

    let toolCalls: any[] | null = null;
    if (tools && text && toolChoice !== 'none') {
      const [cleanText, parsed] = parseToolCalls(text);
      text = cleanText;
      toolCalls = parsed.length ? parsed : null;
    }

    const rid = `resp_${crypto.randomUUID().replace(/-/g, '').slice(0, 16)}`;
    const mid = `msg_${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;
    const output: any[] = [];

    if (toolCalls) {
      for (const tc of toolCalls) {
        output.push({ type: 'function_call', id: tc.id, call_id: tc.id, name: tc.function.name, arguments: tc.function.arguments, status: 'completed' });
      }
    }
    if (text || !toolCalls) {
      output.push({ type: 'message', id: mid, role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: text || '', annotations: [] }] });
    }

    if (body.stream) {
      const responseStream = new ReadableStream({
        async start(controller) {
          const enc = new TextEncoder();
          let sequenceNumber = 0;
          const emit = (eventType: string, fields: any) => {
            sequenceNumber++;
            const event = { type: eventType, sequence_number: sequenceNumber, ...fields };
            controller.enqueue(enc.encode(`event: ${eventType}\ndata: ${JSON.stringify(event)}\n\n`));
          };

          const usage = {
            input_tokens: Math.floor(prompt.length / 4),
            output_tokens: Math.floor((text || '').length / 4),
            total_tokens: Math.floor((prompt.length + (text || '').length) / 4),
          };
          const baseResponse = { id: rid, object: 'response', created_at: Math.floor(Date.now() / 1000), model: resolved.name };

          emit('response.created', { response: { ...baseResponse, status: 'in_progress', output: [], usage: null } });
          emit('response.in_progress', { response: { ...baseResponse, status: 'in_progress', output: [], usage: null } });

          for (let oi = 0; oi < output.length; oi++) {
            const item = output[oi];
            if (item.type === 'function_call') {
              emit('response.output_item.added', { output_index: oi, item: { ...item, arguments: '', status: 'in_progress' } });
              emit('response.function_call_arguments.delta', { item_id: item.id, output_index: oi, delta: item.arguments });
              emit('response.function_call_arguments.done', { item_id: item.id, output_index: oi, arguments: item.arguments });
              emit('response.output_item.done', { output_index: oi, item });
            } else if (item.type === 'message') {
              emit('response.output_item.added', { output_index: oi, item: { type: 'message', id: item.id, role: 'assistant', status: 'in_progress', content: [] } });
              for (let ci = 0; ci < item.content.length; ci++) {
                const cp = item.content[ci];
                const ef = { item_id: item.id, output_index: oi, content_index: ci };
                emit('response.content_part.added', { ...ef, part: { type: 'output_text', text: '', annotations: [] } });
                emit('response.output_text.delta', { ...ef, delta: cp.text });
                emit('response.output_text.done', { ...ef, text: cp.text });
                emit('response.content_part.done', { ...ef, part: cp });
              }
              emit('response.output_item.done', { output_index: oi, item });
            }
          }
          emit('response.completed', { response: { ...baseResponse, status: 'completed', output, usage } });
          controller.close();
        },
      });

      return new Response(responseStream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' },
      });
    }

    return NextResponse.json({
      id: rid, object: 'response', created_at: Math.floor(Date.now() / 1000), status: 'completed',
      model: resolved.name, output,
      usage: { input_tokens: Math.floor(prompt.length / 4), output_tokens: Math.floor((text || '').length / 4), total_tokens: Math.floor((prompt.length + (text || '').length) / 4) },
    }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
