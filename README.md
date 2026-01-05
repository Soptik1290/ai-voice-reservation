# AI Voice Reservation

An AI-powered voice-to-reservation tool that compares real-time AI voice models from OpenAI and Google Gemini. Speak a reservation command in Czech, and the AI extracts structured data.

## 🚀 Features

- **Voice Recording:** Real-time audio recording with waveform visualization.
- **File Upload:** Support for MP3, WAV, WebM, and OGG audio files for testing.
- **OpenAI Realtime (WebRTC):** Live audio streaming with instant transcription and response.
- **Provider Comparison:** Easily switch between OpenAI (Standard), OpenAI (Realtime), and Google Gemini.
- **Performance Metrics:** Real-time tracking of processing time, token usage (input/output), and estimated cost in USD.
- **Czech Language Optimization:** Specifically tuned prompts for Czech language recognition.
- **Automatic Data Extraction:** AI parses spoken commands into structured reservation data.
- **Local Storage:** Save and manage reservations in browser localStorage.

## 🛠️ Tech Stack

- **Framework:** Next.js 16.1.1 (App Router, Turbopack)
- **UI/Styling:** Tailwind CSS 4.x, Custom Shadcn-style components
- **AI Integration:** 
  - **OpenAI Realtime API:** WebRTC-based low-latency streaming (`gpt-4o-realtime-preview`).
  - **OpenAI Standard:** Whisper API (transcription) + GPT-4o-mini (extraction).
  - **Google Gemini:** Gemini 2.0 Flash (native audio understanding + extraction).
- **Language:** TypeScript, React 19.2.3

## 📦 How to Run

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Soptik1290/ai-voice-reservation.git
   cd ai-voice-reservation
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Set up Environment Variables:**
   Create a `.env.local` file in the root directory:
   ```env
   OPENAI_API_KEY=sk-proj-....
   GOOGLE_AI_API_KEY=....
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

## 📊 Performance & Cost Tracking

The app automatically calculates metrics for every request:
- **Duration:** Total time from recording end to structured data extraction.
- **Tokens:** Exact count of input and output tokens returned by the APIs.
- **Estimated Cost:** Real-time cost calculation based on current pricing (GPT-4o-mini, Realtime audio/text tokens, Whisper per-minute rate).

## 🇨🇿 Czech Language Support

Since Czech can be confused with Polish by AI models, several optimizations are implemented:
- **Whisper Prompting:** Specific Czech context words (days, months, domain terms) are sent to Whisper.
- **Realtime Instructions:** Explicit "Czech, NOT Polish" instructions sent to the Realtime session.
- **Gemini Hints:** Surnames and day names provided to Gemini to improve entity recognition.

## 📁 Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── transcribe/route.ts   # Standard transcription API
│   │   └── realtime/session/route.ts # Realtime session helper
│   ├── page.tsx                  # Main App Dashboard
│   └── layout.tsx
├── components/
│   ├── VoiceRecorder.tsx         # Standard Recording & Upload
│   ├── RealtimeRecorder.tsx      # WebRTC Streaming Component
│   ├── MetricsDisplay.tsx        # Usage & Cost Component
│   ├── ProviderSwitch.tsx        # Provider Toggle
│   └── ReservationCard/List.tsx  # Data Management
└── types/index.ts                # Type definitions & Pricing
```
