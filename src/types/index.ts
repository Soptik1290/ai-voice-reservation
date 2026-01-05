export interface Reservation {
    id: string;
    clientName: string;
    date: string;
    time?: string;
    notes?: string;
    provider: 'openai' | 'gemini' | 'openai-realtime';
    createdAt: string;
}

export type AIProvider = 'openai' | 'gemini' | 'openai-realtime';

export interface UsageMetrics {
    durationMs: number;
    tokensInput?: number;
    tokensOutput?: number;
    tokensTotal?: number;
    estimatedCostUsd?: number;
}

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
            audio: 100.00,  // per 1M audio tokens (input)
            audioOutput: 200.00, // per 1M audio tokens (output)
            text: 5.00,    // per 1M text tokens
        }
    },
    gemini: {
        flash: {
            input: 0.075,  // per 1M tokens
            output: 0.30,  // per 1M tokens
        }
    }
};
