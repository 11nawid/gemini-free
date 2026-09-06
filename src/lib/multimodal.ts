import { Buffer } from 'buffer';
import { CONFIG } from './config';
import { loadCookie, makeSapisidHash } from './auth';

let pageTokensCache = { tokens: {} as Record<string, string>, ts: 0 };

export function detectImageMime(imageBytes: Buffer, fallback = "image/png"): string {
    if (!Buffer.isBuffer(imageBytes)) return fallback;
    
    if (imageBytes.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]))) return "image/png";
    if (imageBytes.subarray(0, 3).equals(Buffer.from([0xFF, 0xD8, 0xFF]))) return "image/jpeg";
    if (imageBytes.subarray(0, 6).toString('ascii') === 'GIF87a' || imageBytes.subarray(0, 6).toString('ascii') === 'GIF89a') return "image/gif";
    if (imageBytes.subarray(0, 4).toString('ascii') === 'RIFF' && imageBytes.subarray(8, 12).toString('ascii') === 'WEBP') return "image/webp";
    if (imageBytes.subarray(0, 2).toString('ascii') === 'BM') return "image/bmp";
    
    const tiff1 = Buffer.from([0x49, 0x49, 0x2A, 0x00]);
    const tiff2 = Buffer.from([0x4D, 0x4D, 0x00, 0x2A]);
    if (imageBytes.subarray(0, 4).equals(tiff1) || imageBytes.subarray(0, 4).equals(tiff2)) return "image/tiff";
    
    if (imageBytes.length >= 12 && imageBytes.subarray(4, 8).toString('ascii') === 'ftyp') {
        const brand = imageBytes.subarray(8, 12).toString('ascii');
        if (['avif', 'avis'].includes(brand)) return "image/avif";
        if (['heic', 'heix', 'hevc', 'hevx'].includes(brand)) return "image/heic";
    }
    
    return fallback;
}

export async function getPageTokens(): Promise<Record<string, string>> {
    const headers: Record<string, string> = {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };
    const { cookieStr, sapisid } = loadCookie();
    if (cookieStr) headers["Cookie"] = cookieStr;
    if (sapisid) headers["Authorization"] = makeSapisidHash(sapisid);

    try {
        let fetchOptions: RequestInit = { headers };
        if (CONFIG.proxy) {
            const { ProxyAgent } = require('undici');
            fetchOptions = { ...fetchOptions, dispatcher: new ProxyAgent(CONFIG.proxy) } as any;
        }

        const resp = await fetch("https://gemini.google.com/app", fetchOptions);
        const html = await resp.text();
        
        const tokens: Record<string, string> = {};
        
        const patterns = [
            { key: "push_id", regex: /"qKIAYe":"([^"]+)"/ },
            { key: "pctx", regex: /"Ylro7b":"([^"]+)"/ },
            { key: "at", regex: /"thykhd":"([^"]+)"/ },
        ];
        
        for (const { key, regex } of patterns) {
            const match = html.match(regex);
            if (match && match[1]) {
                tokens[key] = match[1];
            }
        }
        return tokens;
    } catch (e) {
        console.error("Page token fetch failed:", e);
        return {};
    }
}

export async function cachedPageTokens(): Promise<Record<string, string>> {
    const now = Math.floor(Date.now() / 1000);
    if (now - pageTokensCache.ts > 600) {
        pageTokensCache.tokens = await getPageTokens();
        pageTokensCache.ts = now;
    }
    return pageTokensCache.tokens;
}

export async function uploadImage(imageBytes: Buffer, filename = "image.png", mimeType = "image/png"): Promise<string> {
    const tokens = await cachedPageTokens();
    const push_id = tokens["push_id"] || "feeds/mcudyrk2a4khkz";
    const pctx = tokens["pctx"] || "CgcSBWjK7pYx";
    
    const { cookieStr, sapisid } = loadCookie();
    
    const startHeaders: Record<string, string> = {
        "Push-ID": push_id,
        "X-Tenant-Id": "bard-storage",
        "X-Client-Pctx": pctx,
        "X-Goog-Upload-Header-Content-Length": imageBytes.length.toString(),
        "X-Goog-Upload-Header-Content-Type": mimeType,
        "X-Goog-Upload-Protocol": "resumable",
        "X-Goog-Upload-Command": "start",
        "Content-Type": "application/x-www-form-urlencoded;charset=utf-8",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };
    if (cookieStr) startHeaders["Cookie"] = cookieStr;
    if (sapisid) startHeaders["Authorization"] = makeSapisidHash(sapisid);

    let fetchOptions: RequestInit = { 
        method: 'POST',
        headers: startHeaders,
        body: ""
    };
    if (CONFIG.proxy) {
        const { ProxyAgent } = require('undici');
        fetchOptions = { ...fetchOptions, dispatcher: new ProxyAgent(CONFIG.proxy) } as any;
    }

    const startUrl = "https://content-push.googleapis.com/upload/";
    const resp = await fetch(startUrl, fetchOptions);
    
    const uploadUrl = resp.headers.get("X-Goog-Upload-URL") || resp.headers.get("x-goog-upload-url");
    if (!uploadUrl) {
        throw new Error("No upload URL in response headers");
    }

    const uploadHeaders: Record<string, string> = {
        "X-Goog-Upload-Command": "upload, finalize",
        "X-Goog-Upload-Offset": "0",
        "Content-Type": "application/octet-stream",
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    };

    let fetchOptions2: RequestInit = {
        method: 'POST',
        headers: uploadHeaders,
        body: new Uint8Array(imageBytes)
    };
    if (CONFIG.proxy) {
        const { ProxyAgent } = require('undici');
        fetchOptions2 = { ...fetchOptions2, dispatcher: new ProxyAgent(CONFIG.proxy) } as any;
    }
    
    const resp2 = await fetch(uploadUrl, fetchOptions2);
    const fileRef = (await resp2.text()).trim();
    
    if (!fileRef || !fileRef.startsWith("/")) {
        throw new Error(`Invalid file reference: ${fileRef.substring(0, 100)}`);
    }
    return fileRef;
}

export async function fetchImageBytes(url: string): Promise<Buffer> {
    try {
        const parsed = new URL(url);
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            console.error(`Image fetch skipped for unsupported URL scheme: ${parsed.protocol}`);
            return Buffer.alloc(0);
        }
        
        let fetchOptions: RequestInit = {
            headers: { "User-Agent": "Mozilla/5.0" }
        };
        if (CONFIG.proxy) {
            const { ProxyAgent } = require('undici');
            fetchOptions = { ...fetchOptions, dispatcher: new ProxyAgent(CONFIG.proxy) } as any;
        }
        
        const resp = await fetch(url, fetchOptions);
        const arrayBuffer = await resp.arrayBuffer();
        return Buffer.from(arrayBuffer);
    } catch (e) {
        console.error("Image fetch failed:", e);
        return Buffer.alloc(0);
    }
}
