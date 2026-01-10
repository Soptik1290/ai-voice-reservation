"use client";

import { Reservation, AIProvider } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Trash2, FileText, Timer, Hash, Coins } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReservationListProps {
    reservations: Reservation[];
    onDelete: (id: string) => void;
}

const getProviderStyle = (provider: AIProvider) => {
    switch (provider) {
        case "openai":
            return { border: "border-l-emerald-500", badge: "bg-emerald-500/10 text-emerald-400", label: "OpenAI", accent: "text-emerald-400" };
        case "openai-realtime":
            return { border: "border-l-purple-500", badge: "bg-purple-500/10 text-purple-400", label: "OpenAI RT", accent: "text-purple-400" };
        case "gemini":
            return { border: "border-l-blue-500", badge: "bg-blue-500/10 text-blue-400", label: "Gemini", accent: "text-blue-400" };
        case "gemini-live":
            return { border: "border-l-cyan-500", badge: "bg-cyan-500/10 text-cyan-400", label: "Gemini RT", accent: "text-cyan-400" };
        default:
            return { border: "border-l-emerald-500", badge: "bg-emerald-500/10 text-emerald-400", label: "AI", accent: "text-emerald-400" };
    }
};

export function ReservationList({ reservations, onDelete }: ReservationListProps) {
    if (reservations.length === 0) {
        return (
            <div className="text-center py-16 rounded-2xl glass-card border border-white/10">
                <div className="w-16 h-16 mx-auto mb-5 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                    <FileText className="w-8 h-8 text-primary/60" />
                </div>
                <p className="text-muted-foreground font-medium">Zatím žádné uložené rezervace</p>
                <p className="text-sm text-muted-foreground/60 mt-1">Nahrajte hlasový příkaz pro vytvoření rezervace</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {reservations.map((reservation) => {
                const style = getProviderStyle(reservation.provider);
                const metrics = reservation.metrics;

                return (
                    <Card
                        key={reservation.id}
                        className={cn(
                            "transition-all duration-300 hover:shadow-xl hover:scale-[1.01] border-l-4 glass-card border-r border-t border-b border-white/10",
                            style.border
                        )}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                    {/* Header row */}
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <User className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-medium">{reservation.clientName}</span>
                                        <span className={cn("text-xs px-2 py-0.5 rounded-full", style.badge)}>
                                            {style.label}
                                        </span>
                                    </div>

                                    {/* Date/Time row */}
                                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                        <span className="flex items-center gap-1">
                                            <Calendar className="w-3 h-3" />
                                            {reservation.date}
                                        </span>
                                        {reservation.time && (
                                            <span className="flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {reservation.time}
                                            </span>
                                        )}
                                    </div>

                                    {/* Notes */}
                                    {reservation.notes && (
                                        <p className="text-sm text-muted-foreground italic">
                                            {reservation.notes}
                                        </p>
                                    )}

                                    {/* Metrics row */}
                                    {metrics && (
                                        <div className={cn("flex items-center gap-4 text-xs pt-1 border-t border-border/50 mt-2", style.accent)}>
                                            <span className="flex items-center gap-1">
                                                <Timer className="w-3 h-3" />
                                                {metrics.durationMs < 1000
                                                    ? `${metrics.durationMs}ms`
                                                    : `${(metrics.durationMs / 1000).toFixed(2)}s`
                                                }
                                            </span>
                                            {metrics.tokensTotal !== undefined && metrics.tokensTotal > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Hash className="w-3 h-3" />
                                                    {metrics.tokensTotal.toLocaleString()} tok
                                                </span>
                                            )}
                                            {metrics.estimatedCostUsd !== undefined && metrics.estimatedCostUsd > 0 && (
                                                <span className="flex items-center gap-1">
                                                    <Coins className="w-3 h-3" />
                                                    ${metrics.estimatedCostUsd < 0.001
                                                        ? "<0.001"
                                                        : metrics.estimatedCostUsd.toFixed(4)
                                                    }
                                                </span>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-muted-foreground hover:text-destructive shrink-0"
                                    onClick={() => onDelete(reservation.id)}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );
}
