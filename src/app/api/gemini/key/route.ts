import { NextResponse } from "next/server";

// This endpoint returns the API key for client-side WebSocket connection
// In production, use ephemeral tokens instead
export async function GET() {
    const apiKey = process.env.GOOGLE_AI_API_KEY;

    if (!apiKey) {
        return NextResponse.json(
            { error: "GOOGLE_AI_API_KEY not configured" },
            { status: 500 }
        );
    }

    // WARNING: In production, generate ephemeral tokens instead
    // This is for development only
    return NextResponse.json({ key: apiKey });
}
