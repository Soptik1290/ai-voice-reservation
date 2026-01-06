export interface UsageMetrics {
    durationMs: number;
    tokensInput?: number;
    tokensOutput?: number;
    tokensTotal?: number;
    estimatedCostUsd?: number;
}

export interface Reservation {
    id: string;
    clientName: string;
    date: string;
    time?: string;
    notes?: string;
    provider: 'openai' | 'gemini' | 'openai-realtime' | 'gemini-live';
    createdAt: string;
    metrics?: UsageMetrics;
}

export type AIProvider = 'openai' | 'gemini' | 'openai-realtime' | 'gemini-live';

// LLM Model types
export type OpenAIModel = 'gpt-4o-mini' | 'gpt-5-mini';
export type GeminiModel = 'gemini-2.0-flash' | 'gemini-2.5-flash';

export interface ModelInfo {
    id: string;
    name: string;
    inputPrice: number;  // per 1M tokens
    outputPrice: number; // per 1M tokens
}

export const OPENAI_MODELS: Record<OpenAIModel, ModelInfo> = {
    'gpt-4o-mini': {
        id: 'gpt-4o-mini',
        name: 'GPT-4o Mini',
        inputPrice: 0.15,
        outputPrice: 0.60
    },
    'gpt-5-mini': {
        id: 'gpt-5-mini',
        name: 'GPT-5 Mini',
        inputPrice: 0.25,
        outputPrice: 2.00
    }
};

export const GEMINI_MODELS: Record<GeminiModel, ModelInfo> = {
    'gemini-2.0-flash': {
        id: 'gemini-2.0-flash',
        name: 'Gemini 2.0 Flash',
        inputPrice: 0.075,
        outputPrice: 0.30
    },
    'gemini-2.5-flash': {
        id: 'gemini-2.5-flash',
        name: 'Gemini 2.5 Flash',
        inputPrice: 0.15,
        outputPrice: 0.60
    }
};

export interface TranscriptionResult {
    text: string;
    reservation?: Partial<Reservation>;
    metrics?: UsageMetrics;
}

// Pricing per 1M tokens (as of 2026)
export const PRICING = {
    openai: {
        whisper: 0.006, // per minute
        gpt4oMini: {
            input: 0.15,   // per 1M tokens
            output: 0.60,  // per 1M tokens
        },
        realtime: {
            audioInputPerMinute: 0.06,  // per minute of audio input
            audioOutputPerMinute: 0.24, // per minute of audio output
            text: 5.00,    // per 1M text tokens (for text responses)
        }
    },
    gemini: {
        flash: {
            input: 0.075,  // per 1M tokens
            output: 0.30,  // per 1M tokens
        },
        live: {
            audioInput: 0.70,   // per 1M audio tokens
            audioOutput: 2.80,  // per 1M audio tokens
            textInput: 0.15,    // per 1M text tokens
            textOutput: 0.60,   // per 1M text tokens
        }
    }
};

