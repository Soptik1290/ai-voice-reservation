import { NextResponse } from "next/server";

// This endpoint creates an ephemeral token for the Realtime API
// The token is short-lived and safe to use in the browser
export async function POST() {
    const apiKey = process.env.OPENAI_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "OPENAI_API_KEY not configured" },
            { status: 500 }
        );
    }

    try {
        const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                model: "gpt-4o-realtime-preview",
                voice: "alloy",
                instructions: `Jsi asistent pro vytváření rezervací. Uživatel ti řekne rezervaci v češtině.
Tvým úkolem je:
1. Přepsat co uživatel říká
2. Extrahovat data rezervace: jméno klienta, datum, čas, poznámky

Odpovídej stručně v češtině. Když máš všechna data, řekni je ve formátu:
"Rezervace pro [jméno] na [datum] v [čas]"

Dnešní datum je ${new Date().toISOString().split("T")[0]}.
Pokud uživatel řekne den v týdnu (pondělí, úterý...), převeď ho na konkrétní datum.`,
            }),
        });

        if (!response.ok) {
            const error = await response.text();
            console.error("Failed to create session:", error);
            return NextResponse.json(
                { error: "Failed to create realtime session" },
                { status: 500 }
            );
        }

        const data = await response.json();

        return NextResponse.json({
            client_secret: data.client_secret,
            session_id: data.id,
        });
    } catch (error) {
        console.error("Error creating realtime session:", error);
        return NextResponse.json(
            { error: "Failed to create realtime session" },
            { status: 500 }
        );
    }
}
