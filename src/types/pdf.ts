export interface TermItem {
  term: string;
  explanation: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "model";
  text: string;
}

export interface DocumentAnalysis {
  sessionId: string;
  fileName: string;
  pageCount: number;
  wordCount: number;
  chunks: string[];
  summary: string;
  simpleExplanation: string;
  keyPoints: string[];
  terms: TermItem[];
}

export type WorkspaceTab = "summary" | "chat" | "quiz" | "terms";

export interface ExtractionProgress {
  stage: "reading" | "analyzing";
  currentPage: number;
  totalPages: number;
  percent: number;
  label: string;
}
