"use client";

import { Button } from "@/components/ui/button";
import { TranscriptionResult } from "@/types";
import { Mic, Square, Loader2, Radio } from "lucide-react";
import { cn } from "@/lib/utils";
import { useGeminiLive } from "@/hooks/useGeminiLive";

interface GeminiLiveRecorderProps {
    onTranscription: (result: TranscriptionResult) => void;
    isProcessing: boolean;
    setIsProcessing: (value: boolean) => void;
    model?: string;
}

export function GeminiLiveRecorder({
    onTranscription,
    isProcessing,
    setIsProcessing,
    model
}: GeminiLiveRecorderProps) {
    const {
        connect,
        stopAndProcess,
        isConnected,
        isRecording,
        liveTranscript,
        audioLevel
    } = useGeminiLive({
        onTranscription,
        model
    });

    // Sync processing state if needed, though mostly handled by hook logic
    // We can rely on hook's 'isProcessing' or keep the prop based one.
    // The prop 'setIsProcessing' signals parent about loading states.
    // For now, we'll keep the button disabled based on the prop passed from parent
    // but the hook also has its own loading state.

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
                <div className="flex items-end justify-center gap-1 h-16">
                    {[...Array(24)].map((_, i) => {
                        const centerDistance = Math.abs(i - 11.5) / 12;
                        const variation = Math.sin(i * 1.5) * 0.3 + 0.7;
                        const baseHeight = 6;
                        const dynamicHeight = audioLevel * 80 * variation * (1 - centerDistance * 0.4);
                        const height = Math.max(baseHeight, baseHeight + dynamicHeight);

                        return (
                            <div
                                key={i}
                                className="w-1.5 rounded-full bg-gradient-to-t from-cyan-600 via-teal-500 to-cyan-400"
                                style={{
                                    height: `${height}px`,
                                    transition: 'height 0.05s ease-out',
                                    opacity: 0.6 + audioLevel * 0.4,
                                }}
                            />
                        );
                    })}
                </div>
            )}
        </div>
    );
}
