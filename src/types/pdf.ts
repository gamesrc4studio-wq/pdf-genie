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
  activityId?: string;
  fileName: string;
  pageCount: number;
  wordCount: number;
  chunks: string[];
  summary: string;
  simpleExplanation: string;
  keyPoints: string[];
  terms: TermItem[];
}

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  totalDocsAnalyzed: number;
  totalQuizzesCompleted: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export interface SavedActivity {
  id: string;
  userId: string;
  fileName: string;
  pageCount: number;
  wordCount: number;
  chunks: string[];
  summary: string;
  simpleExplanation: string;
  keyPoints: string[];
  terms: TermItem[];
  chatHistory: ChatMessage[];
  quizQuestions: QuizQuestion[];
  lastQuizScore: number;
  lastQuizTotal: number;
  createdAtMs: number;
  updatedAtMs: number;
}

export type WorkspaceTab = "summary" | "chat" | "quiz" | "terms";

export type AppView = "studio" | "activity" | "auth";

export interface ExtractionProgress {
  stage: "reading" | "analyzing";
  currentPage: number;
  totalPages: number;
  percent: number;
  label: string;
}
