# AI Voice Reservation

An AI-powered voice-to-reservation tool that compares real-time AI voice models from OpenAI and Google Gemini. Speak a reservation command in Czech, and the AI extracts structured data.

## 🚀 Features

- **Voice Recording:** Real-time audio recording with waveform visualization
- **File Upload:** Support for MP3, WAV, WebM, and OGG audio files for testing
- **Dual AI Comparison:** Switch between OpenAI and Google Gemini to compare results
- **Czech Language Optimization:** Specifically tuned prompts for Czech language recognition
- **Automatic Data Extraction:** AI parses spoken commands into structured reservation data
- **Local Storage:** Save and manage reservations in browser localStorage

## 🛠️ Tech Stack

- **Framework:** Next.js 16.1.1 (App Router, Turbopack)
- **UI/Styling:** Tailwind CSS 4.x, Custom Shadcn-style components
- **AI Integration:** 
  - OpenAI Whisper (transcription) + GPT-4o-mini (extraction)
  - Google Gemini 2.0 Flash (audio understanding + extraction)
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

## 🇨🇿 Czech Language Support

Since Czech can be confused with Polish by AI models, I implemented several optimizations:

### OpenAI Whisper
```typescript
formData.append("language", "cs");
formData.append("prompt", "Toto je nahrávka v českém jazyce. Rezervace, termín, klient, pondělí, úterý, středa...");
```
- **Language parameter:** Forces Czech (`cs`) language detection
- **Prompt parameter:** Provides context with common Czech words (days, months, "rezervace", "termín") to help Whisper understand the domain

### Google Gemini
```typescript
text: `DŮLEŽITÉ: Toto audio je v ČESKÉM jazyce (čeština, Czech language, NOT Polish).
Česká slova která mohou zaznít: rezervace, termín, pondělí, úterý...
Česká jména: Novák, Svoboda, Dvořák, Černý, Procházka...`
```
- **Explicit language instruction:** Clear statement that audio is Czech, NOT Polish
- **Word hints:** Common Czech reservation terms and day names
- **Name hints:** Typical Czech surnames to help with client name recognition

## 🧠 How It Works

1. **Audio Input:** User records via microphone or uploads an audio file
2. **Provider Selection:** Choose between OpenAI or Gemini for processing
3. **Transcription:**
   - **OpenAI:** Whisper API transcribes audio → GPT-4o-mini extracts reservation data
   - **Gemini:** Gemini 2.0 Flash handles both transcription and extraction in one call
4. **Data Extraction:** AI parses the text into structured JSON:
   ```json
   {
     "clientName": "Jan Novák",
     "date": "2026-01-20",
     "time": "14:00",
     "notes": ""
   }
   ```
5. **User Review:** Edit extracted data if needed and save to localStorage

## 📁 Project Structure

```
src/
├── app/
│   ├── api/transcribe/route.ts  # AI transcription API
│   ├── globals.css
│   ├── layout.tsx
│   └── page.tsx
├── components/
│   ├── ui/                      # Button, Card, Input, Switch
│   ├── ProviderSwitch.tsx       # OpenAI/Gemini toggle
│   ├── VoiceRecorder.tsx        # Recording + file upload
│   ├── ReservationCard.tsx      # Extracted data display
│   └── ReservationList.tsx      # Saved reservations
└── types/index.ts
```

## 🔮 Future Improvements

- **Real-time streaming:** Use WebSocket for live transcription during recording
- **Database storage:** Replace localStorage with PostgreSQL/SQLite
- **Multi-language support:** Add language selector for other languages
- **Response time comparison:** Display latency metrics for both providers
