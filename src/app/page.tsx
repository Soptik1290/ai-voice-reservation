"use client";

import { useState, useEffect } from "react";
import { ProviderSwitch } from "@/components/ProviderSwitch";
import { VoiceRecorder } from "@/components/VoiceRecorder";
import { ReservationCard } from "@/components/ReservationCard";
import { ReservationList } from "@/components/ReservationList";
import { AIProvider, Reservation, TranscriptionResult } from "@/types";
import { Sparkles } from "lucide-react";

export default function Home() {
    const [provider, setProvider] = useState<AIProvider>("openai");
    const [currentReservation, setCurrentReservation] = useState<Partial<Reservation> | null>(null);
    const [savedReservations, setSavedReservations] = useState<Reservation[]>([]);
    const [transcription, setTranscription] = useState<string>("");
    const [isProcessing, setIsProcessing] = useState(false);

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
    };

    const handleSaveReservation = (reservation: Reservation) => {
        setSavedReservations((prev) => [reservation, ...prev]);
        setCurrentReservation(null);
        setTranscription("");
    };

    const handleDeleteReservation = (id: string) => {
        setSavedReservations((prev) => prev.filter((r) => r.id !== id));
    };

    return (
        <main className="min-h-screen bg-gradient-to-br from-background via-background to-secondary/20">
            {/* Decorative background elements */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl animate-pulse" />
                <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-blue-500/5 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
            </div>

            <div className="relative max-w-4xl mx-auto px-4 py-12">
                {/* Header */}
                <header className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 mb-4 px-4 py-2 rounded-full bg-secondary/50 border border-border/50 backdrop-blur-sm">
                        <Sparkles className="w-4 h-4 text-primary" />
                        <span className="text-sm text-muted-foreground">AI Voice Comparison</span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-foreground via-foreground to-muted-foreground bg-clip-text text-transparent mb-4">
                        Hlasové rezervace
                    </h1>
                    <p className="text-muted-foreground max-w-xl mx-auto">
                        Porovnejte realtime AI modely od OpenAI a Google. Nahrajte hlasový příkaz
                        a sledujte, jak AI extrahuje data rezervace.
                    </p>
                </header>

                {/* Provider Switch */}
                <div className="flex justify-center mb-12">
                    <ProviderSwitch provider={provider} onProviderChange={setProvider} />
                </div>

                {/* Voice Recorder */}
                <div className="flex justify-center mb-12">
                    <VoiceRecorder
                        provider={provider}
                        onTranscription={handleTranscription}
                        isProcessing={isProcessing}
                        setIsProcessing={setIsProcessing}
                    />
                </div>

                {/* Transcription Display */}
                {transcription && (
                    <div className="mb-8 p-4 rounded-xl bg-secondary/30 border border-border/50 backdrop-blur-sm">
                        <p className="text-sm text-muted-foreground mb-1">Rozpoznaný text:</p>
                        <p className="text-foreground italic">&ldquo;{transcription}&rdquo;</p>
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
                        />
                    </div>
                )}

                {/* Saved Reservations */}
                <section>
                    <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                        Uložené rezervace
                        {savedReservations.length > 0 && (
                            <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground">
                                {savedReservations.length}
                            </span>
                        )}
                    </h2>
                    <ReservationList
                        reservations={savedReservations}
                        onDelete={handleDeleteReservation}
                    />
                </section>
            </div>
        </main>
    );
}
