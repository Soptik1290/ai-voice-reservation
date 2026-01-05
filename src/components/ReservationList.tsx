"use client";

import { Reservation, AIProvider } from "@/types";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, User, Trash2, FileText } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReservationListProps {
    reservations: Reservation[];
    onDelete: (id: string) => void;
}

const getProviderStyle = (provider: AIProvider) => {
    switch (provider) {
        case "openai":
            return { border: "border-l-emerald-500", badge: "bg-emerald-500/10 text-emerald-400", label: "OpenAI" };
        case "openai-realtime":
            return { border: "border-l-purple-500", badge: "bg-purple-500/10 text-purple-400", label: "OpenAI RT" };
        case "gemini":
            return { border: "border-l-blue-500", badge: "bg-blue-500/10 text-blue-400", label: "Gemini" };
        case "gemini-live":
            return { border: "border-l-cyan-500", badge: "bg-cyan-500/10 text-cyan-400", label: "Gemini RT" };
        default:
            return { border: "border-l-emerald-500", badge: "bg-emerald-500/10 text-emerald-400", label: "AI" };
    }
};

export function ReservationList({ reservations, onDelete }: ReservationListProps) {
    if (reservations.length === 0) {
        return (
            <div className="text-center py-12 text-muted-foreground">
                <FileText className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>Zatím žádné uložené rezervace</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {reservations.map((reservation) => {
                const style = getProviderStyle(reservation.provider);

                return (
                    <Card
                        key={reservation.id}
                        className={cn(
                            "transition-all duration-200 hover:shadow-md border-l-4",
                            style.border
                        )}
                    >
                        <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                                <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                        <User className="w-4 h-4 text-muted-foreground" />
                                        <span className="font-medium">{reservation.clientName}</span>
                                        <span className={cn("text-xs px-2 py-0.5 rounded-full", style.badge)}>
                                            {style.label}
                                        </span>
                                    </div>
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
                                    {reservation.notes && (
                                        <p className="text-sm text-muted-foreground italic">
                                            {reservation.notes}
                                        </p>
                                    )}
                                </div>
                                <Button
                                    size="icon"
                                    variant="ghost"
                                    className="text-muted-foreground hover:text-destructive"
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
