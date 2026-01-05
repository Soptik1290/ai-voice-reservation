export interface Reservation {
    id: string;
    clientName: string;
    date: string;
    time?: string;
    notes?: string;
    provider: 'openai' | 'gemini';
    createdAt: string;
}

export type AIProvider = 'openai' | 'gemini';

export interface TranscriptionResult {
    text: string;
    reservation?: Partial<Reservation>;
}
