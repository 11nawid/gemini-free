import * as crypto from 'crypto';
import * as fs from 'fs';
import { CONFIG } from './config';

let cookieCache = { cookieStr: "", sapisid: null as string | null, mtime: 0 };

function log(msg: string) {
    if (CONFIG.log_requests) {
        console.error(`[${new Date().toLocaleTimeString('en-GB')}] ${msg}`);
    }
}

export function makeSapisidHash(sapisid: string): string {
    const ts = Math.floor(Date.now() / 1000);
    const hash = crypto.createHash('sha1');
    hash.update(`${ts} ${sapisid} https://gemini.google.com`);
    return `SAPISIDHASH ${ts}_${hash.digest('hex')}`;
}

export function loadCookie(): { cookieStr: string, sapisid: string | null } {
    const cookieFile = CONFIG.cookie_file;
    if (!cookieFile || !fs.existsSync(cookieFile)) {
        return { cookieStr: "", sapisid: null };
    }

    try {
        const mtime = fs.statSync(cookieFile).mtimeMs;
        if (mtime === cookieCache.mtime && cookieCache.cookieStr) {
            return { cookieStr: cookieCache.cookieStr, sapisid: cookieCache.sapisid };
        }

        const content = fs.readFileSync(cookieFile, 'utf8').trim();
        let cookieStr = "";
        let sapisid: string | null = null;

        if (content.startsWith("{")) {
            const data = JSON.parse(content);
            cookieStr = data.cookie || "";
            sapisid = data.sapisid || "";
        } else {
            cookieStr = content;
            const pairs: Record<string, string> = {};
            cookieStr.split('; ').forEach(p => {
                if (p.includes('=')) {
                    const [key, ...val] = p.split('=');
                    pairs[key.trim()] = val.join('=').trim();
                }
            });
            sapisid = pairs['SAPISID'] || "";
        }

        cookieCache = { cookieStr, sapisid: sapisid || null, mtime };
        return { cookieStr, sapisid: sapisid || null };
    } catch (e) {
        log(`Cookie load error: ${e instanceof Error ? e.message : String(e)}`);
        return { cookieStr: cookieCache.cookieStr, sapisid: cookieCache.sapisid };
    }
}

export function validateApiKey(request: Request): boolean {
    const keys = CONFIG.api_keys || [];
    if (keys.length === 0) return true;

    const auth = request.headers.get("Authorization") || "";
    if (auth.startsWith("Bearer ")) {
        if (keys.includes(auth.substring(7))) return true;
    }

    const xApiKey = request.headers.get("x-api-key");
    if (xApiKey && keys.includes(xApiKey)) return true;

    const xGoogApiKey = request.headers.get("x-goog-api-key");
    if (xGoogApiKey && keys.includes(xGoogApiKey)) return true;

    try {
        const url = new URL(request.url);
        const keyParam = url.searchParams.get("key");
        if (keyParam && keys.includes(keyParam)) return true;
    } catch {
        // invalid URL
    }

    return false;
}

export function unauthorizedResponse(): Response {
    return new Response(JSON.stringify({
        error: { message: "Invalid or missing API key.", type: "invalid_request_error" }
    }), {
        status: 401,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
        }
    });
}
