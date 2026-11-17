import type { ChatMessage, DocumentAnalysis, QuizQuestion, TermItem } from "../types/pdf";

async function parseJsonResponse<T>(response: Response): Promise<T> {
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const err = new Error(
      (data as { error?: string }).error || `Request failed (${response.status})`
    ) as Error & { code?: string; status?: number };
    err.code = (data as { code?: string }).code;
    err.status = response.status;
    throw err;
  }
  return data as T;
}

export async function analyzePdfChunks(payload: {
  fileName: string;
  pageCount: number;
  wordCount: number;
  chunks: string[];
}): Promise<DocumentAnalysis> {
  const response = await fetch("/api/analyze", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await parseJsonResponse<{
    sessionId: string;
    summary: string;
    simpleExplanation: string;
    keyPoints: string[];
    terms: TermItem[];
  }>(response);

  return {
    sessionId: data.sessionId,
    fileName: payload.fileName,
    pageCount: payload.pageCount,
    wordCount: payload.wordCount,
    chunks: payload.chunks,
    summary: data.summary,
    simpleExplanation: data.simpleExplanation,
    keyPoints: data.keyPoints,
    terms: data.terms,
  };
}

async function restoreSession(doc: DocumentAnalysis): Promise<string> {
  const response = await fetch("/api/session/restore", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: doc.sessionId,
      fileName: doc.fileName,
      pageCount: doc.pageCount,
      wordCount: doc.wordCount,
      chunks: doc.chunks,
    }),
  });
  const data = await parseJsonResponse<{ sessionId: string }>(response);
  return data.sessionId;
}

export async function askPdfQuestion(
  doc: DocumentAnalysis,
  question: string,
  history: ChatMessage[]
): Promise<string> {
  const callChat = async (sessionId: string) => {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        question,
        history: history.map((m) => ({ role: m.role, text: m.text })),
      }),
    });
    return parseJsonResponse<{ answer: string }>(response);
  };

  try {
    const res = await callChat(doc.sessionId);
    return res.answer;
  } catch (error) {
    const err = error as { code?: string };
    if (err.code === "SESSION_EXPIRED") {
      const restoredId = await restoreSession(doc);
      const res = await callChat(restoredId);
      return res.answer;
    }
    throw error;
  }
}

export async function generatePdfQuiz(doc: DocumentAnalysis): Promise<QuizQuestion[]> {
  const callQuiz = async (sessionId: string) => {
    const response = await fetch("/api/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    return parseJsonResponse<{ questions: QuizQuestion[] }>(response);
  };

  try {
    const res = await callQuiz(doc.sessionId);
    return res.questions;
  } catch (error) {
    const err = error as { code?: string };
    if (err.code === "SESSION_EXPIRED") {
      const restoredId = await restoreSession(doc);
      const res = await callQuiz(restoredId);
      return res.questions;
    }
    throw error;
  }
}
