import "dotenv/config";
import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express, { type Request, type Response } from "express";
import { GoogleGenAI, ThinkingLevel, Type } from "@google/genai";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const MODEL_NAME = "gemini-4-hydrogen";

interface DocumentSession {
  id: string;
  fileName: string;
  pageCount: number;
  wordCount: number;
  chunks: string[];
  createdAt: number;
}

const sessions = new Map<string, DocumentSession>();
const MAX_SESSIONS = 25;

function saveSession(session: DocumentSession): void {
  if (sessions.size >= MAX_SESSIONS) {
    const oldestKey = sessions.keys().next().value;
    if (oldestKey) sessions.delete(oldestKey);
  }
  sessions.set(session.id, session);
}

function getGenAIClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    const err = new Error(
      "Gemini API key is not configured. Please verify GEMINI_API_KEY in Settings > Secrets."
    ) as Error & { status?: number; code?: string };
    err.status = 503;
    err.code = "MISSING_API_KEY";
    throw err;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

function formatGeminiError(error: unknown): { status: number; message: string; code?: string } {
  const errObj = error as { status?: number; code?: string; message?: string };
  const rawMessage = errObj?.message || "An unexpected error occurred while contacting Gemini.";
  const upper = rawMessage.toUpperCase();

  if (errObj?.code === "MISSING_API_KEY") {
    return { status: 503, message: rawMessage, code: "MISSING_API_KEY" };
  }
  if (upper.includes("API_KEY_INVALID") || upper.includes("PERMISSION_DENIED") || errObj?.status === 403) {
    return {
      status: 403,
      message: "Gemini API key was rejected. Please check your key in the Settings > Secrets panel.",
      code: "AUTH_ERROR",
    };
  }
  if (upper.includes("RESOURCE_EXHAUSTED") || errObj?.status === 429) {
    return {
      status: 429,
      message: "Rate limit reached. Please wait a few seconds and try again.",
      code: "RATE_LIMIT",
    };
  }
  if (errObj?.status === 400 || upper.includes("INVALID_ARGUMENT")) {
    return {
      status: 400,
      message: "The document request could not be processed. Try uploading a shorter or cleaner PDF.",
      code: "BAD_REQUEST",
    };
  }
  return {
    status: errObj?.status && errObj.status >= 400 ? errObj.status : 500,
    message: rawMessage,
  };
}

async function withRetry<T>(fn: () => Promise<T>, maxRetries = 2): Promise<T> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const msg = String((error as Error)?.message || "").toUpperCase();
      const status = (error as { status?: number })?.status;
      const isTransient = status === 429 || status === 503 || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("UNAVAILABLE");
      if (!isTransient || attempt === maxRetries) {
        throw error;
      }
      const delayMs = 800 * Math.pow(2, attempt);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  throw lastError;
}

function selectRelevantChunks(chunks: string[], question: string, maxChars = 32000): string {
  if (chunks.length === 0) return "";
  const combinedLength = chunks.reduce((acc, c) => acc + c.length, 0);
  if (combinedLength <= maxChars) {
    return chunks.join("\n\n---\n\n");
  }

  const terms = question
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2);

  const scored = chunks.map((chunk, index) => {
    const lower = chunk.toLowerCase();
    let score = index === 0 ? 1 : 0; // slight preference for intro context
    for (const term of terms) {
      if (lower.includes(term)) {
        score += 3;
      }
    }
    return { chunk, index, score };
  });

  scored.sort((a, b) => b.score - a.score || a.index - b.index);

  const picked: { index: number; chunk: string }[] = [];
  let runningChars = 0;
  for (const item of scored) {
    if (runningChars + item.chunk.length > maxChars && picked.length > 0) continue;
    picked.push({ index: item.index, chunk: item.chunk });
    runningChars += item.chunk.length;
  }

  picked.sort((a, b) => a.index - b.index);
  return picked.map((p) => p.chunk).join("\n\n---\n\n");
}

function buildContextExcerpt(chunks: string[], maxChars = 36000): string {
  let out = "";
  for (const chunk of chunks) {
    if (out.length + chunk.length > maxChars && out.length > 0) break;
    out += (out ? "\n\n---\n\n" : "") + chunk;
  }
  return out;
}

async function createServer() {
  const app = express();
  app.use(express.json({ limit: "8mb" }));

  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  // Register or restore a document session without re-analyzing
  app.post("/api/session/restore", (req: Request, res: Response) => {
    const { sessionId, fileName, pageCount, wordCount, chunks } = req.body ?? {};
    if (!Array.isArray(chunks) || chunks.length === 0) {
      res.status(400).json({ error: "Document chunks are required to restore a session." });
      return;
    }
    const id = typeof sessionId === "string" && sessionId ? sessionId : crypto.randomUUID();
    saveSession({
      id,
      fileName: typeof fileName === "string" ? fileName : "document.pdf",
      pageCount: Number(pageCount) || 1,
      wordCount: Number(wordCount) || 0,
      chunks: chunks.slice(0, 40).map((c) => String(c).slice(0, 12000)),
      createdAt: Date.now(),
    });
    res.json({ sessionId: id });
  });

  // Analyze PDF chunks -> Summary, Simple Explanation, 5-10 Key Points, Important Terms
  app.post("/api/analyze", async (req: Request, res: Response) => {
    try {
      const { fileName, pageCount, wordCount, chunks } = req.body ?? {};
      if (!Array.isArray(chunks) || chunks.length === 0) {
        res.status(400).json({ error: "No extracted PDF text chunks were provided." });
        return;
      }

      const sanitizedChunks = chunks
        .map((c: unknown) => String(c || "").trim())
        .filter((c: string) => c.length > 0)
        .slice(0, 40);

      if (sanitizedChunks.length === 0) {
        res.status(400).json({ error: "The uploaded PDF did not contain readable text." });
        return;
      }

      const ai = getGenAIClient();

      // Step 1: If the PDF is long (> 3 chunks), summarize chunks in manageable batches first
      let workingMaterial = "";
      if (sanitizedChunks.length <= 3) {
        workingMaterial = sanitizedChunks.join("\n\n---\n\n").slice(0, 38000);
      } else {
        const chunkSlices = sanitizedChunks.slice(0, 10);
        const chunkSummaries = await Promise.all(
          chunkSlices.map((chunk, idx) =>
            withRetry(async () => {
              const resp = await ai.models.generateContent({
                model: MODEL_NAME,
                contents: `Summarize the core facts, definitions, and key claims from this section (Part ${idx + 1} of ${chunkSlices.length}) of "${fileName || "PDF Document"}" in 4-6 concise bullet points. Keep all important technical terms and numbers intact.\n\n${chunk}`,
                config: {
                  thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
                },
              });
              return `Section ${idx + 1} Notes:\n${(resp.text ?? "").trim()}`;
            })
          )
        );
        workingMaterial = chunkSummaries.join("\n\n");
      }

      // Step 2: Structured synthesis into Summary + Simple Explanation + 5-10 Key Points + Important Terms
      const analysisResponse = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: `Analyze the following document "${fileName || "Uploaded PDF"}" (${pageCount || 1} pages) and produce a thorough, student-friendly study breakdown strictly grounded in the text.\n\nDOCUMENT CONTENT:\n${workingMaterial}`,
          config: {
            systemInstruction:
              "You are PDF GENIUS, an expert academic and editorial study assistant. Base every single statement strictly on the provided document content. Write clearly, accurately, and concisely.",
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                summary: {
                  type: Type.STRING,
                  description:
                    "A crisp, well-structured 2-to-3 paragraph executive summary covering the document's purpose, core arguments, and conclusions.",
                },
                simpleExplanation: {
                  type: Type.STRING,
                  description:
                    "A friendly, jargon-free explanation in simple everyday English (3-5 sentences) as if explaining the big idea to a friend.",
                },
                keyPoints: {
                  type: Type.ARRAY,
                  items: { type: Type.STRING },
                  description:
                    "Between 6 and 9 important takeaways extracted directly from the PDF. Each point should be 1-2 clear sentences.",
                },
                terms: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      term: {
                        type: Type.STRING,
                        description: "An important concept, term, or acronym from the PDF.",
                      },
                      explanation: {
                        type: Type.STRING,
                        description: "A clear explanation of the term in simple English (1-2 sentences).",
                      },
                    },
                    required: ["term", "explanation"],
                  },
                  description: "Between 6 and 8 important concepts/terms found in the document.",
                },
              },
              required: ["summary", "simpleExplanation", "keyPoints", "terms"],
            },
          },
        })
      );

      const parsed = JSON.parse((analysisResponse.text ?? "{}").trim());

      const sessionId = crypto.randomUUID();
      saveSession({
        id: sessionId,
        fileName: typeof fileName === "string" ? fileName : "document.pdf",
        pageCount: Number(pageCount) || 1,
        wordCount: Number(wordCount) || 0,
        chunks: sanitizedChunks,
        createdAt: Date.now(),
      });

      res.json({
        sessionId,
        summary: String(parsed.summary || ""),
        simpleExplanation: String(parsed.simpleExplanation || ""),
        keyPoints: Array.isArray(parsed.keyPoints) ? parsed.keyPoints.slice(0, 10) : [],
        terms: Array.isArray(parsed.terms) ? parsed.terms.slice(0, 10) : [],
      });
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
    }
  });

  // Ask Your PDF: Grounded Q&A using stored session chunks (avoids re-sending full PDF)
  app.post("/api/chat", async (req: Request, res: Response) => {
    try {
      const { sessionId, question, history } = req.body ?? {};
      if (!sessionId || typeof sessionId !== "string") {
        res.status(400).json({ error: "Missing document session ID." });
        return;
      }
      const session = sessions.get(sessionId);
      if (!session) {
        res.status(404).json({
          error: "Document session expired. Restoring your document context...",
          code: "SESSION_EXPIRED",
        });
        return;
      }
      if (!question || typeof question !== "string" || !question.trim()) {
        res.status(400).json({ error: "Please enter a question about your PDF." });
        return;
      }

      const relevantContext = selectRelevantChunks(session.chunks, question);
      const recentHistory = Array.isArray(history)
        ? history
            .slice(-6)
            .map((m: { role?: string; text?: string }) => `${m.role === "user" ? "User" : "Assistant"}: ${String(m.text || "").slice(0, 600)}`)
            .join("\n")
        : "";

      const ai = getGenAIClient();
      const response = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: `DOCUMENT ("${session.fileName}", ${session.pageCount} pages):\n${relevantContext}\n\n${
            recentHistory ? `RECENT CONVERSATION:\n${recentHistory}\n\n` : ""
          }USER QUESTION:\n${question.trim()}`,
          config: {
            systemInstruction:
              "You are PDF GENIUS answering questions strictly from the uploaded PDF excerpts. Cite page numbers (e.g., Page 2) when helpful. If the answer is not explicitly present in the provided PDF excerpts, clearly state: 'This information is not available in the uploaded PDF.' Never fabricate facts or rely on outside assumptions when the document does not mention them.",
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          },
        })
      );

      res.json({
        answer: (response.text ?? "").trim() || "I could not generate an answer from the document.",
      });
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
    }
  });

  // AI Quiz: Generate 5 MCQs with 4 options each from stored session
  app.post("/api/quiz", async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.body ?? {};
      if (!sessionId || typeof sessionId !== "string") {
        res.status(400).json({ error: "Missing document session ID." });
        return;
      }
      const session = sessions.get(sessionId);
      if (!session) {
        res.status(404).json({
          error: "Document session expired. Restoring your document context...",
          code: "SESSION_EXPIRED",
        });
        return;
      }

      const excerpt = buildContextExcerpt(session.chunks, 34000);
      const ai = getGenAIClient();

      const quizResponse = await withRetry(() =>
        ai.models.generateContent({
          model: MODEL_NAME,
          contents: `Create a 5-question multiple-choice comprehension quiz based strictly on "${session.fileName}". Each question must have exactly 4 answer options, one correct answer index (0 to 3), and a brief 1-sentence explanation citing the concept from the PDF.\n\nDOCUMENT:\n${excerpt}`,
          config: {
            systemInstruction:
              "You are an educational quiz creator. Generate exactly 5 distinct, fair, accurate multiple-choice questions strictly grounded in the provided document. Vary the correctIndex across 0, 1, 2, and 3.",
            thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.OBJECT,
              properties: {
                questions: {
                  type: Type.ARRAY,
                  items: {
                    type: Type.OBJECT,
                    properties: {
                      question: { type: Type.STRING },
                      options: {
                        type: Type.ARRAY,
                        items: { type: Type.STRING },
                      },
                      correctIndex: { type: Type.INTEGER },
                      explanation: { type: Type.STRING },
                    },
                    required: ["question", "options", "correctIndex", "explanation"],
                  },
                },
              },
              required: ["questions"],
            },
          },
        })
      );

      const parsed = JSON.parse((quizResponse.text ?? "{}").trim());
      const questions = Array.isArray(parsed.questions)
        ? parsed.questions
            .slice(0, 5)
            .map((q: { question?: string; options?: string[]; correctIndex?: number; explanation?: string }) => ({
              question: String(q.question || ""),
              options: Array.isArray(q.options) ? q.options.slice(0, 4).map(String) : [],
              correctIndex:
                typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex <= 3
                  ? q.correctIndex
                  : 0,
              explanation: String(q.explanation || ""),
            }))
            .filter((q: { question: string; options: string[] }) => q.question && q.options.length === 4)
        : [];

      if (questions.length === 0) {
        res.status(500).json({ error: "Could not build quiz questions from this document. Please try again." });
        return;
      }

      res.json({ questions });
    } catch (error) {
      const formatted = formatGeminiError(error);
      res.status(formatted.status).json({ error: formatted.message, code: formatted.code });
    }
  });

  if (process.env.NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, "dist");
    app.use(express.static(distDir));
    app.get("*", (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`PDF GENIUS server running at http://0.0.0.0:${PORT}`);
  });
}

createServer().catch((err) => {
  console.error("Failed to start server:", err);
  process.exit(1);
});
