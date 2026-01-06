"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TranscriptionResult, UsageMetrics, PRICING } from "@/types";
import { Mic, Square, Loader2, Radio } from "lucide-react";
import { cn } from "@/lib/utils";

interface GeminiLiveRecorderProps {
    onTranscription: (result: TranscriptionResult) => void;
    isProcessing: boolean;
    setIsProcessing: (value: boolean) => void;
}

export function GeminiLiveRecorder({
    onTranscription,
    isProcessing,
    setIsProcessing
}: GeminiLiveRecorderProps) {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState("");
    const [audioLevel, setAudioLevel] = useState(0);

    const wsRef = useRef<WebSocket | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const processorRef = useRef<ScriptProcessorNode | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const tokensRef = useRef<{ input: number; output: number }>({ input: 0, output: 0 });
    const streamRef = useRef<MediaStream | null>(null);
    const isCompleteRef = useRef(false);

    const updateAudioLevel = useCallback(() => {
        if (analyserRef.current && isRecording) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setAudioLevel(average / 255);
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
    }, [isRecording]);

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            disconnect();
        };
    }, []);

    const connect = async () => {
        isCompleteRef.current = false;
        setIsProcessing(true);
        startTimeRef.current = performance.now();
        tokensRef.current = { input: 0, output: 0 };
        setLiveTranscript("");

        try {
            const apiKey = await getApiKey();
            if (!apiKey) {
                throw new Error("GOOGLE_AI_API_KEY not configured");
            }

            // Connect to Gemini Live WebSocket
            const model = "gemini-2.0-flash-exp";
            const wsUrl = `wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent?key=${apiKey}`;

            const ws = new WebSocket(wsUrl);
            wsRef.current = ws;

            ws.onopen = async () => {
                setIsConnected(true);

                // Send setup message
                ws.send(JSON.stringify({
                    setup: {
                        model: `models/${model}`,
                        generationConfig: {
                            responseModalities: ["TEXT"],
                            speechConfig: {
                                voiceConfig: {
                                    prebuiltVoiceConfig: {
                                        voiceName: "Aoede"
                                    }
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

                // Start microphone after setup
                await startMicrophone(ws);
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
                    console.error("Error parsing Gemini message:", e);
                }
            };

            ws.onerror = (error) => {
                console.error("WebSocket error:", error);
                setIsProcessing(false);
                disconnect();
            };

            ws.onclose = () => {
                setIsConnected(false);
                setIsRecording(false);
            };

        } catch (error) {
            console.error("Error connecting to Gemini Live API:", error);
            setIsProcessing(false);
            alert("Nepodařilo se připojit k Gemini Live API. Zkontrolujte API klíč.");
            disconnect();
        }
    };

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

    const startMicrophone = async (ws: WebSocket) => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 16000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });
            streamRef.current = stream;

            audioContextRef.current = new AudioContext({ sampleRate: 16000 });
            const source = audioContextRef.current.createMediaStreamSource(stream);

            // Analyser for visualization
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            source.connect(analyserRef.current);

            // Processor to get PCM data
            processorRef.current = audioContextRef.current.createScriptProcessor(4096, 1, 1);
            source.connect(processorRef.current);
            processorRef.current.connect(audioContextRef.current.destination);

            processorRef.current.onaudioprocess = (e) => {
                if (ws.readyState === WebSocket.OPEN && !isCompleteRef.current) {
                    const inputData = e.inputBuffer.getChannelData(0);
                    // Convert float32 to int16
                    const int16Data = new Int16Array(inputData.length);
                    for (let i = 0; i < inputData.length; i++) {
                        int16Data[i] = Math.max(-32768, Math.min(32767, inputData[i] * 32768));
                    }
                    // Send as base64
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

            setIsRecording(true);
            setIsProcessing(false);
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        } catch (error) {
            console.error("Error starting microphone:", error);
            throw error;
        }
    };

    const handleGeminiMessage = (data: any) => {
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

            // Track usage
            if (data.usageMetadata) {
                tokensRef.current.input += data.usageMetadata.promptTokenCount || 0;
                tokensRef.current.output += data.usageMetadata.candidatesTokenCount || 0;
            }
        }
    };

    const parseReservation = (text: string) => {
        console.log("Parsing text:", text);

        // Try multiple name patterns - use more inclusive regex for Czech names
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
                console.log("Found name:", clientName);
                break;
            }
        }

        // Try multiple date patterns
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
                if (date) break;
            }
        }

        const timeMatch = text.match(/(?:Čas:|v|ve)\s*(\d{1,2})[:\.](\d{2})|(\d{1,2})[:\.](\d{2})\s*(?:hodin)?/i);
        let time: string | undefined;
        if (timeMatch) {
            const hours = (timeMatch[1] || timeMatch[3]).padStart(2, '0');
            const minutes = timeMatch[2] || timeMatch[4];
            time = `${hours}:${minutes}`;
        }

        // Only trigger when we have BOTH name AND date (complete reservation)
        if (clientName && date && !isCompleteRef.current) {
            console.log("Reservation complete, disconnecting...");
            isCompleteRef.current = true;

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
                text: liveTranscript || text,
                reservation: {
                    clientName,
                    date: date || undefined,
                    time,
                },
                metrics,
            });

            disconnect();
        }
    };

    const disconnect = () => {
        console.log("Disconnecting Gemini Live...");
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (processorRef.current) {
            processorRef.current.disconnect();
            processorRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
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
        setAudioLevel(0);
    };

    const stopAndProcess = () => {
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

        if (liveTranscript) {
            onTranscription({
                text: liveTranscript,
                metrics,
            });
        }
        disconnect();
    };

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Live Transcript */}
            {liveTranscript && (
                <div className="w-full max-w-md p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30">
                    <div className="flex items-center gap-2 mb-2">
                        <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
                        <span className="text-xs text-cyan-400 font-medium">Gemini Live</span>
                    </div>
                    <p className="text-sm text-foreground italic">&ldquo;{liveTranscript}&rdquo;</p>
                </div>
            )}

            {/* Gemini Live Button */}
            <div className="relative">
                {isRecording && (
                    <>
                        <div
                            className="absolute inset-0 rounded-full bg-cyan-500/20 animate-ping"
                            style={{ animationDuration: "1.5s" }}
                        />
                        <div
                            className="absolute inset-0 rounded-full bg-cyan-500/10"
                            style={{
                                transform: `scale(${1.2 + audioLevel * 0.8})`,
                                transition: "transform 0.1s ease-out"
                            }}
                        />
                    </>
                )}

                <Button
                    size="lg"
                    onClick={isConnected ? stopAndProcess : connect}
                    disabled={isProcessing}
                    className={cn(
                        "relative w-24 h-24 rounded-full transition-all duration-300",
                        isRecording
                            ? "bg-gradient-to-r from-cyan-500 to-teal-500 hover:from-cyan-600 hover:to-teal-600 shadow-lg shadow-cyan-500/50"
                            : "bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 shadow-lg shadow-cyan-500/30"
                    )}
                >
                    {isProcessing ? (
                        <Loader2 className="w-10 h-10 animate-spin" />
                    ) : isRecording ? (
                        <Square className="w-8 h-8" />
                    ) : (
                        <div className="flex flex-col items-center">
                            <Radio className="w-8 h-8" />
                            <span className="text-[10px] mt-1">LIVE</span>
                        </div>
                    )}
                </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
                {isProcessing
                    ? "Připojuji se..."
                    : isRecording
                        ? "Mluvte... Klikněte pro ukončení"
                        : "Gemini Live streaming (WebSocket)"}
            </p>

            {/* Audio Level Visualization */}
            {isRecording && (
                <div className="flex items-center gap-1">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="w-1 rounded-full bg-gradient-to-t from-cyan-500 to-teal-400 transition-all duration-75"
                            style={{
                                height: `${Math.random() * audioLevel * 40 + 4}px`,
                            }}
                        />
                    ))}
                </div>
            )}
        </div>
    );
}
