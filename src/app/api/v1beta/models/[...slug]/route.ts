export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { CONFIG } from '@/lib/config';
import { resolveModel } from '@/lib/models';
import { generate, generateStream, log } from '@/lib/gemini';
import { googleContentsToPrompt, parseGoogleFunctionCalls } from '@/lib/tools';
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

export async function POST(req: Request, context: { params: Promise<{ slug: string[] }> }) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch {
      return NextResponse.json({ error: { message: 'invalid JSON' } }, { status: 400, headers: corsHeaders });
    }

    const { slug } = await context.params;
    const slugStr = slug.join('/');
    const isStream = slugStr.includes(':streamGenerateContent');
    const modelParam = slugStr.split(':')[0] || CONFIG.default_model;

    const resolved = resolveModel(modelParam);
    if (resolved.error) {
      return NextResponse.json({ error: { message: resolved.error } }, { status: 400, headers: corsHeaders });
    }

    const toolConfig = body.toolConfig || {};
    const fcMode = toolConfig.functionCallingConfig?.mode || 'AUTO';
    const hasTools = Boolean(body.tools) && fcMode !== 'NONE';

    const [prompt, images] = googleContentsToPrompt(body);
    if (!prompt.trim()) {
      return NextResponse.json({ error: { message: 'empty content' } }, { status: 400, headers: corsHeaders });
    }

    let fileRefs: string[] | null = null;
    try {
      fileRefs = await uploadImages(images);
    } catch (e: any) {
      return NextResponse.json({ error: { message: `upstream error: ${e.message}` } }, { status: 502, headers: corsHeaders });
    }

    log(`Google API: model=${resolved.name} stream=${isStream} tools=${hasTools} prompt_len=${prompt.length}`);

    if (isStream && !hasTools) {
      const responseStream = new ReadableStream({
        async start(controller) {
          const enc = new TextEncoder();
          const write = (d: string) => controller.enqueue(enc.encode(`data: ${d}\n\n`));
          let fullText = '';

          try {
            for await (const delta of generateStream(prompt, resolved.modeId, resolved.thinkMode, fileRefs ?? undefined, resolved.extraFields ?? undefined)) {
              if (!delta) continue;
              fullText += delta;
              write(JSON.stringify({
                candidates: [{ content: { parts: [{ text: delta }], role: 'model' }, index: 0 }],
                modelVersion: resolved.name,
              }));
            }
            write(JSON.stringify({
              candidates: [{ finishReason: 'STOP', index: 0 }],
              usageMetadata: {
                promptTokenCount: Math.floor(prompt.length / 4),
                candidatesTokenCount: Math.floor(fullText.length / 4),
                totalTokenCount: Math.floor((prompt.length + fullText.length) / 4),
              },
              modelVersion: resolved.name,
            }));
          } catch (e: any) {
            console.error('Google stream error:', e);
          } finally {
            controller.close();
          }
        },
      });

      return new Response(responseStream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' },
      });
    }

    let text: string;
    try {
      text = await generate(prompt, resolved.modeId, resolved.thinkMode, fileRefs ?? undefined, resolved.extraFields ?? undefined);
    } catch (e: any) {
      return NextResponse.json({ error: { message: `upstream error: ${e.message}` } }, { status: 502, headers: corsHeaders });
    }

    if (!text) log('Warning: empty response from Gemini');

    const responseParts: any[] = [];
    if (hasTools && text) {
      const [cleanText, functionCalls] = parseGoogleFunctionCalls(text);
      if (functionCalls.length > 0) {
        if (cleanText) responseParts.push({ text: cleanText });
        for (const fc of functionCalls) {
          responseParts.push({ functionCall: { name: fc.name, args: fc.args } });
        }
      } else {
        responseParts.push({ text });
      }
    } else {
      responseParts.push({ text: text || 'I apologize, but I was unable to generate a response. Please try again.' });
    }

    const responseObj = {
      candidates: [{ content: { parts: responseParts, role: 'model' }, finishReason: 'STOP', index: 0 }],
      usageMetadata: {
        promptTokenCount: Math.floor(prompt.length / 4),
        candidatesTokenCount: Math.floor((text || '').length / 4),
        totalTokenCount: Math.floor((prompt.length + (text || '').length) / 4),
      },
      modelVersion: resolved.name,
    };

    if (isStream) {
      const responseStream = new ReadableStream({
        async start(controller) {
          const enc = new TextEncoder();
          controller.enqueue(enc.encode(`data: ${JSON.stringify(responseObj)}\n\n`));
          controller.close();
        },
      });
      return new Response(responseStream, {
        headers: { ...corsHeaders, 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' },
      });
    }

    return NextResponse.json(responseObj, { headers: corsHeaders });
  } catch (error: any) {
    return NextResponse.json({ error: { message: error.message } }, { status: 500, headers: corsHeaders });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: corsHeaders });
}
