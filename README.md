# PDF GENIUS – AI PDF Summarizer

Full-stack AI document workspace built with React, Vite, PDF.js, Express, `@google/genai` (Gemini API), and Firebase (Authentication & Cloud Firestore).

## Why GitHub / GitHub Pages Alone Shows Errors

1. **Opening `index.html` directly in a browser or on raw GitHub** does not compile TypeScript/JSX (`/src/main.tsx`). The app must be built or served through Vite/Node.js.
2. **GitHub Pages is static-only**: PDF GENIUS uses a Node.js/Express backend (`server.ts`) to keep your `GEMINI_API_KEY` secure on the server and serve `/api/analyze`, `/api/chat`, and `/api/quiz`. Static hosts like GitHub Pages do not run Node.js backends.

## Running Locally from Git / GitHub

Requirements: **Node.js 22.6+** (or use `npm run dev` via `tsx`) and a **Gemini API key** from Google AI Studio.

1. **Clone & install dependencies**
   ```bash
   git clone <your-repo-url>
   cd <your-repo-folder>
   npm install
   ```

2. **Create `.env` from `.env.example`**
   ```bash
   cp .env.example .env
   ```
   Set your Gemini API key inside `.env`:
   ```env
   GEMINI_API_KEY="your-gemini-api-key"
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.

4. **Production build & start**
   ```bash
   npm run build
   NODE_ENV=production npm start
   ```

## Deploying Outside AI Studio (Cloud Run, Render, Railway, etc.)

- Deploy as a **Node.js Web Service** (Build command: `npm install && npm run build`, Start command: `NODE_ENV=production npm start`).
- Add `GEMINI_API_KEY` as a server environment variable.
- In **Firebase Console → Authentication → Settings → Authorized domains**, add your deployed domain so Google Sign-In works on that host.
