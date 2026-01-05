"use client";

import { useState } from "react";
import { Reservation, AIProvider } from "@/types";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Calendar, Clock, User, FileText, Save, Edit2, X, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReservationCardProps {
    reservation: Partial<Reservation>;
    onSave: (reservation: Reservation) => void;
    provider: AIProvider;
}

export function ReservationCard({ reservation, onSave, provider }: ReservationCardProps) {
    const [isEditing, setIsEditing] = useState(false);
    const [editedReservation, setEditedReservation] = useState<Partial<Reservation>>(reservation);

    const handleSave = () => {
        const fullReservation: Reservation = {
            id: crypto.randomUUID(),
            clientName: editedReservation.clientName || "Neznámý klient",
            date: editedReservation.date || new Date().toISOString().split("T")[0],
            time: editedReservation.time,
            notes: editedReservation.notes,
            provider,
            createdAt: new Date().toISOString(),
        };
        onSave(fullReservation);
    };

    const getGradientClass = () => {
        switch (provider) {
            case "openai": return "from-emerald-500/10 to-teal-500/10 border-emerald-500/20";
            case "openai-realtime": return "from-purple-500/10 to-violet-500/10 border-purple-500/20";
            case "gemini": return "from-blue-500/10 to-indigo-500/10 border-blue-500/20";
            case "gemini-live": return "from-cyan-500/10 to-teal-500/10 border-cyan-500/20";
            default: return "from-emerald-500/10 to-teal-500/10 border-emerald-500/20";
        }
    };

    const getAccentClass = () => {
        switch (provider) {
            case "openai": return "text-emerald-400";
            case "openai-realtime": return "text-purple-400";
            case "gemini": return "text-blue-400";
            case "gemini-live": return "text-cyan-400";
            default: return "text-emerald-400";
        }
    };

    const getButtonClass = () => {
        switch (provider) {
            case "openai": return "bg-emerald-500 hover:bg-emerald-600";
            case "openai-realtime": return "bg-purple-500 hover:bg-purple-600";
            case "gemini": return "bg-blue-500 hover:bg-blue-600";
            case "gemini-live": return "bg-cyan-500 hover:bg-cyan-600";
            default: return "bg-emerald-500 hover:bg-emerald-600";
        }
    };

    const getProviderLabel = () => {
        switch (provider) {
            case "openai": return "OpenAI";
            case "openai-realtime": return "OpenAI Realtime";
            case "gemini": return "Gemini";
            case "gemini-live": return "Gemini Live";
            default: return "AI";
        }
    };

    const getDotClass = () => {
        switch (provider) {
            case "openai": return "bg-emerald-400";
            case "openai-realtime": return "bg-purple-400";
            case "gemini": return "bg-blue-400";
            case "gemini-live": return "bg-cyan-400";
            default: return "bg-emerald-400";
        }
    };

    const gradientClass = getGradientClass();
    const accentClass = getAccentClass();

    return (
        <Card className={cn(
            "bg-gradient-to-br border-2 backdrop-blur-sm transition-all duration-300 hover:shadow-lg",
            gradientClass
        )}>
            <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-lg">
                    <span className="flex items-center gap-2">
                        <div className={cn("w-2 h-2 rounded-full animate-pulse", getDotClass())} />
                        Extrahovaná rezervace
                    </span>
                    <span className={cn("text-xs font-normal px-2 py-1 rounded-full bg-secondary", accentClass)}>
                        {getProviderLabel()}
                    </span>
                </CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <User className={cn("w-5 h-5", accentClass)} />
                        {isEditing ? (
                            <Input
                                value={editedReservation.clientName || ""}
                                onChange={(e) => setEditedReservation({ ...editedReservation, clientName: e.target.value })}
                                placeholder="Jméno klienta"
                                className="h-8"
                            />
                        ) : (
                            <span className="font-medium">{reservation.clientName || "Neznámý klient"}</span>
                        )}
                    </div>

                    <div className="flex items-center gap-3">
                        <Calendar className={cn("w-5 h-5", accentClass)} />
                        {isEditing ? (
                            <Input
                                type="date"
                                value={editedReservation.date || ""}
                                onChange={(e) => setEditedReservation({ ...editedReservation, date: e.target.value })}
                                className="h-8"
                            />
                        ) : (
                            <span>{reservation.date || "Datum neuvedeno"}</span>
                        )}
                    </div>

                    {(reservation.time || isEditing) && (
                        <div className="flex items-center gap-3">
                            <Clock className={cn("w-5 h-5", accentClass)} />
                            {isEditing ? (
                                <Input
                                    type="time"
                                    value={editedReservation.time || ""}
                                    onChange={(e) => setEditedReservation({ ...editedReservation, time: e.target.value })}
                                    className="h-8"
                                />
                            ) : (
                                <span>{reservation.time}</span>
                            )}
                        </div>
                    )}

                    {(reservation.notes || isEditing) && (
                        <div className="flex items-start gap-3">
                            <FileText className={cn("w-5 h-5 mt-0.5", accentClass)} />
                            {isEditing ? (
                                <Input
                                    value={editedReservation.notes || ""}
                                    onChange={(e) => setEditedReservation({ ...editedReservation, notes: e.target.value })}
                                    placeholder="Poznámky"
                                    className="h-8"
                                />
                            ) : (
                                <span className="text-muted-foreground">{reservation.notes}</span>
                            )}
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className="gap-2">
                {isEditing ? (
                    <>
                        <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                                setIsEditing(false);
                                setEditedReservation(reservation);
                            }}
                        >
                            <X className="w-4 h-4 mr-1" />
                            Zrušit
                        </Button>
                        <Button
                            size="sm"
                            onClick={() => {
                                setIsEditing(false);
                            }}
                            className={getButtonClass()}
                        >
                            <Check className="w-4 h-4 mr-1" />
                            Potvrdit
                        </Button>
                    </>
                ) : (
                    <>
                        <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
                            <Edit2 className="w-4 h-4 mr-1" />
                            Upravit
                        </Button>
                        <Button
                            size="sm"
                            onClick={handleSave}
                            className={getButtonClass()}
                        >
                            <Save className="w-4 h-4 mr-1" />
                            Uložit
                        </Button>
                    </>
                )}
            </CardFooter>
        </Card>
    );
}
