# AI Voice Reservation

An AI-powered voice-to-reservation tool that compares 4 real-time AI voice models from OpenAI and Google. Speak a reservation command in Czech, and the AI extracts structured data.

## 🚀 Features

- **4 AI Providers:** Compare OpenAI Standard, OpenAI Realtime, Gemini Standard, and Gemini Live.
- **Voice Recording:** Real-time audio recording with waveform visualization.
- **File Upload:** Support for MP3, WAV, WebM, and OGG audio files.
- **Live Streaming:** WebRTC (OpenAI Realtime) and WebSocket (Gemini Live) for instant transcription.
- **Performance Metrics:** Real-time tracking of processing time, token usage, and estimated cost.
- **Czech Language Optimization:** Specifically tuned prompts for accurate Czech recognition.
- **Data Extraction:** AI parses spoken commands into structured reservation data.

## 🛠️ Tech Stack

- **Framework:** Next.js 16.1.1 (App Router, Turbopack)
- **UI/Styling:** Tailwind CSS 4.x, Custom Shadcn-style components
- **AI Integration:** 
  - **OpenAI Standard:** Whisper API + GPT-4o-mini
  - **OpenAI Realtime:** WebRTC streaming (`gpt-4o-realtime-preview`)
  - **Gemini Standard:** Gemini 2.0 Flash (REST)
  - **Gemini Live:** WebSocket streaming (`gemini-2.0-flash-exp`)
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
   Create a `.env.local` file:
   ```env
   OPENAI_API_KEY=sk-proj-....
   GOOGLE_AI_API_KEY=....
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000)

## 📊 Provider Comparison

| Provider | Type | Latency | Best For |
|----------|------|---------|----------|
| OpenAI | Batch | ~2-3s | Accurate transcription |
| OpenAI Realtime | Live | ~200ms | Instant response |
| Gemini | Batch | ~1-2s | Cost-effective |
| Gemini Live | Live | ~300ms | Bidirectional streaming |

## 🇨🇿 Czech Language Support

All providers are optimized for Czech with explicit language hints to avoid confusion with Polish.

## 📁 Project Structure

```
src/
├── app/api/
│   ├── transcribe/         # Standard transcription
│   ├── realtime/session/   # OpenAI Realtime tokens
│   └── gemini/key/         # Gemini Live key
├── components/
│   ├── VoiceRecorder.tsx       # Standard mode
│   ├── RealtimeRecorder.tsx    # OpenAI Realtime
│   ├── GeminiLiveRecorder.tsx  # Gemini Live
│   ├── MetricsDisplay.tsx      # Usage stats
│   └── ProviderSwitch.tsx      # 4-way toggle
└── types/index.ts              # Types & pricing
```
