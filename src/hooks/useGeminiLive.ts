"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { TranscriptionResult, UsageMetrics, PRICING } from "@/types";

const RECORDER_WORKLET_CODE = `
class RecorderProcessor extends AudioWorkletProcessor {
  constructor() {
    super();
    this.bufferSize = 2048;
    this.int16Buffer = new Int16Array(this.bufferSize);
    this.bufferIndex = 0;
  }

  process(inputs, outputs, parameters) {
    const input = inputs[0];
    if (input && input.length > 0) {
      const channelData = input[0];
      for (let i = 0; i < channelData.length; i++) {
        let s = Math.max(-1, Math.min(1, channelData[i]));
        s = s < 0 ? s * 0x8000 : s * 0x7FFF;
        this.int16Buffer[this.bufferIndex++] = s;
        if (this.bufferIndex === this.bufferSize) {
          this.port.postMessage(this.int16Buffer.slice());
          this.bufferIndex = 0;
        }
      }
    }
    return true;
  }
}
registerProcessor('recorder-processor', RecorderProcessor);
`;

interface UseGeminiLiveProps {
    onTranscription: (result: TranscriptionResult) => void;
    model?: string;
}

export function useGeminiLive({ onTranscription, model }: UseGeminiLiveProps) {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState("");
    const [audioLevel, setAudioLevel] = useState(0);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<AudioWorkletNode | null>(null); // Correct type
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const tokensRef = useRef<{ input: number; output: number }>({ input: 0, output: 0 });
    const streamRef = useRef<MediaStream | null>(null);
    const isCompleteRef = useRef(false);
    const isRecordingRef = useRef(false);

    // Store partial reservation data
    const reservationRef = useRef<{
        clientName?: string;
        date?: string;
        time?: string;
    }>({});

    const updateAudioLevel = useCallback(() => {
        if (analyserRef.current && isRecordingRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            // Normalize slightly differently for hook usage if needed, but keeping same logic
            setAudioLevel(average / 255);
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
    }, []);

    const cleanup = useCallback((reason?: string) => {
        console.log(`Cleaning up Gemini Live resources... Reason: ${reason || "Unknown"}`);
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
            animationFrameRef.current = null;
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close().catch(console.error);
            audioContextRef.current = null;
        }
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
        }
        if (wsRef.current) {
            wsRef.current.close();
            wsRef.current = null;
        }
        setIsConnected(false);
        setIsRecording(false);
        isRecordingRef.current = false;
        setAudioLevel(0);
    }, []);

    // Cleanup on unmount
    useEffect(() => {
        return () => cleanup("Unmount");
    }, [cleanup]);

    const getApiKey = async () => {
        try {
            const response = await fetch("/api/gemini/key");
            if (response.ok) {
                const data = await response.json();
                return data.key;
            }
        } catch (e) {
            console.error("Error getting API key:", e);
        }
        return null;
    };

    const handleGeminiMessage = useCallback((data: any) => {
        if (data.setupComplete) {
            console.log("Gemini Live setup complete");
            return;
        }

        if (data.serverContent) {
            const parts = data.serverContent.modelTurn?.parts || [];
            for (const part of parts) {
                if (part.text) {
                    setLiveTranscript(prev => prev + part.text);
                    parseReservation(part.text);
                }
            }

            if (data.usageMetadata) {
                tokensRef.current.input += data.usageMetadata.promptTokenCount || 0;
                tokensRef.current.output += data.usageMetadata.candidatesTokenCount || 0;
            }
        }
    }, []); // Removed specific deps to avoid stale closure issues if refs are stable

    const parseReservation = useCallback((text: string) => {
        console.log("Parsing text:", text);

        // Name patterns
        const namePatterns = [
            /Jméno:\s*([\wěščřžýáíéúůďťňĚŠČŘŽÝÁÍÉÚŮĎŤŇ]+\s+[\wěščřžýáíéúůďťňĚŠČŘŽÝÁÍÉÚŮĎŤŇ]+)/i,
            /pro\s+([\wěščřžýáíéúůďťňĚŠČŘŽÝÁÍÉÚŮĎŤŇ]+\s+[\wěščřžýáíéúůďťňĚŠČŘŽÝÁÍÉÚŮĎŤŇ]+)/i,
            /klient[a]?:\s*([\wěščřžýáíéúůďťňĚŠČŘŽÝÁÍÉÚŮĎŤŇ]+\s+[\wěščřžýáíéúůďťňĚŠČŘŽÝÁÍÉÚŮĎŤŇ]+)/i,
        ];

        let clientName: string | undefined;
        for (const pattern of namePatterns) {
            const match = text.match(pattern);
            if (match) {
                clientName = match[1];
                reservationRef.current.clientName = clientName;
                console.log("Found name:", clientName);
                break;
            }
        }

        // Date patterns
        const datePatterns = [
            /Datum:\s*(\d{4}-\d{2}-\d{2})/i,
            /(\d{4}-\d{2}-\d{2})/,
            /(\d{1,2})\.\s*(\d{1,2})\.\s*(\d{4})?/,
            /(\d{1,2})\.\s*(ledna|února|března|dubna|května|června|července|srpna|září|října|listopadu|prosince)/i,
        ];

        let date = "";
        const monthNames: Record<string, string> = {
            'ledna': '01', 'února': '02', 'března': '03', 'dubna': '04',
            'května': '05', 'června': '06', 'července': '07', 'srpna': '08',
            'září': '09', 'října': '10', 'listopadu': '11', 'prosince': '12'
        };

        for (const pattern of datePatterns) {
            const match = text.match(pattern);
            if (match) {
                if (match[0].includes('-') && match[0].length === 10) {
                    date = match[1] || match[0];
                } else if (match[2] && monthNames[match[2].toLowerCase()]) {
                    const day = match[1].padStart(2, '0');
                    const month = monthNames[match[2].toLowerCase()];
                    const year = new Date().getFullYear();
                    date = `${year}-${month}-${day}`;
                } else if (match[1] && match[2]) {
                    const day = match[1].padStart(2, '0');
                    const month = match[2].padStart(2, '0');
                    const year = match[3] || new Date().getFullYear();
                    date = `${year}-${month}-${day}`;
                }
                if (date) {
                    reservationRef.current.date = date;
                    break;
                }
            }
        }

        // Time pattern
        const timeMatch = text.match(/(?:Čas:|v|ve)\s*(\d{1,2})[:\.](\d{2})|(\d{1,2})[:\.](\d{2})\s*(?:hodin)?/i);
        let time: string | undefined;
        if (timeMatch) {
            const hours = (timeMatch[1] || timeMatch[3]).padStart(2, '0');
            const minutes = timeMatch[2] || timeMatch[4];
            time = `${hours}:${minutes}`;
            reservationRef.current.time = time;
        }

        // Check completion
        const currentData = reservationRef.current;
        if (currentData.clientName && currentData.date && !isCompleteRef.current) {
            console.log("Reservation complete, disconnecting...");
            isCompleteRef.current = true;
            finishSession(liveTranscript || text, currentData);
        }
    }, [liveTranscript]); // Dependencies

    const finishSession = (finalText: string, reservationData: any) => {
        const endTime = performance.now();
        const metrics: UsageMetrics = {
            durationMs: Math.round(endTime - startTimeRef.current),
            tokensInput: tokensRef.current.input,
            tokensOutput: tokensRef.current.output,
            tokensTotal: tokensRef.current.input + tokensRef.current.output,
            estimatedCostUsd:
                (tokensRef.current.input / 1_000_000) * PRICING.gemini.live.audioInput +
                (tokensRef.current.output / 1_000_000) * PRICING.gemini.live.textOutput,
        };

        onTranscription({
            text: finalText,
            reservation: {
                clientName: reservationData.clientName,
                date: reservationData.date,
                time: reservationData.time,
            },
            metrics,
        });

        cleanup("Session Finished");
    };

    const stopAndProcess = () => {
        // Force process with whatever we have
        finishSession(liveTranscript, reservationRef.current);
    };

    const connect = async () => {
        // Reset state
        isCompleteRef.current = false;
        setIsProcessing(true);
        startTimeRef.current = performance.now();
        tokensRef.current = { input: 0, output: 0 };
        setLiveTranscript("");
        reservationRef.current = {};

        try {
            const apiKey = await getApiKey();
            if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not configured");

            console.log("Initializing audio...");
            const audioStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });
            streamRef.current = audioStream;

            if (!audioContextRef.current) {
                audioContextRef.current = new AudioContext({ sampleRate: 16000 });
            } else if (audioContextRef.current.state === "suspended") {
                await audioContextRef.current.resume();
            }

            // Load Worklet
            const blob = new Blob([RECORDER_WORKLET_CODE], { type: "application/javascript" });
            const workletUrl = URL.createObjectURL(blob);
            await audioContextRef.current.audioWorklet.addModule(workletUrl);
            URL.revokeObjectURL(workletUrl);

            const source = audioContextRef.current.createMediaStreamSource(audioStream);
            const processor = new AudioWorkletNode(audioContextRef.current, "recorder-processor");
            processorRef.current = processor;

            source.connect(processor);
            processor.connect(audioContextRef.current.destination);

            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            source.connect(analyserRef.current);

            // WebSocket
            const modelToUse = model || "gemini-2.0-flash-exp";
            // Use v1alpha for native audio preview model, v1beta otherwise
            const apiVersion = modelToUse.includes("native-audio-preview") ? "v1alpha" : "v1beta";
            const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.${apiVersion}.GenerativeService.BidiGenerateContent?key=${apiKey}`;
            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            processor.port.onmessage = (event) => {
                if (ws.readyState === WebSocket.OPEN && !isCompleteRef.current) {
                    const int16Data = event.data;
                    const base64 = btoa(String.fromCharCode(...new Uint8Array(int16Data.buffer)));
                    ws.send(JSON.stringify({
                        realtimeInput: {
                            mediaChunks: [{
                                mimeType: "audio/pcm;rate=16000",
                                data: base64
                            }]
                        }
                    }));
                }
            };

            ws.onopen = () => {
                setIsConnected(true);
                console.log("WebSocket connected. Starting.");
                ws.send(JSON.stringify({
                    setup: {
                        model: `models/${modelToUse}`,
                        generationConfig: {
                            responseModalities: ["AUDIO"],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: { voiceName: "Aoede" }
                                }
                            }
                        },
                        systemInstruction: {
                            parts: [{
                                text: `Jsi asistent pro vytváření rezervací v českém jazyce. 
Tvým úkolem je:
1. Přepsat co uživatel říká v češtině
2. Extrahovat data rezervace: jméno klienta, datum, čas, poznámky

DŮLEŽITÉ: Audio je v ČESKÉM jazyce (čeština, Czech language, NOT Polish).
Česká jména: Novák, Svoboda, Dvořák, Černý, Procházka.
Dny: pondělí, úterý, středa, čtvrtek, pátek, sobota, neděle.

Odpovídej stručně. Když máš všechna data, řekni:
"Rezervace pro [jméno] na [datum] v [čas]"

Dnešní datum je ${new Date().toISOString().split("T")[0]}.`
                            }]
                        }
                    }
                }));
            };

            ws.onmessage = async (event) => {
                if (isCompleteRef.current) return;
                try {
                    let data;
                    if (event.data instanceof Blob) {
                        const text = await event.data.text();
                        data = JSON.parse(text);
                    } else {
                        data = JSON.parse(event.data);
                    }
                    handleGeminiMessage(data);
                } catch (e) {
                    console.error("Error parsing message:", e);
                }
            };

            ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                setIsProcessing(false);
                cleanup("WebSocket Error");
            };

            ws.onclose = (event) => {
                console.log(`WebSocket closed. Code: ${event.code}, Reason: ${event.reason}`);
                // If closed unexpectedly, cleanup
                if (isRecordingRef.current) {
                    cleanup(`WebSocket Close (${event.code})`);
                }
            };

            setIsRecording(true);
            isRecordingRef.current = true;
            setIsProcessing(false);
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

        } catch (error) {
            console.error("Connection failed:", error);
            setIsProcessing(false);
            alert("Connection failed. Check console.");
            cleanup("Connection Failed Catch Block");
        }
    };

    return {
        connect,
        disconnect: () => cleanup("Manual Disconnect"), // Expose cleanup as disconnect
        stopAndProcess, // Expose manual stop
        isConnected,
        isRecording,
        isProcessing,
        liveTranscript,
        audioLevel
    };
}
