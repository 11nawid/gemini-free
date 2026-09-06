import { ProxyAgent } from 'undici';
import { loadCookie, makeSapisidHash } from './auth';
import { CONFIG } from './config';

export interface StreamChunk {
  content?: string;
  reasoning?: string;
}

/**
 * Logs a message to stderr if logging is enabled.
 */
export function log(msg: string): void {
  if (CONFIG.log_requests) {
    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0]; // HH:MM:SS
    console.error(`[${timeStr}] ${msg}`);
  }
}

/**
 * Returns the Gemini account path prefix for non-default Google accounts.
 */
export function accountPrefix(): string {
  const authUser = CONFIG.auth_user;
  if (authUser == null || authUser === "") {
    return "";
  }
  return `/u/${authUser}`;
}

/**
 * Builds HTTP headers for the Gemini request.
 */
export function buildHeaders(): Record<string, string> {
  const accountPrefixValue = accountPrefix();
  const headers: Record<string, string> = {
    "Content-Type": "application/x-www-form-urlencoded",
    "Origin": "https://gemini.google.com",
    "Referer": `https://gemini.google.com${accountPrefixValue}/app`,
    "X-Same-Domain": "1",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
  };
  
  if (accountPrefixValue) {
    headers["X-Goog-AuthUser"] = String(CONFIG.auth_user);
  }
  
  const { cookieStr, sapisid } = loadCookie();
  if (cookieStr) {
    headers["Cookie"] = cookieStr;
  }
  if (sapisid) {
    headers["Authorization"] = makeSapisidHash(sapisid);
  }
  
  return headers;
}

/**
 * Builds the URL-encoded payload for the Gemini stream generation.
 */
export function buildPayload(
  prompt: string,
  modelId: number,
  thinkMode: number,
  fileRefs?: any[],
  extraFields?: Record<number, any>
): string {
  const inner = new Array(102).fill(null);
  
  if (fileRefs && fileRefs.length > 0) {
    const refs = fileRefs.map(ref => [null, null, ref]);
    inner[0] = [prompt, 0, null, refs, null, null, 0];
  } else {
    inner[0] = [prompt, 0, null, null, null, null, 0];
  }
  
  inner[1] = ["en"];
  inner[2] = ["", "", "", null, null, null, null, null, null, ""];
  inner[6] = [0];
  inner[7] = 1;
  inner[10] = 1;
  inner[11] = 0;
  inner[17] = [[thinkMode]];
  inner[18] = 0;
  inner[27] = 1;
  inner[30] = [4];
  
  if (CONFIG.temporary_chats) {
    inner[41] = [1];
    inner[45] = 1;
  } else {
    inner[41] = [2];
  }
  
  inner[53] = 0;
  inner[59] = crypto.randomUUID();
  inner[61] = [];
  inner[68] = 1;
  inner[79] = modelId;
  
  if (extraFields) {
    for (const [k, v] of Object.entries(extraFields)) {
      inner[Number(k)] = v;
    }
  }
  
  const outer = [null, JSON.stringify(inner)];
  const params = new URLSearchParams();
  params.append("f.req", JSON.stringify(outer));
  
  if (CONFIG.xsrf_token) {
    params.append("at", CONFIG.xsrf_token as string);
  }
  
  return params.toString();
}

/**
 * Gets the Gemini stream generation endpoint URL.
 */
export function getUrl(): string {
  const reqid = Math.floor(Date.now() / 1000) % 1000000;
  const accountPrefixValue = accountPrefix();
  return `https://gemini.google.com${accountPrefixValue}/_/BardChatUi/data/assistant.lamda.BardFrontendService/StreamGenerate?bl=${CONFIG.gemini_bl}&hl=en&_reqid=${reqid}&rt=c`;
}

/**
 * Cleans extracted text by stripping metadata like code references, card URLs, and followups.
 */
export function cleanText(text: string, strip: boolean = true): string {
  let cleaned = text;

  // Strip code execution metadata & card URLs
  cleaned = cleaned.replace(/```(?:python|javascript|text)\?code_(?:reference|stdout)&code_event_index=\d+\n[\s\S]*?```\n?/g, '');
  cleaned = cleaned.replace(/http:\/\/googleusercontent\.com\/card_content\/\d+\n?/g, '');

  // Transform <Step ...> into clean markdown headers
  cleaned = cleaned.replace(/<Step\b(?:\s+subtitle="([^"]*)")?\s+title="([^"]*)"[^>]*>/gi, (_m, sub, title) => {
    return sub ? `\n### ${sub}: ${title}\n` : `\n### ${title}\n`;
  });
  cleaned = cleaned.replace(/<Step\b\s+title="([^"]*)"(?:\s+subtitle="([^"]*)")?[^>]*>/gi, (_m, title, sub) => {
    return sub ? `\n### ${sub}: ${title}\n` : `\n### ${title}\n`;
  });

  // Strip Gemini container/wrapper tags
  cleaned = cleaned.replace(/<\/?Sequence[^>]*>/gi, '');
  cleaned = cleaned.replace(/<\/Step>/gi, '');

  // Strip Gemini follow-up / elicitation cards
  cleaned = cleaned.replace(/<ElicitationsGroup[\s\S]*?<\/ElicitationsGroup>/gi, '');
  cleaned = cleaned.replace(/<Elicitation\b[^>]*\/?>/gi, '');
  cleaned = cleaned.replace(/<FollowUp\b[^>]*\/?>/gi, '');
  cleaned = cleaned.replace(/<Image\b[^>]*\/?>/gi, '');
  cleaned = cleaned.replace(/<ContextualQuery\b[^>]*\/?>/gi, '');

  // Guard against model ID leakage and Gemini engine strings
  cleaned = cleaned.replace(/\s*\(ID:\s*gemini-[^)]+\)/gi, '');
  cleaned = cleaned.replace(/\bID:\s*gemini-[a-z0-9.-]+\b/gi, 'ID: gemini-free-engine');
  cleaned = cleaned.replace(/\bgemini-([0-9.]+-[a-z0-9-]+)\b/gi, 'gemini-free-$1');
  cleaned = cleaned.replace(/\bgemini-[a-z0-9-]+\b/gi, 'Gemini Free engine');

  // Strip Google image generation refusal messages
  cleaned = cleaned.replace(/I can search for images, but can't create any for you at the moment[\s\S]*?(?:location yet\.|moment\.)/gi, '');
  cleaned = cleaned.replace(/I cannot (?:create|generate) images (?:at the moment|right now)[\s\S]*?(?:location yet\.|moment\.)/gi, '');

  // Prevent awkward "not Claude, GPT, or Gemini Free" bug
  cleaned = cleaned.replace(/\b(?:not|neither)\s+(?:Claude|GPT|OpenAI)?[,\s]+(?:Claude|GPT|OpenAI)?[,\s]*(?:or|nor)\s+Gemini\b/gi, 'not Claude, GPT, or any external model');
  cleaned = cleaned.replace(/\b(?:not|nor)\s+Gemini\b/gi, 'not an external model');

  // Guard against standard canned greetings and model identity leakage
  cleaned = cleaned.replace(
    /\b(?:I am|I'm|This is)\s+(?:Gemini|Bard)[,\.]?\s+(?:a\s+)?(?:large language model|multimodal model|AI)\s+(?:built|trained|created|developed)\s+by\s+Google[,\.]?/gi,
    "I am Gemini Free, an AI developer platform. The Gemini Free application runs locally."
  );
  cleaned = cleaned.replace(/\b(?:I am|I'm|This is)\s+(?:Gemini|Bard)\b[,\.]?/gi, "I am Gemini Free,");
  cleaned = cleaned.replace(/\ba large language model\s+(?:built|trained|created|developed)\s+by\s+Google\b/gi, 'an AI developer engine');
  cleaned = cleaned.replace(/\b(?:built|trained|created|developed)\s+by\s+Google\b/gi, 'built by the Gemini Free engine');
  cleaned = cleaned.replace(/\b(?:made|built|created)\s+by\s+Google\b/gi, 'built by the Gemini Free engine');
  cleaned = cleaned.replace(/\ba large language model\b/gi, 'an AI developer engine');
  cleaned = cleaned.replace(/\bGoogle DeepMind\b/gi, 'Gemini Free Core');
  cleaned = cleaned.replace(/\bGoogle AI\b/gi, 'Gemini Free AI');
  cleaned = cleaned.replace(/\bGemini\b/gi, 'Gemini Free');

  // Clean trailing blank lines
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return strip ? cleaned.trim() : cleaned;
}

/**
 * Parses a single wrb.fr line and extracts text fragments.
 */
export function extractTextsFromLine(line: string): string[] {
  if (!line.includes('"wrb.fr"')) {
    return [];
  }
  try {
    const jsonStart = line.indexOf('[[');
    if (jsonStart === -1) return [];
    const arr = JSON.parse(line.slice(jsonStart));
    const innerStr = arr[0]?.[2];
    if (!innerStr || innerStr.length < 50) {
      return [];
    }
    const inner = JSON.parse(innerStr);
    if (!Array.isArray(inner) || inner.length <= 4 || !inner[4]) {
      return [];
    }
    const texts: string[] = [];
    for (const part of inner[4]) {
      if (Array.isArray(part) && part.length > 1 && part[1] && Array.isArray(part[1])) {
        for (const t of part[1]) {
          if (typeof t === 'string' && t) {
            texts.push(t);
          }
        }
      }
    }
    return texts;
  } catch (e) {
    return [];
  }
}

/**
 * Parses the full response payload to get the final generated text.
 */
export function extractResponseText(raw: string): string {
  const bardErrMatch = raw.match(/BardErrorInfo\s*\[(\d+)\]/);
  if (bardErrMatch) {
    throw new Error(`Gemini upstream rejected request: BardErrorInfo [${bardErrMatch[1]}]`);
  }
  let lastText = "";
  const lines = raw.split("\n");
  for (const line of lines) {
    for (const t of extractTextsFromLine(line)) {
      if (t.length > lastText.length) {
        lastText = t;
      }
    }
  }
  return cleanText(lastText);
}

function getDispatcher(): ProxyAgent | undefined {
  return CONFIG.proxy ? new ProxyAgent(CONFIG.proxy) : undefined;
}

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Performs a non-streaming generation with retries.
 */
export async function generate(
  prompt: string,
  modelId: number,
  thinkMode: number,
  fileRefs?: any[],
  extraFields?: Record<number, any>,
  signal?: AbortSignal
): Promise<string> {
  const body = buildPayload(prompt, modelId, thinkMode, fileRefs, extraFields);
  const url = getUrl();
  const headers = buildHeaders();
  
  let lastErr: any = null;
  const attempts = CONFIG.retry_attempts || 1;
  const delayMs = (CONFIG.retry_delay_sec || 1) * 1000;
  
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (signal?.aborted) {
      throw new Error("Request aborted");
    }
    try {
      const response = await fetch(url, {
        method: 'POST',
        body,
        headers,
        dispatcher: getDispatcher(),
        signal,
      } as any);
      
      const raw = await response.text();
      return extractResponseText(raw);
    } catch (e: any) {
      lastErr = e;
      if (signal?.aborted || e?.name === 'AbortError') {
        throw e;
      }
      if (attempt < attempts - 1) {
        log(`Retry ${attempt + 1}/${attempts}: ${e.message || e}`);
        await sleep(delayMs);
      }
    }
  }
  throw lastErr;
}

/**
 * Helper parser to split streaming text into reasoning and content chunks.
 */
function createThoughtStreamParser() {
  let inThought = false;
  let tagBuffer = '';

  return function processDelta(delta: string): StreamChunk[] {
    const outputs: { type: 'reasoning' | 'content'; text: string }[] = [];
    let i = 0;

    while (i < delta.length) {
      const char = delta[i];

      if (!inThought) {
        if (char === '<' || tagBuffer.length > 0) {
          tagBuffer += char;
          if (tagBuffer === '<thought>' || tagBuffer === '<think>') {
            inThought = true;
            tagBuffer = '';
          } else if (!'<thought>'.startsWith(tagBuffer) && !'<think>'.startsWith(tagBuffer)) {
            outputs.push({ type: 'content', text: tagBuffer });
            tagBuffer = '';
          }
        } else {
          outputs.push({ type: 'content', text: char });
        }
      } else {
        if (char === '<' || tagBuffer.length > 0) {
          tagBuffer += char;
          if (tagBuffer === '</thought>' || tagBuffer === '</think>') {
            inThought = false;
            tagBuffer = '';
          } else if (!'</thought>'.startsWith(tagBuffer) && !'</think>'.startsWith(tagBuffer)) {
            outputs.push({ type: 'reasoning', text: tagBuffer });
            tagBuffer = '';
          }
        } else {
          outputs.push({ type: 'reasoning', text: char });
        }
      }
      i++;
    }

    const coalesced: StreamChunk[] = [];
    for (const item of outputs) {
      if (item.type === 'reasoning') {
        if (coalesced.length > 0 && coalesced[coalesced.length - 1].reasoning !== undefined) {
          coalesced[coalesced.length - 1].reasoning += item.text;
        } else {
          coalesced.push({ reasoning: item.text });
        }
      } else {
        if (coalesced.length > 0 && coalesced[coalesced.length - 1].content !== undefined) {
          coalesced[coalesced.length - 1].content += item.text;
        } else {
          coalesced.push({ content: item.text });
        }
      }
    }
    return coalesced;
  };
}

/**
 * Performs streaming generation using fetch API and yields structured text/reasoning deltas.
 */
export async function* generateStream(
  prompt: string,
  modelId: number,
  thinkMode: number,
  fileRefs?: any[],
  extraFields?: Record<number, any>,
  signal?: AbortSignal
): AsyncGenerator<StreamChunk, void, unknown> {
  const body = buildPayload(prompt, modelId, thinkMode, fileRefs, extraFields);
  const url = getUrl();
  const headers = buildHeaders();
  
  let lastErr: any = null;
  let emittedRawText = "";
  let emittedCleanText = "";
  const thoughtParser = createThoughtStreamParser();
  
  const attempts = CONFIG.retry_attempts || 1;
  const delayMs = (CONFIG.retry_delay_sec || 1) * 1000;
  
  for (let attempt = 0; attempt < attempts; attempt++) {
    if (signal?.aborted) return;

    try {
      const response = await fetch(url, {
        method: 'POST',
        body,
        headers,
        dispatcher: getDispatcher(),
        signal,
      } as any);
      
      if (!response.ok) {
        throw new Error(`HTTP Error: ${response.status} ${response.statusText}`);
      }
      
      if (!response.body) {
        throw new Error("No response body");
      }
      
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      
      while (true) {
        if (signal?.aborted) {
          try { await reader.cancel(); } catch {}
          return;
        }

        const { done, value } = await reader.read();
        if (done) break;
        
        buf += decoder.decode(value, { stream: true });
        
        if (buf.includes("BardErrorInfo")) {
          const bardErrMatch = buf.match(/BardErrorInfo\s*\[(\d+)\]/);
          if (bardErrMatch) {
            throw new Error(`Gemini upstream rejected request: BardErrorInfo [${bardErrMatch[1]}]`);
          }
        }
        
        let newlineIdx;
        while ((newlineIdx = buf.indexOf('\n')) !== -1) {
          if (signal?.aborted) {
            try { await reader.cancel(); } catch {}
            return;
          }

          const line = buf.slice(0, newlineIdx);
          buf = buf.slice(newlineIdx + 1);
          
          for (const t of extractTextsFromLine(line)) {
            if (t === emittedRawText || emittedRawText.startsWith(t)) {
              continue;
            }
            if (!t.startsWith(emittedRawText)) {
              throw new Error("Gemini stream content changed during retry");
            }
            const fullClean = cleanText(t, false);
            let delta = "";
            if (fullClean.startsWith(emittedCleanText)) {
              delta = fullClean.slice(emittedCleanText.length);
              emittedCleanText = fullClean;
            } else {
              delta = cleanText(t.slice(emittedRawText.length), false);
              emittedCleanText += delta;
            }
            emittedRawText = t;
            if (delta) {
              const chunks = thoughtParser(delta);
              for (const chunk of chunks) {
                if (signal?.aborted) return;
                yield chunk;
              }
            }
          }
        }
      }
      return;
    } catch (e: any) {
      lastErr = e;
      if (signal?.aborted || e?.name === 'AbortError') {
        return;
      }
      if (attempt < attempts - 1) {
        log(`Stream retry ${attempt + 1}/${attempts}: ${e.message || e}`);
        await sleep(delayMs);
      }
    }
  }
  throw lastErr;
}
