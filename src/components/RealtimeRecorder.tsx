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
    const reservationRef = useRef<{ clientName?: string; date?: string; time?: string }>({});

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
        reservationRef.current = {};
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
                // Also try to extract reservation data from live transcript
                extractFromTranscript(event.transcript);
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

    // Normalize Czech name from declined form (genitive) to nominative
    const normalizeCzechName = (firstName: string, lastName: string): string => {
        const normalizeWord = (word: string): string => {
            const lower = word.toLowerCase();

            // Common patterns: genitive -> nominative
            // Tomáše -> Tomáš (ends in -še, -če, -ře, -ně)
            if (lower.endsWith('še') || lower.endsWith('če') || lower.endsWith('ře') || lower.endsWith('ně')) {
                return word.slice(0, -1);
            }
            // Pavla -> Pavel
            if (lower.endsWith('vla')) {
                return word.slice(0, -2) + 'el';
            }
            // Generic: remove trailing -a for masculine names (Starka -> Stark, Nováka -> Novák)
            // But keep feminine names that naturally end in -a
            const feminineNames = ['anna', 'eva', 'marie', 'lucie', 'tereza', 'kateřina', 'martina', 'petra', 'jana'];
            if (lower.endsWith('a') && !feminineNames.includes(lower)) {
                return word.slice(0, -1);
            }

            return word;
        };

        const normalizedFirst = normalizeWord(firstName);
        const normalizedLast = normalizeWord(lastName);

        console.log(`Normalized: ${firstName} ${lastName} -> ${normalizedFirst} ${normalizedLast}`);
        return `${normalizedFirst} ${normalizedLast}`;
    };

    // Extract data directly from user's transcript (before AI processing)
    const extractFromTranscript = (text: string) => {
        console.log("Extracting from transcript:", text);

        // Simple name extraction: look for "pro [Name]" pattern using \S+ for any non-whitespace
        const nameMatch = text.match(/pro\s+(\S+)\s+(\S+)/i);
        if (nameMatch) {
            // Filter out common words that aren't names
            const skipWords = ['na', 'v', 've', 'dne', 'den', 'hodin', 'hodinu'];
            if (!skipWords.includes(nameMatch[2].toLowerCase())) {
                // Normalize the name from genitive to nominative
                const normalizedName = normalizeCzechName(nameMatch[1], nameMatch[2]);
                reservationRef.current.clientName = normalizedName;
                console.log("Extracted and normalized name:", normalizedName);
            }
        }

        // Extract date
        const monthNames: Record<string, string> = {
            'ledna': '01', 'února': '02', 'března': '03', 'dubna': '04',
            'května': '05', 'června': '06', 'července': '07', 'srpna': '08',
            'září': '09', 'října': '10', 'listopadu': '11', 'prosince': '12'
        };

        const dateMatch = text.match(/(\d{1,2})\.\s*(ledna|února|března|dubna|května|června|července|srpna|září|října|listopadu|prosince)/i);
        if (dateMatch && monthNames[dateMatch[2].toLowerCase()]) {
            const day = dateMatch[1].padStart(2, '0');
            const month = monthNames[dateMatch[2].toLowerCase()];
            const year = new Date().getFullYear();
            reservationRef.current.date = `${year}-${month}-${day}`;
            console.log("Extracted date from transcript:", reservationRef.current.date);
        }

        // Extract time
        const timeMatch = text.match(/v?\s*(\d{1,2})\s*hodin/i);
        if (timeMatch) {
            reservationRef.current.time = `${timeMatch[1].padStart(2, '0')}:00`;
            console.log("Extracted time from transcript:", reservationRef.current.time);
        }
        const timeMatchFull = text.match(/(\d{1,2})[:\.](\d{2})/);
        if (timeMatchFull) {
            reservationRef.current.time = `${timeMatchFull[1].padStart(2, '0')}:${timeMatchFull[2]}`;
        }
    };

    const parseReservation = (text: string) => {
        console.log("Parsing AI response:", text);

        // Use data already extracted from transcript, or try to extract from AI response
        let clientName = reservationRef.current.clientName;
        let date = reservationRef.current.date;
        let time = reservationRef.current.time;

        // Try additional patterns from AI response if data is missing
        if (!clientName) {
            const nameMatch = text.match(/pro\s+(\S+)\s+(\S+)/i);
            if (nameMatch) {
                clientName = `${nameMatch[1]} ${nameMatch[2]}`;
            }
        }

        if (!date) {
            const isoMatch = text.match(/(\d{4}-\d{2}-\d{2})/);
            const numericMatch = text.match(/(\d{1,2})\.(\d{1,2})\.(\d{4})/);
            if (isoMatch) {
                date = isoMatch[1];
            } else if (numericMatch) {
                date = `${numericMatch[3]}-${numericMatch[2].padStart(2, '0')}-${numericMatch[1].padStart(2, '0')}`;
            }
        }

        if (!time) {
            const timeMatch = text.match(/v\s+(\d{1,2})[:\.]?(\d{2})?/i);
            if (timeMatch) {
                time = `${timeMatch[1].padStart(2, '0')}:${timeMatch[2] || '00'}`;
            }
        }

        if (clientName || date) {
            const endTime = performance.now();
            const durationMs = Math.round(endTime - startTimeRef.current);
            const metrics: UsageMetrics = {
                durationMs,
                tokensInput: tokensRef.current.input,
                tokensOutput: tokensRef.current.output,
                tokensTotal: tokensRef.current.input + tokensRef.current.output,
                // Estimate cost: base connection fee + audio minutes
                // OpenAI charges ~$0.06/min for audio input
                estimatedCostUsd: (durationMs / 60000) * PRICING.openai.realtime.audioInputPerMinute,
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
                estimatedCostUsd: (durationMs / 60000) * PRICING.openai.realtime.audioInputPerMinute,
            };

            if (liveTranscript) {
                onTranscription({
                    text: liveTranscript,
                    reservation: reservationRef.current,  // Use extracted data
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
                <div className="flex items-end justify-center gap-1 h-16">
                    {[...Array(24)].map((_, i) => {
                        // Create wave-like effect based on position and audio level
                        const centerDistance = Math.abs(i - 11.5) / 12;
                        const waveHeight = Math.sin((i / 4) + Date.now() / 200) * 0.3;
                        const baseHeight = 8;
                        const dynamicHeight = audioLevel * 60 * (1 - centerDistance * 0.5) + waveHeight * 10;
                        const height = Math.max(baseHeight, baseHeight + dynamicHeight);

                        return (
                            <div
                                key={i}
                                className="w-1.5 rounded-full bg-gradient-to-t from-purple-600 via-pink-500 to-purple-400 transition-all duration-100"
                                style={{
                                    height: `${height}px`,
                                    opacity: 0.7 + audioLevel * 0.3,
                                }}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
