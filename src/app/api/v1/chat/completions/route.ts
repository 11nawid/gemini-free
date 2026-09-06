export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { validateApiKey, unauthorizedResponse } from '@/lib/auth';
import { CONFIG } from '@/lib/config';
import { resolveModel } from '@/lib/models';
import { generate, generateStream } from '@/lib/gemini';
import { messagesToPrompt, parseToolCalls } from '@/lib/tools';
import { cleanAssistantText } from '@/lib/clean';
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

    const modelParam = body.model || CONFIG.default_model;
    const resolved = resolveModel(modelParam);
    if (resolved.error) {
      return NextResponse.json({ error: { message: resolved.error } }, { status: 400, headers: corsHeaders });
    }

    const tools = body.tools;
    const toolChoice = body.tool_choice || 'auto';
    const inputMessages = [...(body.messages || [])];

    // For thinking models or @think=0, inject prompt guidance so reasoning can be extracted
    if (resolved.thinkMode === 0 || resolved.name.includes('thinking')) {
      inputMessages.unshift({
        role: 'system',
        content: 'When thinking or reasoning through a problem, enclose your thought process inside <thought>...</thought> tags before giving the final answer.',
      });
    }

    const [prompt, images] = messagesToPrompt(inputMessages, tools, toolChoice);

    if (!prompt.trim()) {
      return NextResponse.json({ error: { message: 'empty prompt' } }, { status: 400, headers: corsHeaders });
    }

    const stream = body.stream || false;
    const cid = `chatcmpl-${crypto.randomUUID().replace(/-/g, '').slice(0, 12)}`;

    let fileRefs: string[] | null = null;
    try {
      fileRefs = await uploadImages(images);
    } catch (e: any) {
      return NextResponse.json({ error: { message: `upstream error: ${e.message}` } }, { status: 502, headers: corsHeaders });
    }

    if (stream && (!tools || toolChoice === 'none')) {
      const abortCtrl = new AbortController();
      let isClosed = false;

      const handleClientAbort = () => {
        isClosed = true;
        abortCtrl.abort();
      };

      if (req.signal) {
        req.signal.addEventListener('abort', handleClientAbort);
      }

      const responseStream = new ReadableStream({
        async start(controller) {
          const enc = new TextEncoder();
          const write = (d: string) => {
            if (isClosed || req.signal?.aborted || abortCtrl.signal.aborted) return;
            try {
              controller.enqueue(enc.encode(`data: ${d}\n\n`));
            } catch {
              isClosed = true;
            }
          };

          try {
            write(JSON.stringify({
              id: cid,
              object: 'chat.completion.chunk',
              created: Math.floor(Date.now() / 1000),
              model: resolved.name,
              choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }],
            }));

            for await (const chunk of generateStream(
              prompt,
              resolved.modeId,
              resolved.thinkMode,
              fileRefs ?? undefined,
              resolved.extraFields ?? undefined,
              abortCtrl.signal
            )) {
              if (isClosed || req.signal?.aborted || abortCtrl.signal.aborted) break;

              if (chunk.reasoning) {
                write(JSON.stringify({
                  id: cid,
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  model: resolved.name,
                  choices: [{
                    index: 0,
                    delta: {
                      reasoning_content: chunk.reasoning,
                      reasoning: chunk.reasoning,
                    },
                    finish_reason: null,
                  }],
                }));
              }
              if (chunk.content) {
                write(JSON.stringify({
                  id: cid,
                  object: 'chat.completion.chunk',
                  created: Math.floor(Date.now() / 1000),
                  model: resolved.name,
                  choices: [{
                    index: 0,
                    delta: { content: chunk.content },
                    finish_reason: null,
                  }],
                }));
              }
            }

            if (!isClosed && !req.signal?.aborted && !abortCtrl.signal.aborted) {
              write(JSON.stringify({
                id: cid,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: resolved.name,
                choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
              }));
              write('[DONE]');
            }
          } catch (e: any) {
            if (!req.signal?.aborted && !abortCtrl.signal.aborted) {
              console.error('Stream error:', e);
            }
          } finally {
            if (req.signal) {
              req.signal.removeEventListener('abort', handleClientAbort);
            }
            if (!isClosed && !req.signal?.aborted && !abortCtrl.signal.aborted) {
              try {
                controller.close();
              } catch {}
            }
            isClosed = true;
          }
        },
        cancel() {
          isClosed = true;
          abortCtrl.abort();
        },
      });

      return new Response(responseStream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    let text: string;
    try {
      text = await generate(prompt, resolved.modeId, resolved.thinkMode, fileRefs ?? undefined, resolved.extraFields ?? undefined, req.signal);
    } catch (e: any) {
      if (req.signal?.aborted) {
        return new NextResponse(null, { status: 499 });
      }
      return NextResponse.json({ error: { message: `upstream error: ${e.message}` } }, { status: 502, headers: corsHeaders });
    }

    let toolCalls: any[] | null = null;
    if (tools && text && toolChoice !== 'none') {
      const [cleanText, parsed] = parseToolCalls(text);
      text = cleanText;
      toolCalls = parsed.length ? parsed : null;
    }

// Extract thoughts from non-streaming response if present
    let reasoningText: string | undefined = undefined;
    const thoughtMatch = text.match(/<thought>([\s\S]*?)<\/thought>/i) || text.match(/ thinking([\s\S]*?)<\/think>/i);
    if (thoughtMatch) {
      reasoningText = thoughtMatch[1].trim();
      text = text.replace(/<thought>[\s\S]*?<\/thought>/gi, '').replace(/ thinking[\s\S]*?<\/think>/gi, '').trim();
    }

    // Final cleanup pipeline: strip redundant branding repeats, duplicated
    // filler, and excessive blank lines before returning to the client.
    text = cleanAssistantText(text);

    const msg: any = { role: 'assistant', content: text || null };
    if (reasoningText) {
      msg.reasoning_content = reasoningText;
      msg.reasoning = reasoningText;
    }
    if (toolCalls) msg.tool_calls = toolCalls;
    const finish = toolCalls ? 'tool_calls' : 'stop';

    if (stream) {
      const responseStream = new ReadableStream({
        async start(controller) {
          const enc = new TextEncoder();
          const write = (d: string) => controller.enqueue(enc.encode(`data: ${d}\n\n`));
          write(JSON.stringify({
            id: cid,
            object: 'chat.completion.chunk',
            created: Math.floor(Date.now() / 1000),
            model: resolved.name,
            choices: [{ index: 0, delta: msg, finish_reason: finish }],
          }));
          write('[DONE]');
          try { controller.close(); } catch {}
        },
      });
      return new Response(responseStream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      });
    }

    return NextResponse.json({
      id: cid,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: resolved.name,
      choices: [{ index: 0, message: msg, finish_reason: finish }],
      usage: {
        prompt_tokens: Math.floor(prompt.length / 4),
        completion_tokens: Math.floor((text || '').length / 4),
        total_tokens: Math.floor((prompt.length + (text || '').length) / 4),
      },
    }, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
