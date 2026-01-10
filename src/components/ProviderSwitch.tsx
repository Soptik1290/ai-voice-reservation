"use client";

import { AIProvider } from "@/types";
import { cn } from "@/lib/utils";
import { Zap, Radio } from "lucide-react";

interface ProviderSwitchProps {
    provider: AIProvider;
    onProviderChange: (provider: AIProvider) => void;
}

export function ProviderSwitch({ provider, onProviderChange }: ProviderSwitchProps) {
    return (
        <div className="flex flex-col gap-4 p-4 rounded-2xl glass-card border border-white/10 shadow-xl">
            {/* OpenAI Group */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-emerald-400/80 w-16 text-right tracking-wide">OpenAI</span>
                <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-black/20 border border-white/5">
                    <button
                        onClick={() => onProviderChange("openai")}
                        className={cn(
                            "px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300",
                            provider === "openai"
                                ? "bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-lg shadow-emerald-500/30 scale-[1.02]"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M22.2819 9.8211a5.9847 5.9847 0 0 0-.5157-4.9108 6.0462 6.0462 0 0 0-6.5098-2.9A6.0651 6.0651 0 0 0 4.9807 4.1818a5.9847 5.9847 0 0 0-3.9977 2.9 6.0462 6.0462 0 0 0 .7427 7.0966 5.98 5.98 0 0 0 .511 4.9107 6.051 6.051 0 0 0 6.5146 2.9001A5.9847 5.9847 0 0 0 13.2599 24a6.0557 6.0557 0 0 0 5.7718-4.2058 5.9894 5.9894 0 0 0 3.9977-2.9001 6.0557 6.0557 0 0 0-.7475-7.0729zm-9.022 12.6081a4.4755 4.4755 0 0 1-2.8764-1.0408l.1419-.0804 4.7783-2.7582a.7948.7948 0 0 0 .3927-.6813v-6.7369l2.02 1.1686a.071.071 0 0 1 .038.052v5.5826a4.504 4.504 0 0 1-4.4945 4.4944zm-9.6607-4.1254a4.4708 4.4708 0 0 1-.5346-3.0137l.142.0852 4.783 2.7582a.7712.7712 0 0 0 .7806 0l5.8428-3.3685v2.3324a.0804.0804 0 0 1-.0332.0615L9.74 19.9502a4.4992 4.4992 0 0 1-6.1408-1.6464zM2.3408 7.8956a4.485 4.485 0 0 1 2.3655-1.9728V11.6a.7664.7664 0 0 0 .3879.6765l5.8144 3.3543-2.0201 1.1685a.0757.0757 0 0 1-.071 0l-4.8303-2.7865A4.504 4.504 0 0 1 2.3408 7.872zm16.5963 3.8558L13.1038 8.364l2.0201-1.1638a.0757.0757 0 0 1 .071 0l4.8303 2.7913a4.4944 4.4944 0 0 1-.6765 8.1042v-5.6772a.79.79 0 0 0-.407-.667zm2.0107-3.0231l-.142-.0852-4.7735-2.7818a.7759.7759 0 0 0-.7854 0L9.409 9.2297V6.8974a.0662.0662 0 0 1 .0284-.0615l4.8303-2.7866a4.4992 4.4992 0 0 1 6.6802 4.66zM8.3065 12.863l-2.02-1.1638a.0804.0804 0 0 1-.038-.0567V6.0742a4.4992 4.4992 0 0 1 7.3757-3.4537l-.142.0805L8.704 5.459a.7948.7948 0 0 0-.3927.6813zm1.0976-2.3654l2.602-1.4998 2.6069 1.4998v2.9994l-2.5974 1.4997-2.6067-1.4997Z" />
                            </svg>
                            Standard
                        </span>
                    </button>
                    <button
                        onClick={() => onProviderChange("openai-realtime")}
                        className={cn(
                            "px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300",
                            provider === "openai-realtime"
                                ? "bg-gradient-to-r from-purple-500 to-violet-500 text-white shadow-lg shadow-purple-500/30 scale-[1.02]"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        <span className="flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Realtime
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/20 font-semibold tracking-wide">LIVE</span>
                        </span>
                    </button>
                </div>
            </div>

            {/* Separator */}
            <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />

            {/* Gemini Group */}
            <div className="flex items-center gap-3">
                <span className="text-xs font-semibold text-blue-400/80 w-16 text-right tracking-wide">Gemini</span>
                <div className="flex items-center gap-1.5 p-1.5 rounded-xl bg-black/20 border border-white/5">
                    <button
                        onClick={() => onProviderChange("gemini")}
                        className={cn(
                            "px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300",
                            provider === "gemini"
                                ? "bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-lg shadow-blue-500/30 scale-[1.02]"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        <span className="flex items-center gap-2">
                            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M12 0C5.372 0 0 5.372 0 12s5.372 12 12 12 12-5.372 12-12S18.628 0 12 0zm0 2.4a9.6 9.6 0 110 19.2 9.6 9.6 0 010-19.2zm0 1.8a7.8 7.8 0 100 15.6 7.8 7.8 0 000-15.6zm0 2.4a5.4 5.4 0 110 10.8 5.4 5.4 0 010-10.8zm0 1.8a3.6 3.6 0 100 7.2 3.6 3.6 0 000-7.2z" />
                            </svg>
                            Standard
                        </span>
                    </button>
                    <button
                        onClick={() => onProviderChange("gemini-live")}
                        className={cn(
                            "px-4 py-2.5 rounded-lg font-medium text-sm transition-all duration-300",
                            provider === "gemini-live"
                                ? "bg-gradient-to-r from-cyan-500 to-teal-500 text-white shadow-lg shadow-cyan-500/30 scale-[1.02]"
                                : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                        )}
                    >
                        <span className="flex items-center gap-2">
                            <Radio className="w-4 h-4" />
                            Realtime
                            <span className="text-[9px] px-1.5 py-0.5 rounded-md bg-white/20 font-semibold tracking-wide">LIVE</span>
                        </span>
                    </button>
                </div>
            </div>
        </div>
    );
}
