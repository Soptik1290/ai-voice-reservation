"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { TranscriptionResult, UsageMetrics, PRICING } from "@/types";
import { Mic, Square, Loader2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

interface RealtimeRecorderProps {
    onTranscription: (result: TranscriptionResult) => void;
    isProcessing: boolean;
    setIsProcessing: (value: boolean) => void;
}

export function RealtimeRecorder({
    onTranscription,
    isProcessing,
    setIsProcessing
}: RealtimeRecorderProps) {
    const [isConnected, setIsConnected] = useState(false);
    const [isRecording, setIsRecording] = useState(false);
    const [liveTranscript, setLiveTranscript] = useState("");
    const [audioLevel, setAudioLevel] = useState(0);

    const pcRef = useRef<RTCPeerConnection | null>(null);
    const dcRef = useRef<RTCDataChannel | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const startTimeRef = useRef<number>(0);
    const tokensRef = useRef<{ input: number; output: number }>({ input: 0, output: 0 });

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
        setIsProcessing(true);
        startTimeRef.current = performance.now();
        tokensRef.current = { input: 0, output: 0 };
        setLiveTranscript("");

        try {
            // Get ephemeral token from backend
            const tokenResponse = await fetch("/api/realtime/session", {
                method: "POST",
            });

            if (!tokenResponse.ok) {
                throw new Error("Failed to get session token");
            }

            const { client_secret } = await tokenResponse.json();

            // Create WebRTC peer connection
            const pc = new RTCPeerConnection();
            pcRef.current = pc;

            // Set up audio element for playback
            const audioEl = document.createElement("audio");
            audioEl.autoplay = true;
            pc.ontrack = (e) => {
                audioEl.srcObject = e.streams[0];
            };

            // Get microphone access
            const stream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    sampleRate: 24000,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                }
            });

            // Set up audio analyser for visualization
            audioContextRef.current = new AudioContext();
            const source = audioContextRef.current.createMediaStreamSource(stream);
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            source.connect(analyserRef.current);

            // Add audio track to peer connection
            stream.getTracks().forEach(track => pc.addTrack(track, stream));

            // Create data channel for events
            const dc = pc.createDataChannel("oai-events");
            dcRef.current = dc;

            dc.onmessage = (e) => {
                const event = JSON.parse(e.data);
                handleRealtimeEvent(event);
            };

            dc.onopen = () => {
                setIsConnected(true);
                setIsRecording(true);
                setIsProcessing(false);
                animationFrameRef.current = requestAnimationFrame(updateAudioLevel);

                // Send session update to enable transcription and set Czech language
                dc.send(JSON.stringify({
                    type: "session.update",
                    session: {
                        input_audio_transcription: {
                            model: "whisper-1",
                            language: "cs"  // Force Czech language
                        },
                        instructions: "Uživatel mluví česky. Vždy přepisuj v češtině. Extrahuj rezervační data: jméno, datum, čas."
                    }
                }));
            };

            // Create and set local description
            const offer = await pc.createOffer();
            await pc.setLocalDescription(offer);

            // Send offer to OpenAI Realtime API
            const sdpResponse = await fetch(
                `https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview`,
                {
                    method: "POST",
                    headers: {
                        "Authorization": `Bearer ${client_secret.value}`,
                        "Content-Type": "application/sdp",
                    },
                    body: offer.sdp,
                }
            );

            if (!sdpResponse.ok) {
                throw new Error("Failed to connect to Realtime API");
            }

            const answer: RTCSessionDescriptionInit = {
                type: "answer",
                sdp: await sdpResponse.text(),
            };
            await pc.setRemoteDescription(answer);

        } catch (error) {
            console.error("Error connecting to Realtime API:", error);
            setIsProcessing(false);
            alert("Nepodařilo se připojit k OpenAI Realtime API. Zkontrolujte API klíč.");
            disconnect();
        }
    };

    const handleRealtimeEvent = (event: any) => {
        switch (event.type) {
            case "conversation.item.input_audio_transcription.completed":
                // User's speech transcribed
                setLiveTranscript(prev => prev + (prev ? " " : "") + event.transcript);
                break;

            case "response.audio_transcript.delta":
                // AI response transcript delta
                // This is the AI speaking back, not what we need for reservation
                break;

            case "response.done":
                // Response completed, extract reservation data
                if (event.response?.output) {
                    const output = event.response.output[0];
                    if (output?.content) {
                        const text = output.content.find((c: any) => c.type === "text")?.text || "";
                        parseReservation(text);
                    }
                }
                // Track tokens
                if (event.response?.usage) {
                    tokensRef.current.input += event.response.usage.input_tokens || 0;
                    tokensRef.current.output += event.response.usage.output_tokens || 0;
                }
                break;

            case "error":
                console.error("Realtime API error:", event.error);
                break;
        }
    };

    const parseReservation = (text: string) => {
        // Try to extract reservation data from AI response
        const nameMatch = text.match(/pro\s+([A-ZÁ-Ža-zá-ž]+\s+[A-ZÁ-Ža-zá-ž]+)/i);
        const dateMatch = text.match(/(\d{1,2})\.?\s*(\d{1,2})\.?\s*(\d{4})?|(\d{4}-\d{2}-\d{2})/);
        const timeMatch = text.match(/v?\s*(\d{1,2})[:\.](\d{2})/);

        if (nameMatch || dateMatch) {
            let date = "";
            if (dateMatch) {
                if (dateMatch[4]) {
                    date = dateMatch[4];
                } else {
                    const day = dateMatch[1].padStart(2, "0");
                    const month = dateMatch[2].padStart(2, "0");
                    const year = dateMatch[3] || new Date().getFullYear();
                    date = `${year}-${month}-${day}`;
                }
            }

            const endTime = performance.now();
            const durationMs = Math.round(endTime - startTimeRef.current);
            const metrics: UsageMetrics = {
                durationMs,
                tokensInput: tokensRef.current.input,
                tokensOutput: tokensRef.current.output,
                tokensTotal: tokensRef.current.input + tokensRef.current.output,
                estimatedCostUsd:
                    // Audio is charged per minute
                    (durationMs / 60000) * (PRICING.openai.realtime.audioInputPerMinute + PRICING.openai.realtime.audioOutputPerMinute),
            };

            onTranscription({
                text: liveTranscript || text,
                reservation: {
                    clientName: nameMatch ? nameMatch[1] : undefined,
                    date: date || undefined,
                    time: timeMatch ? `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}` : undefined,
                },
                metrics,
            });
        }
    };

    const disconnect = () => {
        if (animationFrameRef.current) {
            cancelAnimationFrame(animationFrameRef.current);
        }
        if (dcRef.current) {
            dcRef.current.close();
            dcRef.current = null;
        }
        if (pcRef.current) {
            pcRef.current.close();
            pcRef.current = null;
        }
        if (audioContextRef.current) {
            audioContextRef.current.close();
            audioContextRef.current = null;
        }
        setIsConnected(false);
        setIsRecording(false);
        setAudioLevel(0);
    };

    const stopAndProcess = () => {
        // Send a message to trigger response
        if (dcRef.current && dcRef.current.readyState === "open") {
            dcRef.current.send(JSON.stringify({
                type: "response.create",
                response: {
                    modalities: ["text"],
                    instructions: `Uživatel řekl: "${liveTranscript}". 
Extrahuj z toho rezervaci a vrať ji ve formátu: "Rezervace pro [jméno] na [datum ve formátu DD.MM.RRRR] v [čas]".
Pokud nějaký údaj chybí, vynech ho.`,
                }
            }));
        }

        setTimeout(() => {
            const endTime = performance.now();
            const durationMs = Math.round(endTime - startTimeRef.current);
            const metrics: UsageMetrics = {
                durationMs,
                tokensInput: tokensRef.current.input,
                tokensOutput: tokensRef.current.output,
                tokensTotal: tokensRef.current.input + tokensRef.current.output,
                estimatedCostUsd:
                    // Audio is charged per minute
                    (durationMs / 60000) * (PRICING.openai.realtime.audioInputPerMinute + PRICING.openai.realtime.audioOutputPerMinute),
            };

            if (liveTranscript) {
                onTranscription({
                    text: liveTranscript,
                    metrics,
                });
            }
            disconnect();
        }, 2000);
    };

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Live Transcript */}
            {liveTranscript && (
                <div className="w-full max-w-md p-3 rounded-lg bg-purple-500/10 border border-purple-500/30">
                    <div className="flex items-center gap-2 mb-2">
                        <Zap className="w-4 h-4 text-purple-400 animate-pulse" />
                        <span className="text-xs text-purple-400 font-medium">Live transkripce</span>
                    </div>
                    <p className="text-sm text-foreground italic">&ldquo;{liveTranscript}&rdquo;</p>
                </div>
            )}

            {/* Realtime Button */}
            <div className="relative">
                {isRecording && (
                    <>
                        <div
                            className="absolute inset-0 rounded-full bg-purple-500/20 animate-ping"
                            style={{ animationDuration: "1.5s" }}
                        />
                        <div
                            className="absolute inset-0 rounded-full bg-purple-500/10"
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
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 shadow-lg shadow-purple-500/50"
                            : "bg-gradient-to-r from-purple-500 to-violet-500 hover:from-purple-600 hover:to-violet-600 shadow-lg shadow-purple-500/30"
                    )}
                >
                    {isProcessing ? (
                        <Loader2 className="w-10 h-10 animate-spin" />
                    ) : isRecording ? (
                        <Square className="w-8 h-8" />
                    ) : (
                        <div className="flex flex-col items-center">
                            <Zap className="w-8 h-8" />
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
                        : "Realtime streaming (WebRTC)"}
            </p>

            {/* Audio Level Visualization */}
            {isRecording && (
                <div className="flex items-center gap-1">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="w-1 rounded-full bg-gradient-to-t from-purple-500 to-pink-400 transition-all duration-75"
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
