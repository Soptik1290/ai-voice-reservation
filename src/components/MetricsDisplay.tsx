"use client";

import { UsageMetrics } from "@/types";
import { Clock, Coins, Hash } from "lucide-react";
import { cn } from "@/lib/utils";

interface MetricsDisplayProps {
    metrics: UsageMetrics;
    provider: "openai" | "gemini" | "openai-realtime" | "gemini-live";
}

export function MetricsDisplay({ metrics, provider }: MetricsDisplayProps) {
    const getAccentClass = () => {
        switch (provider) {
            case "openai": return "text-emerald-400";
            case "openai-realtime": return "text-purple-400";
            case "gemini": return "text-blue-400";
            case "gemini-live": return "text-cyan-400";
            default: return "text-emerald-400";
        }
    };

    const getBgClass = () => {
        switch (provider) {
            case "openai": return "bg-emerald-500/10 border-emerald-500/20";
            case "openai-realtime": return "bg-purple-500/10 border-purple-500/20";
            case "gemini": return "bg-blue-500/10 border-blue-500/20";
            case "gemini-live": return "bg-cyan-500/10 border-cyan-500/20";
            default: return "bg-emerald-500/10 border-emerald-500/20";
        }
    };

    const accentClass = getAccentClass();
    const bgClass = getBgClass();

    return (
        <div className={cn(
            "flex flex-wrap items-center justify-center gap-4 p-3 rounded-xl border backdrop-blur-sm",
            bgClass
        )}>
            {/* Duration */}
            <div className="flex items-center gap-2">
                <Clock className={cn("w-4 h-4", accentClass)} />
                <div className="text-sm">
                    <span className="text-muted-foreground">Čas: </span>
                    <span className="font-medium">
                        {metrics.durationMs < 1000
                            ? `${metrics.durationMs}ms`
                            : `${(metrics.durationMs / 1000).toFixed(2)}s`
                        }
                    </span>
                </div>
            </div>

            {/* Tokens */}
            {metrics.tokensTotal !== undefined && metrics.tokensTotal > 0 && (
                <div className="flex items-center gap-2">
                    <Hash className={cn("w-4 h-4", accentClass)} />
                    <div className="text-sm">
                        <span className="text-muted-foreground">Tokeny: </span>
                        <span className="font-medium">{metrics.tokensTotal.toLocaleString()}</span>
                        {metrics.tokensInput !== undefined && metrics.tokensOutput !== undefined && (
                            <span className="text-xs text-muted-foreground ml-1">
                                ({metrics.tokensInput}↓ {metrics.tokensOutput}↑)
                            </span>
                        )}
                    </div>
                </div>
            )}

            {/* Cost */}
            {metrics.estimatedCostUsd !== undefined && metrics.estimatedCostUsd > 0 && (
                <div className="flex items-center gap-2">
                    <Coins className={cn("w-4 h-4", accentClass)} />
                    <div className="text-sm">
                        <span className="text-muted-foreground">Cena: </span>
                        <span className="font-medium">
                            ${metrics.estimatedCostUsd < 0.001
                                ? "<0.001"
                                : metrics.estimatedCostUsd.toFixed(4)
                            }
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
}
