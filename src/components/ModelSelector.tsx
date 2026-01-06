"use client";

import { AIProvider, OpenAIModel, GeminiModel, OPENAI_MODELS, GEMINI_MODELS, ModelInfo } from "@/types";
import { ChevronDown, Coins, Zap } from "lucide-react";
import { useState, useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

interface ModelSelectorProps {
    provider: AIProvider;
    selectedModel: string;
    onModelChange: (model: string) => void;
}

export function ModelSelector({ provider, selectedModel, onModelChange }: ModelSelectorProps) {
    const [isOpen, setIsOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Get models based on provider
    const models = provider === "openai"
        ? Object.values(OPENAI_MODELS)
        : Object.values(GEMINI_MODELS);

    const currentModel = models.find(m => m.id === selectedModel) || models[0];

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const formatPrice = (price: number) => {
        return `$${price.toFixed(2)}`;
    };

    const isOpenAI = provider === "openai";

    return (
        <div className="relative" ref={dropdownRef}>
            {/* Current Selection Button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl border transition-all duration-200",
                    "bg-secondary/50 hover:bg-secondary/80 backdrop-blur-sm",
                    isOpen && "ring-2 ring-primary/50",
                    isOpenAI
                        ? "border-emerald-500/30 hover:border-emerald-500/50"
                        : "border-blue-500/30 hover:border-blue-500/50"
                )}
            >
                <div className={cn(
                    "p-1.5 rounded-lg",
                    isOpenAI ? "bg-emerald-500/20" : "bg-blue-500/20"
                )}>
                    <Zap className={cn(
                        "w-4 h-4",
                        isOpenAI ? "text-emerald-400" : "text-blue-400"
                    )} />
                </div>

                <div className="text-left">
                    <div className="text-sm font-medium text-foreground">{currentModel.name}</div>
                    <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <Coins className="w-3 h-3" />
                        <span>{formatPrice(currentModel.inputPrice)}/{formatPrice(currentModel.outputPrice)} /1M</span>
                    </div>
                </div>

                <ChevronDown className={cn(
                    "w-4 h-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                )} />
            </button>

            {/* Dropdown Menu */}
            {isOpen && (
                <div className={cn(
                    "absolute top-full left-0 mt-2 w-72 rounded-xl border bg-card/95 backdrop-blur-lg shadow-xl z-50",
                    "animate-in fade-in-0 zoom-in-95 duration-200",
                    isOpenAI ? "border-emerald-500/30" : "border-blue-500/30"
                )}>
                    <div className="p-2">
                        <div className="px-3 py-2 text-xs font-medium text-muted-foreground uppercase tracking-wider">
                            {isOpenAI ? "OpenAI Modely" : "Gemini Modely"}
                        </div>

                        {models.map((model) => (
                            <button
                                key={model.id}
                                onClick={() => {
                                    onModelChange(model.id);
                                    setIsOpen(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-3 rounded-lg transition-all",
                                    "hover:bg-secondary/80",
                                    selectedModel === model.id && (
                                        isOpenAI
                                            ? "bg-emerald-500/10 border border-emerald-500/30"
                                            : "bg-blue-500/10 border border-blue-500/30"
                                    )
                                )}
                            >
                                <div className={cn(
                                    "p-2 rounded-lg",
                                    selectedModel === model.id
                                        ? isOpenAI ? "bg-emerald-500/30" : "bg-blue-500/30"
                                        : "bg-secondary"
                                )}>
                                    <Zap className={cn(
                                        "w-4 h-4",
                                        selectedModel === model.id
                                            ? isOpenAI ? "text-emerald-400" : "text-blue-400"
                                            : "text-muted-foreground"
                                    )} />
                                </div>

                                <div className="flex-1 text-left">
                                    <div className="text-sm font-medium text-foreground">{model.name}</div>
                                    <div className="text-xs text-muted-foreground">{model.description}</div>
                                </div>

                                <div className="text-right">
                                    <div className={cn(
                                        "text-xs font-medium",
                                        isOpenAI ? "text-emerald-400" : "text-blue-400"
                                    )}>
                                        {formatPrice(model.inputPrice)}
                                    </div>
                                    <div className="text-xs text-muted-foreground">
                                        /{formatPrice(model.outputPrice)}
                                    </div>
                                </div>
                            </button>
                        ))}
                    </div>

                    {/* Pricing Legend */}
                    <div className="px-4 py-2 border-t border-border/50 bg-secondary/30 rounded-b-xl">
                        <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                            <span>Cena za 1M tokenů:</span>
                            <span className={isOpenAI ? "text-emerald-400" : "text-blue-400"}>vstup</span>
                            <span>/</span>
                            <span>výstup</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
