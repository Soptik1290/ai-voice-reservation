"use client";

import { useState, useEffect } from "react";
import { ProviderSwitch } from "@/components/ProviderSwitch";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { RealtimeRecorder } from "@/components/RealtimeRecorder";
import { GeminiLiveRecorder } from "@/components/GeminiLiveRecorder";
import { ReservationCard } from "@/components/ReservationCard";
import { ReservationList } from "@/components/ReservationList";
import { MetricsDisplay } from "@/components/MetricsDisplay";
import { ModelSelector } from "@/components/ModelSelector";
import { AIProvider, Reservation, TranscriptionResult, UsageMetrics } from "@/types";
import { Sparkles } from "lucide-react";

export default function Home() {
    const [provider, setProvider] = useState<AIProvider>("openai");
    const [selectedModel, setSelectedModel] = useState<string>("gpt-4o-mini");
    const [currentReservation, setCurrentReservation] = useState<Partial<Reservation> | null>(null);
    const [savedReservations, setSavedReservations] = useState<Reservation[]>([]);
    const [transcription, setTranscription] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [metrics, setMetrics] = useState<UsageMetrics | null>(null);

    // Update default model when provider changes
    useEffect(() => {
        if (provider === "openai") {
            setSelectedModel("gpt-4o-mini");
        } else if (provider === "openai-realtime") {
            setSelectedModel("gpt-4o-mini-realtime-preview");
        } else if (provider === "gemini") {
            setSelectedModel("gemini-2.0-flash");
        } else if (provider === "gemini-live") {
            setSelectedModel("gemini-2.5-flash-native-audio-preview-12-2025");
        }
    }, [provider]);

    // Load saved reservations from localStorage
    useEffect(() => {
        const saved = localStorage.getItem("reservations");
        if (saved) {
            setSavedReservations(JSON.parse(saved));
        }
    }, []);

    // Save reservations to localStorage
    useEffect(() => {
        localStorage.setItem("reservations", JSON.stringify(savedReservations));
    }, [savedReservations]);

    const handleTranscription = (result: TranscriptionResult) => {
        setTranscription(result.text);
        if (result.reservation) {
            setCurrentReservation(result.reservation);
        }
        if (result.metrics) {
            setMetrics(result.metrics);
        }
    };

    const handleSaveReservation = (reservation: Reservation) => {
        setSavedReservations((prev) => [reservation, ...prev]);
        setCurrentReservation(null);
        setTranscription("");
        setMetrics(null);
    };

    const handleDeleteReservation = (id: string) => {
        setSavedReservations((prev) => prev.filter((r) => r.id !== id));
    };

    const renderRecorder = () => {
        switch (provider) {
            case "openai-realtime":
                return (
                    <RealtimeRecorder
                        onTranscription={handleTranscription}
                        isProcessing={isProcessing}
                        setIsProcessing={setIsProcessing}
                        model={selectedModel}
                    />
                );
            case "gemini-live":
                return (
                    <GeminiLiveRecorder
                        onTranscription={handleTranscription}
                        isProcessing={isProcessing}
                        setIsProcessing={setIsProcessing}
                        model={selectedModel}
                    />
                );
            default:
                return (
                    <VoiceRecorder
                        provider={provider}
                        model={selectedModel}
                        onTranscription={handleTranscription}
                        isProcessing={isProcessing}
                        setIsProcessing={setIsProcessing}
                    />
                );
        }
    };

    const isLiveProvider = provider === "openai-realtime" || provider === "gemini-live";

    return (
        <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/30 overflow-x-hidden">
            {/* Enhanced decorative background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                {/* Primary gradient orb */}
                <div
                    className="absolute top-1/4 left-1/4 w-[500px] h-[500px] rounded-full blur-[120px] animate-float"
                    style={{
                        background: 'radial-gradient(circle, rgba(139, 92, 246, 0.15) 0%, transparent 70%)',
                    }}
                />
                {/* Secondary gradient orb */}
                <div
                    className="absolute bottom-1/4 right-1/4 w-[450px] h-[450px] rounded-full blur-[100px] animate-float"
                    style={{
                        background: 'radial-gradient(circle, rgba(59, 130, 246, 0.12) 0%, transparent 70%)',
                        animationDelay: '1.5s'
                    }}
                />
                {/* Accent orb */}
                <div
                    className="absolute top-3/4 left-1/2 w-[300px] h-[300px] rounded-full blur-[80px] animate-float"
                    style={{
                        background: 'radial-gradient(circle, rgba(16, 185, 129, 0.1) 0%, transparent 70%)',
                        animationDelay: '2.5s'
                    }}
                />
                {/* Grid overlay */}
                <div
                    className="absolute inset-0 opacity-[0.02]"
                    style={{
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
                        backgroundSize: '60px 60px'
                    }}
                />
            </div>

            <div className="relative max-w-4xl mx-auto px-4 sm:px-6 py-12 sm:py-16">
                {/* Header */}
                <header className="text-center mb-14">
                    <div className="inline-flex items-center gap-2.5 mb-6 px-5 py-2.5 rounded-full glass border border-primary/20 shadow-lg shadow-primary/5">
                        <Sparkles className="w-4 h-4 text-primary animate-pulse" />
                        <span className="text-sm font-medium bg-gradient-to-r from-primary to-purple-400 bg-clip-text text-transparent">AI Voice Comparison</span>
                    </div>
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold tracking-tight mb-5">
                        <span className="bg-gradient-to-r from-white via-white to-muted-foreground/80 bg-clip-text text-transparent">
                            Hlasové rezervace
                        </span>
                    </h1>
                    <p className="text-muted-foreground text-base sm:text-lg max-w-xl mx-auto leading-relaxed">
                        Porovnejte 4 AI modely: OpenAI, OpenAI Realtime, Gemini a Gemini Live.
                        Nahrajte hlasový příkaz a sledujte výsledky.
                    </p>
                </header>

                {/* Provider Switch */}
                <div className="flex justify-center mb-10">
                    <ProviderSwitch provider={provider} onProviderChange={setProvider} />
                </div>

                {/* Model Selector */}
                <div className="flex justify-center mb-10">
                    <ModelSelector
                        provider={provider === "openai" || provider === "openai-realtime" ? "openai" : "gemini"}
                        selectedModel={selectedModel}
                        onModelChange={setSelectedModel}
                        isLive={isLiveProvider}
                    />
                </div>

                {/* Voice Recorder */}
                <div className="flex justify-center mb-14">
                    {renderRecorder()}
                </div>

                {/* Metrics Display */}
                {metrics && (
                    <div className="mb-8 flex justify-center">
                        <MetricsDisplay metrics={metrics} provider={provider} />
                    </div>
                )}

                {/* Transcription Display (only for non-live providers) */}
                {transcription && !isLiveProvider && (
                    <div className="mb-10 p-5 rounded-2xl glass-card border border-white/10 shadow-xl">
                        <p className="text-xs uppercase tracking-wider text-muted-foreground mb-2 font-medium">Rozpoznaný text</p>
                        <p className="text-foreground text-lg leading-relaxed">&ldquo;{transcription}&rdquo;</p>
                    </div>
                )}

                {/* Current Reservation Card */}
                {currentReservation && (
                    <div className="mb-12">
                        <h2 className="text-lg font-semibold mb-4">Nová rezervace</h2>
                        <ReservationCard
                            reservation={currentReservation}
                            onSave={handleSaveReservation}
                            provider={provider}
                            metrics={metrics || undefined}
                        />
                    </div>
                )}

                {/* Saved Reservations */}
                <section>
                    <div className="flex items-center gap-3 mb-6">
                        <h2 className="text-xl font-semibold tracking-tight">Uložené rezervace</h2>
                        {savedReservations.length > 0 && (
                            <span className="text-xs px-2.5 py-1 rounded-full bg-gradient-to-r from-primary/20 to-purple-500/20 text-primary font-medium border border-primary/20">
                                {savedReservations.length}
                            </span>
                        )}
                    </div>
                    <ReservationList
                        reservations={savedReservations}
                        onDelete={handleDeleteReservation}
                    />
                </section>
            </div>
        </main>
    );
}
