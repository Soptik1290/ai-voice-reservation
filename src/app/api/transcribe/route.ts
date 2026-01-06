import { NextRequest, NextResponse } from "next/server";
import { UsageMetrics, PRICING } from "@/types";

// System prompt for reservation extraction
const SYSTEM_PROMPT = `Jsi asistent pro extrakci dat rezervací z hlasových příkazů.
Analyzuj text a extrahuj následující informace:
- clientName: Jméno klienta (např. "Jan Novák", "Marie Svobodová")
- date: Datum rezervace ve formátu YYYY-MM-DD
- time: Čas rezervace ve formátu HH:MM (pokud je zmíněn)
- notes: Další poznámky nebo detaily

Odpověz POUZE validním JSON objektem bez dalšího textu.
Příklad odpovědi: {"clientName": "Jan Novák", "date": "2026-01-20", "time": "14:00", "notes": ""}

Pokud je zmíněn den v týdnu (pondělí, úterý, atd.), převeď ho na konkrétní datum.
Dnešní datum je ${new Date().toISOString().split("T")[0]}.`;

interface ProcessResult {
    transcription: string;
    reservation: any;
    metrics: UsageMetrics;
}

export async function POST(request: NextRequest) {
    try {
        const startTime = performance.now();

        const formData = await request.formData();
        const audioFile = formData.get("audio") as Blob;
        const provider = formData.get("provider") as string;
        const model = formData.get("model") as string || (provider === "openai" ? "gpt-4o-mini" : "gemini-2.0-flash");

        if (!audioFile) {
            return NextResponse.json({ error: "No audio file provided" }, { status: 400 });
        }

        // Convert blob to buffer for API
        const arrayBuffer = await audioFile.arrayBuffer();
        const buffer = Buffer.from(arrayBuffer);

        let result: ProcessResult;

        if (provider === "openai") {
            result = await processWithOpenAI(buffer, model);
        } else {
            result = await processWithGemini(buffer, model);
        }

        const endTime = performance.now();
        result.metrics.durationMs = Math.round(endTime - startTime);

        return NextResponse.json({
            text: result.transcription,
            reservation: result.reservation,
            metrics: result.metrics,
        });
    } catch (error) {
        console.error("Error processing audio:", error);
        return NextResponse.json(
            { error: "Failed to process audio" },
            { status: 500 }
        );
    }
}

async function processWithOpenAI(audioBuffer: Buffer, model: string): Promise<ProcessResult> {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        throw new Error("OPENAI_API_KEY not configured");
    }

    let totalInputTokens = 0;
    let totalOutputTokens = 0;
    const audioDurationMinutes = audioBuffer.length / (16000 * 2 * 60); // Rough estimate

    // Step 1: Transcribe audio using Whisper
    const formData = new FormData();
    formData.append("file", new Blob([new Uint8Array(audioBuffer)], { type: "audio/webm" }), "audio.webm");
    formData.append("model", "whisper-1");
    formData.append("language", "cs");
    formData.append("prompt", "Toto je nahrávka v českém jazyce. Rezervace, termín, klient, pondělí, úterý, středa, čtvrtek, pátek, sobota, neděle, leden, únor, březen, duben, květen, červen, červenec, srpen, září, říjen, listopad, prosinec.");

    const transcribeResponse = await fetch("https://api.openai.com/v1/audio/transcriptions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
        },
        body: formData,
    });

    if (!transcribeResponse.ok) {
        const error = await transcribeResponse.text();
        throw new Error(`OpenAI transcription failed: ${error}`);
    }

    const transcribeResult = await transcribeResponse.json();
    const transcription = transcribeResult.text;

    // Step 2: Extract reservation data using selected model
    console.log(`Using OpenAI model: ${model}`);
    const extractResponse = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json",
        },
        body: JSON.stringify({
            model: model, // Use dynamic model
            messages: [
                { role: "system", content: SYSTEM_PROMPT },
                { role: "user", content: transcription },
            ],
            temperature: 0.1,
        }),
    });

    if (!extractResponse.ok) {
        const error = await extractResponse.text();
        throw new Error(`OpenAI extraction failed: ${error}`);
    }

    const extractResult = await extractResponse.json();
    const reservationText = extractResult.choices[0].message.content;

    // Get token usage from GPT response
    if (extractResult.usage) {
        totalInputTokens = extractResult.usage.prompt_tokens || 0;
        totalOutputTokens = extractResult.usage.completion_tokens || 0;
    }

    let reservation = null;
    try {
        reservation = JSON.parse(reservationText);
    } catch {
        console.error("Failed to parse reservation JSON:", reservationText);
    }

    // Calculate cost
    const whisperCost = audioDurationMinutes * PRICING.openai.whisper;
    const gptInputCost = (totalInputTokens / 1_000_000) * PRICING.openai.gpt4oMini.input;
    const gptOutputCost = (totalOutputTokens / 1_000_000) * PRICING.openai.gpt4oMini.output;
    const totalCost = whisperCost + gptInputCost + gptOutputCost;

    return {
        transcription,
        reservation,
        metrics: {
            durationMs: 0, // Will be set by caller
            tokensInput: totalInputTokens,
            tokensOutput: totalOutputTokens,
            tokensTotal: totalInputTokens + totalOutputTokens,
            estimatedCostUsd: totalCost,
        },
    };
}

async function processWithGemini(audioBuffer: Buffer, model: string): Promise<ProcessResult> {
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
        throw new Error("GOOGLE_AI_API_KEY not configured");
    }

    // Convert audio to base64
    const base64Audio = audioBuffer.toString("base64");

    // Use selected Gemini model for audio understanding and text extraction
    console.log(`Using Gemini model: ${model}`);
    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                contents: [
                    {
                        parts: [
                            {
                                inlineData: {
                                    mimeType: "audio/webm",
                                    data: base64Audio,
                                },
                            },
                            {
                                text: `DŮLEŽITÉ: Toto audio je v ČESKÉM jazyce (čeština, Czech language, NOT Polish). 
Přepiš audio do textu v češtině. Pak z přepsaného textu extrahuj data rezervace.

Česká slova která mohou zaznít: rezervace, termín, pondělí, úterý, středa, čtvrtek, pátek, sobota, neděle.
Česká jména: Novák, Svoboda, Dvořák, Černý, Procházka, Kučera, Veselý, Horák, Němec, Pokorný.

${SYSTEM_PROMPT}

Odpověz ve formátu:
TRANSCRIPTION: [přepsaný text v češtině]
RESERVATION: [JSON objekt s daty rezervace]`,
                            },
                        ],
                    },
                ],
                generationConfig: {
                    temperature: 0.1,
                },
            }),
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Gemini API failed: ${error}`);
    }

    const result = await response.json();
    const content = result.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Get token usage from Gemini response
    const usageMetadata = result.usageMetadata || {};
    const tokensInput = usageMetadata.promptTokenCount || 0;
    const tokensOutput = usageMetadata.candidatesTokenCount || 0;

    // Parse the response
    let transcription = "";
    let reservation = null;

    const transcriptionMatch = content.match(/TRANSCRIPTION:\s*([\s\S]+?)(?=RESERVATION:|$)/);
    if (transcriptionMatch) {
        transcription = transcriptionMatch[1].trim();
    }

    const reservationMatch = content.match(/RESERVATION:\s*(\{[\s\S]*?\})/);
    if (reservationMatch) {
        try {
            reservation = JSON.parse(reservationMatch[1]);
        } catch {
            console.error("Failed to parse Gemini reservation JSON:", reservationMatch[1]);
        }
    }

    // Calculate cost
    const inputCost = (tokensInput / 1_000_000) * PRICING.gemini.flash.input;
    const outputCost = (tokensOutput / 1_000_000) * PRICING.gemini.flash.output;
    const totalCost = inputCost + outputCost;

    return {
        transcription,
        reservation,
        metrics: {
            durationMs: 0, // Will be set by caller
            tokensInput,
            tokensOutput,
            tokensTotal: tokensInput + tokensOutput,
            estimatedCostUsd: totalCost,
        },
    };
}
