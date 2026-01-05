"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { AIProvider, TranscriptionResult } from "@/types";
import { Mic, Square, Loader2, Upload, FileAudio } from "lucide-react";
import { cn } from "@/lib/utils";

interface VoiceRecorderProps {
    provider: AIProvider;
    onTranscription: (result: TranscriptionResult) => void;
    isProcessing: boolean;
    setIsProcessing: (value: boolean) => void;
}

export function VoiceRecorder({
    provider,
    onTranscription,
    isProcessing,
    setIsProcessing
}: VoiceRecorderProps) {
    const [isRecording, setIsRecording] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const analyserRef = useRef<AnalyserNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);

    const updateAudioLevel = useCallback(() => {
        if (analyserRef.current) {
            const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
            analyserRef.current.getByteFrequencyData(dataArray);
            const average = dataArray.reduce((a, b) => a + b) / dataArray.length;
            setAudioLevel(average / 255);
        }
        if (isRecording) {
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
    }, [isRecording]);

    useEffect(() => {
        if (isRecording) {
            animationFrameRef.current = requestAnimationFrame(updateAudioLevel);
        }
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
        };
    }, [isRecording, updateAudioLevel]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Setup audio analyser for visualization
            const audioContext = new AudioContext();
            const source = audioContext.createMediaStreamSource(stream);
            const analyser = audioContext.createAnalyser();
            analyser.fftSize = 256;
            source.connect(analyser);
            analyserRef.current = analyser;

            const mediaRecorder = new MediaRecorder(stream);
            mediaRecorderRef.current = mediaRecorder;
            audioChunksRef.current = [];

            mediaRecorder.ondataavailable = (event) => {
                if (event.data.size > 0) {
                    audioChunksRef.current.push(event.data);
                }
            };

            mediaRecorder.onstop = async () => {
                const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
                stream.getTracks().forEach(track => track.stop());
                await processAudio(audioBlob);
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error("Error starting recording:", error);
            alert("Nelze přistoupit k mikrofonu. Zkontrolujte oprávnění.");
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setAudioLevel(0);
        }
    };

    const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setSelectedFile(file);
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) return;
        await processAudio(selectedFile);
        setSelectedFile(null);
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    const processAudio = async (audioBlob: Blob) => {
        setIsProcessing(true);

        try {
            const formData = new FormData();
            formData.append("audio", audioBlob);
            formData.append("provider", provider);

            const response = await fetch("/api/transcribe", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error("Chyba při zpracování audia");
            }

            const result = await response.json();
            onTranscription(result);
        } catch (error) {
            console.error("Error processing audio:", error);
            alert("Chyba při zpracování audia. Zkontrolujte API klíče.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="flex flex-col items-center gap-6">
            {/* Microphone Recording */}
            <div className="relative">
                {/* Pulsing rings animation */}
                {isRecording && (
                    <>
                        <div
                            className="absolute inset-0 rounded-full bg-red-500/20 animate-ping"
                            style={{
                                transform: `scale(${1 + audioLevel * 0.5})`,
                                animationDuration: "1.5s"
                            }}
                        />
                        <div
                            className="absolute inset-0 rounded-full bg-red-500/10"
                            style={{
                                transform: `scale(${1.2 + audioLevel * 0.8})`,
                                transition: "transform 0.1s ease-out"
                            }}
                        />
                    </>
                )}

                <Button
                    size="lg"
                    onClick={isRecording ? stopRecording : startRecording}
                    disabled={isProcessing}
                    className={cn(
                        "relative w-24 h-24 rounded-full transition-all duration-300",
                        isRecording
                            ? "bg-gradient-to-r from-red-500 to-rose-500 hover:from-red-600 hover:to-rose-600 shadow-lg shadow-red-500/50"
                            : provider === "openai"
                                ? "bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 shadow-lg shadow-emerald-500/30"
                                : "bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-600 hover:to-indigo-600 shadow-lg shadow-blue-500/30"
                    )}
                >
                    {isProcessing ? (
                        <Loader2 className="w-10 h-10 animate-spin" />
                    ) : isRecording ? (
                        <Square className="w-8 h-8" />
                    ) : (
                        <Mic className="w-10 h-10" />
                    )}
                </Button>
            </div>

            <p className="text-sm text-muted-foreground text-center">
                {isProcessing
                    ? "Zpracovávám..."
                    : isRecording
                        ? "Nahrávám... Klikněte pro zastavení"
                        : "Klikněte pro nahrávání"}
            </p>

            {isRecording && (
                <div className="flex items-center gap-1">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="w-1 rounded-full bg-gradient-to-t from-red-500 to-rose-400 transition-all duration-75"
                            style={{
                                height: `${Math.random() * audioLevel * 40 + 4}px`,
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Divider */}
            <div className="flex items-center gap-4 w-full max-w-xs">
                <div className="flex-1 h-px bg-border" />
                <span className="text-xs text-muted-foreground">nebo</span>
                <div className="flex-1 h-px bg-border" />
            </div>

            {/* File Upload */}
            <div className="flex flex-col items-center gap-3">
                <input
                    ref={fileInputRef}
                    type="file"
                    accept="audio/mp3,audio/mpeg,audio/wav,audio/webm,audio/ogg,.mp3,.wav,.webm,.ogg"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="audio-upload"
                />
                <label
                    htmlFor="audio-upload"
                    className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-lg border-2 border-dashed cursor-pointer transition-all",
                        "border-border hover:border-primary/50 hover:bg-accent/50",
                        selectedFile && "border-primary bg-primary/10"
                    )}
                >
                    <Upload className="w-4 h-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">
                        {selectedFile ? selectedFile.name : "Nahrát audio soubor"}
                    </span>
                </label>

                {selectedFile && (
                    <div className="flex items-center gap-2">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <FileAudio className="w-4 h-4" />
                            <span>{(selectedFile.size / 1024 / 1024).toFixed(2)} MB</span>
                        </div>
                        <Button
                            size="sm"
                            onClick={handleFileUpload}
                            disabled={isProcessing}
                            className={provider === "openai"
                                ? "bg-emerald-500 hover:bg-emerald-600"
                                : "bg-blue-500 hover:bg-blue-600"
                            }
                        >
                            {isProcessing ? (
                                <Loader2 className="w-4 h-4 animate-spin mr-1" />
                            ) : (
                                <Upload className="w-4 h-4 mr-1" />
                            )}
                            Zpracovat
                        </Button>
                    </div>
                )}

                <p className="text-xs text-muted-foreground">
                    Podporované formáty: MP3, WAV, WebM, OGG
                </p>
            </div>
        </div>
    );
}
