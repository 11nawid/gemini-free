import { ModelConfig, ResolvedModel } from './types';

export const MODELS: Record<string, ModelConfig> = {
    "gemini-3.7-flash": {
        mode: 1, think: 4,
        desc: "Latest all-around model (Gemini 3.7 Flash)",
    },
    "gemini-3.6-flash": {
        mode: 1, think: 4,
        desc: "All-around model (Gemini 3.6 Flash)",
    },
    "gemini-3.5-flash": {
        mode: 1, think: 4,
        desc: "Alias for gemini-3.6-flash (backend upgraded)",
    },
    "gemini-3.5-flash-thinking": {
        mode: 2, think: 0,
        desc: "Deep thinking mode, longest output (~20k chars)",
    },
    "gemini-3.1-pro": {
        mode: 3, think: 4,
        desc: "Pro model (requires cookie for real routing)",
    },
    "gemini-3.1-pro-enhanced": {
        mode: 3, think: 4, extra: {31: 2, 80: 3},
        desc: "Pro with enhanced output (experimental)",
    },
    "gemini-auto": {
        mode: 4, think: 4,
        desc: "Auto model selection",
    },
    "gemini-3.5-flash-thinking-lite": {
        mode: 5, think: 0,
        desc: "Dynamic thinking with adaptive depth",
    },
    "gemini-flash-lite": {
        mode: 6, think: 4,
        desc: "Lightweight fast model",
    },
};

export function resolveModel(modelName: string, defaultModel = "gemini-3.6-flash"): ResolvedModel {
    let thinkOverride: number | null = null;
    let actualName = modelName;
    
    if (modelName.includes("@think=")) {
        const parts = modelName.split("@think=");
        actualName = parts[0];
        const thinkStr = parts[1];
        thinkOverride = parseInt(thinkStr, 10);
        if (isNaN(thinkOverride)) {
            return {
                name: actualName,
                modeId: 0,
                thinkMode: 0,
                error: `Invalid think level: ${thinkStr}`,
                extraFields: null
            };
        }
    }
    
    let cfg = MODELS[actualName];
    if (!cfg) {
        let logFunc = (msg: string) => console.log(msg);
        try {
            const gemini = require('./gemini');
            if (gemini.log) logFunc = gemini.log;
        } catch(e) {
            // Ignore missing module if it doesn't exist yet
        }
        logFunc(`Unknown model '${actualName}', falling back to '${defaultModel}'`);
        actualName = defaultModel;
        cfg = MODELS[defaultModel];
    }
    
    const modeId = cfg.mode;
    const thinkMode = thinkOverride !== null ? thinkOverride : cfg.think;
    const extraFields = cfg.extra || null;
    
    return {
        name: actualName,
        modeId,
        thinkMode,
        error: null,
        extraFields
    };
}
