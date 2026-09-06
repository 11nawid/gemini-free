import { Buffer } from 'buffer';
import { ImageItem, ToolCallResult, GoogleFunctionCall } from './types';

const MAX_IMAGE_B64_SIZE = 50000;

export function _buildToolChoiceInstruction(toolChoice: any, toolDefs: any[]): string {
    if (toolChoice === "none") return "\n\nIMPORTANT: Do NOT call any tools. Respond with text only.";
    if (toolChoice === "required") return "\n\nIMPORTANT: You MUST call at least one tool. Do not respond with text only.";
    if (typeof toolChoice === 'object' && toolChoice !== null) {
        const fnName = toolChoice.function?.name || "";
        if (fnName) return `\n\nIMPORTANT: You MUST call the tool "${fnName}". Do not call other tools.`;
    }
    return "";
}

export function _decodeDataUrl(url: string): [Buffer, string] | null {
    const match = url.match(/^data:([^;,]+)?(;base64)?,(.*)$/);
    if (!match) return null;
    const mime = match[1] || "image/png";
    const isBase64 = !!match[2];
    const data = match[3];
    
    try {
        if (isBase64) {
            return [Buffer.from(data, 'base64'), mime];
        } else {
            return [Buffer.from(decodeURIComponent(data)), mime];
        }
    } catch {
        return null;
    }
}

export function _imageFromUrl(url: string, mime?: string): ImageItem | null {
    if (typeof url !== 'string' || !url) return null;
    if (url.startsWith("data:")) return _decodeDataUrl(url);
    return [url, mime || "image/png"];
}

export function _imageFromPart(part: any): ImageItem | null {
    const partType = part.type;
    if (partType === "image_url") {
        const imageUrl = part.image_url;
        if (typeof imageUrl === 'object' && imageUrl !== null) {
            return _imageFromUrl(imageUrl.url, imageUrl.mime_type);
        }
        return _imageFromUrl(imageUrl);
    }
    if (partType === "input_image" || partType === "image") {
        const imageUrl = part.image_url || part.url;
        if (typeof imageUrl === 'object' && imageUrl !== null) {
            return _imageFromUrl(imageUrl.url, imageUrl.mime_type);
        }
        if (imageUrl) {
            return _imageFromUrl(imageUrl, part.mime_type);
        }
        const imageData = part.data || part.base64;
        if (typeof imageData === 'string') {
            const mime = part.mime_type || part.media_type || "image/png";
            if (imageData.startsWith("data:")) return _decodeDataUrl(imageData);
            try {
                return [Buffer.from(imageData, 'base64'), mime];
            } catch {
                return null;
            }
        }
    }
    return null;
}

export function messagesToPrompt(messages: any[], tools?: any[], toolChoice?: any): [string, ImageItem[]] {
    const parts: string[] = [];
    const images: ImageItem[] = [];

    if (tools && tools.length > 0 && toolChoice !== "none") {
        const toolDefs = tools.map(tool => {
            const fn = tool.type === "function" ? (tool.function || tool) : tool;
            return {
                name: fn.name || tool.name || "",
                description: fn.description || tool.description || "",
                parameters: fn.parameters || tool.parameters || {},
            };
        });
        
        if (toolDefs.length > 0) {
            const constraint = _buildToolChoiceInstruction(toolChoice, toolDefs);
            parts.push(
                "# Tool Use\n\n" +
                "You can call the following tools. Call format:\n" +
                '```tool_call\n{"name": "func_name", "arguments": {...}}\n```\n' +
                "When calling tools, output ONLY the tool_call block(s).\n\n" +
                `Available tools:\n${JSON.stringify(toolDefs, null, 2)}` +
                constraint
            );
        }
    }

    const systemInstructions: string[] = [];
    const conversationParts: string[] = [];

    for (const msg of messages) {
        const role = msg.role || "user";
        let content = msg.content || "";

        if (Array.isArray(content)) {
            const textParts: string[] = [];
            for (const c of content) {
                if (c.type === "text" || c.type === "input_text") {
                    textParts.push(c.text || "");
                } else {
                    const image = _imageFromPart(c);
                    if (image) {
                        images.push(image);
                        textParts.push("[Image attached]");
                    }
                }
            }
            content = textParts.join(" ");
        }

        if (role === "system") {
            systemInstructions.push(content);
        } else if (role === "assistant") {
            if (msg.tool_calls && msg.tool_calls.length > 0) {
                const tcStrs = msg.tool_calls.map((tc: any) => {
                    const fn = tc.function || {};
                    return `\`\`\`tool_call\n{"name": "${fn.name}", "arguments": ${fn.arguments || "{}"}}\n\`\`\``;
                });
                conversationParts.push(`[Assistant]: ${content || ""}\n${tcStrs.join("\n")}`);
            } else {
                conversationParts.push(`[Assistant]: ${content}`);
            }
        } else if (role === "tool") {
            conversationParts.push(`[Tool result for ${msg.name || ""}]: ${content}`);
        } else {
            conversationParts.push(content ? String(content) : "");
        }
    }

    if (systemInstructions.length > 0) {
        const fullSystem = systemInstructions.join("\n\n");
        parts.push(`[System Directives]:\n${fullSystem}`);
        parts.push(...conversationParts);
    } else {
        parts.push(...conversationParts);
    }

    return [parts.filter(Boolean).join("\n\n"), images];
}

export function parseToolCalls(text: string): [string, ToolCallResult[]] {
    const toolCalls: ToolCallResult[] = [];
    const pattern = /```tool_call\s*\n([\s\S]*?)\n```/g;
    
    let cleanParts: string[] = [];
    let lastEnd = 0;
    
    let match;
    while ((match = pattern.exec(text)) !== null) {
        cleanParts.push(text.substring(lastEnd, match.index));
        lastEnd = pattern.lastIndex;
        try {
            const data = JSON.parse(match[1].trim());
            toolCalls.push({
                id: `call_${Math.random().toString(36).substring(2, 10)}`,
                type: "function",
                function: {
                    name: data.name,
                    arguments: typeof data.arguments === 'string' ? data.arguments : JSON.stringify(data.arguments || {})
                }
            });
        } catch {
            // ignore JSON parse error
        }
    }
    
    cleanParts.push(text.substring(lastEnd));
    return [cleanParts.join("").trim(), toolCalls];
}

export function buildToolPrompt(toolDefs: any[]): string {
    const toolSpec = JSON.stringify(toolDefs, null, 2);
    return (
        "# Tool Use\n\n" +
        "You can call the following tools to help accomplish tasks. " +
        "These tools connect to the user's local environment and will execute when called.\n\n" +
        "Call format (use this exact format):\n" +
        "```function_call\n" +
        '{"name": "<tool_name>", "args": {<arguments>}}\n' +
        "```\n\n" +
        "When calling tools:\n" +
        "- Output ONLY the function_call block(s), nothing else\n" +
        "- You may call multiple tools with multiple blocks\n" +
        "- After receiving a [Tool result for ...], use that data to answer the user\n\n" +
        `Available tools:\n${toolSpec}`
    );
}

function _googleToolChoiceInstruction(req: any): string {
    const mode = req?.toolConfig?.functionCallingConfig?.mode || "AUTO";
    const allowed = req?.toolConfig?.functionCallingConfig?.allowedFunctionNames || [];
    
    if (mode === "NONE") return "\n\nIMPORTANT: Do NOT call any tools. Respond with text only.";
    if (mode === "ANY") {
        if (allowed.length > 0) {
            const names = allowed.map((n: string) => `"${n}"`).join(", ");
            return `\n\nIMPORTANT: You MUST call one of these tools: ${names}. Do not respond with text only.`;
        }
        return "\n\nIMPORTANT: You MUST call at least one tool. Do not respond with text only.";
    }
    return "";
}

export function googleContentsToPrompt(req: any): [string, ImageItem[]] {
    const parts: string[] = [];
    const images: ImageItem[] = [];
    
    const fcMode = req?.toolConfig?.functionCallingConfig?.mode || "AUTO";
    const tools = req?.tools || [];
    const toolDefs: any[] = [];
    
    if (tools.length > 0 && fcMode !== "NONE") {
        for (const toolGroup of tools) {
            for (const fn of toolGroup.functionDeclarations || []) {
                const td: any = { name: fn.name || "", description: fn.description || "" };
                const params = fn.parameters || fn.parametersJsonSchema;
                if (params) td.parameters = params;
                toolDefs.push(td);
            }
        }
    }

    const sysInst = req?.systemInstruction;
    if (sysInst) {
        const sysParts = sysInst.parts || [];
        const sysText = sysParts.map((p: any) => p.text || "").filter(Boolean).join(" ");
        if (sysText) {
            if (toolDefs.length > 0) {
                const constraint = _googleToolChoiceInstruction(req);
                parts.push(sysText + "\n\n" + buildToolPrompt(toolDefs) + constraint);
            } else {
                parts.push(sysText);
            }
        }
    } else if (toolDefs.length > 0) {
        const constraint = _googleToolChoiceInstruction(req);
        parts.push(buildToolPrompt(toolDefs) + constraint);
    }

    const contents = req?.contents || [];
    for (const content of contents) {
        const role = content.role || "user";
        const msgParts: string[] = [];
        for (const p of content.parts || []) {
            if (p.text) {
                msgParts.push(p.text);
            } else if (p.inlineData) {
                try {
                    images.push([
                        Buffer.from(p.inlineData.data, 'base64'),
                        p.inlineData.mimeType || "image/png"
                    ]);
                    msgParts.push("[Image attached]");
                } catch {
                    // ignore
                }
            } else if (p.functionCall) {
                const fc = p.functionCall;
                msgParts.push(`\`\`\`function_call\n${JSON.stringify({name: fc.name, args: fc.args || {}})}\n\`\`\``);
            } else if (p.functionResponse) {
                const fr = p.functionResponse;
                msgParts.push(`[Tool result for ${fr.name || ""}]: ${JSON.stringify(fr.response || {})}`);
            }
        }
        
        const text = msgParts.join("\n");
        if (role === "model") {
            parts.push(`[Assistant]: ${text}`);
        } else {
            parts.push(text);
        }
    }

    return [parts.filter(Boolean).join("\n\n"), images];
}

export function parseGoogleFunctionCalls(text: string): [string, GoogleFunctionCall[]] {
    const functionCalls: GoogleFunctionCall[] = [];
    
    // Pattern 1: ```function_call\n{...}\n```
    const pattern1 = /```function_call\s*\n([\s\S]*?)\n```/g;
    // Pattern 2: function_call\n{...}
    const pattern2 = /(?:^|\n)function_call\s*\n(\{[^`]*?\})/g;
    
    let clean = text;
    for (const pattern of [pattern1, pattern2]) {
        let match;
        const matches: string[] = [];
        while ((match = pattern.exec(clean)) !== null) {
            matches.push(match[1]);
        }
        for (const m of matches) {
            try {
                const data = JSON.parse(m.trim());
                if (data.name) {
                    functionCalls.push({
                        name: data.name,
                        args: data.args || data.arguments || {}
                    });
                }
            } catch {
                // ignore
            }
        }
        clean = clean.replace(pattern, '').trim();
    }
    
    if (functionCalls.length === 0 && clean.trim().startsWith("{")) {
        try {
            const data = JSON.parse(clean.trim());
            if (data.name && (data.args || data.arguments)) {
                functionCalls.push({
                    name: data.name,
                    args: data.args || data.arguments || {}
                });
                clean = "";
            }
        } catch {
            // ignore
        }
    }
    
    return [clean, functionCalls];
}
