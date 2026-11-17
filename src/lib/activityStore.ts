import type { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { db, handleFirestoreError, OperationType } from "./firebase";
import type {
  ChatMessage,
  DocumentAnalysis,
  QuizQuestion,
  SavedActivity,
  UserProfile,
} from "../types/pdf";

function toMillis(val: unknown): number {
  if (val instanceof Timestamp) return val.toMillis();
  return Date.now();
}

function clampString(value: string, maxLen: number, fallback = ""): string {
  const trimmed = String(value ?? "").trim();
  if (!trimmed) return fallback;
  return trimmed.slice(0, maxLen);
}

function sanitizeChunks(chunks: string[]): string[] {
  const cleaned = chunks
    .map((c) => clampString(c, 7800))
    .filter((c) => c.length > 0)
    .slice(0, 15);
  return cleaned.length > 0 ? cleaned : ["Document content unavailable."];
}

function sanitizeChatHistory(history: ChatMessage[]): ChatMessage[] {
  return history.slice(-40).map((m, idx) => ({
    id: clampString(m.id || `msg-${idx}`, 64, `msg-${idx}`),
    role: m.role === "user" ? "user" : "model",
    text: clampString(m.text, 4000, ""),
  }));
}

function sanitizeQuizQuestions(questions: QuizQuestion[]): QuizQuestion[] {
  return questions.slice(0, 5).map((q) => ({
    question: clampString(q.question, 600, "Question"),
    options: Array.isArray(q.options)
      ? q.options.slice(0, 4).map((o) => clampString(o, 400, "Option"))
      : [],
    correctIndex:
      typeof q.correctIndex === "number" && q.correctIndex >= 0 && q.correctIndex <= 3
        ? Math.floor(q.correctIndex)
        : 0,
    explanation: clampString(q.explanation, 800, ""),
  }));
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const path = `users/${user.uid}`;
  const ref = doc(db, "users", user.uid);

  let snap;
  try {
    snap = await getDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }

  if (snap.exists()) {
    const d = snap.data();
    return {
      uid: String(d.uid || user.uid),
      displayName: String(d.displayName || user.displayName || "Student"),
      email: String(d.email || user.email || ""),
      totalDocsAnalyzed: Number(d.totalDocsAnalyzed) || 0,
      totalQuizzesCompleted: Number(d.totalQuizzesCompleted) || 0,
      createdAtMs: toMillis(d.createdAt),
      updatedAtMs: toMillis(d.updatedAt),
    };
  }

  const displayName = clampString(
    user.displayName || user.email?.split("@")[0] || "PDF Genius User",
    100,
    "PDF Genius User"
  );
  const email = clampString(user.email || "user@example.com", 200, "user@example.com");

  try {
    await setDoc(ref, {
      uid: user.uid,
      displayName,
      email,
      totalDocsAnalyzed: 0,
      totalQuizzesCompleted: 0,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  return {
    uid: user.uid,
    displayName,
    email,
    totalDocsAnalyzed: 0,
    totalQuizzesCompleted: 0,
    createdAtMs: Date.now(),
    updatedAtMs: Date.now(),
  };
}

export function subscribeUserProfile(
  uid: string,
  onData: (profile: UserProfile | null) => void,
  onError: (err: Error) => void
): () => void {
  const path = `users/${uid}`;
  const ref = doc(db, "users", uid);
  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      const d = snap.data();
      onData({
        uid: String(d.uid || uid),
        displayName: String(d.displayName || "User"),
        email: String(d.email || ""),
        totalDocsAnalyzed: Number(d.totalDocsAnalyzed) || 0,
        totalQuizzesCompleted: Number(d.totalQuizzesCompleted) || 0,
        createdAtMs: toMillis(d.createdAt),
        updatedAtMs: toMillis(d.updatedAt),
      });
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function saveNewActivity(
  user: User,
  analysis: DocumentAnalysis
): Promise<string> {
  await ensureUserProfile(user);

  const activityId = crypto.randomUUID().replace(/-/g, "");
  const path = `users/${user.uid}/activities/${activityId}`;
  const ref = doc(db, "users", user.uid, "activities", activityId);

  const payload = {
    userId: user.uid,
    fileName: clampString(analysis.fileName, 255, "document.pdf"),
    pageCount: Math.max(1, Math.min(5000, Math.floor(analysis.pageCount || 1))),
    wordCount: Math.max(1, Math.min(5000000, Math.floor(analysis.wordCount || 1))),
    chunks: sanitizeChunks(analysis.chunks),
    summary: clampString(analysis.summary, 11800, "Summary generated."),
    simpleExplanation: clampString(
      analysis.simpleExplanation,
      4800,
      "Explanation generated."
    ),
    keyPoints: analysis.keyPoints
      .map((p) => clampString(p, 800))
      .filter(Boolean)
      .slice(0, 10),
    terms: analysis.terms
      .slice(0, 10)
      .map((t) => ({
        term: clampString(t.term, 150, "Term"),
        explanation: clampString(t.explanation, 600, "Explanation"),
      })),
    chatHistory: [] as ChatMessage[],
    quizQuestions: [] as QuizQuestion[],
    lastQuizScore: -1,
    lastQuizTotal: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(ref, payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  // Increment totalDocsAnalyzed on user profile
  const userPath = `users/${user.uid}`;
  const userRef = doc(db, "users", user.uid);
  try {
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const current = Number(userSnap.data().totalDocsAnalyzed) || 0;
      await updateDoc(userRef, {
        totalDocsAnalyzed: Math.min(100000, current + 1),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, userPath);
  }

  return activityId;
}

export async function updateActivityChat(
  uid: string,
  activityId: string,
  chatHistory: ChatMessage[]
): Promise<void> {
  const path = `users/${uid}/activities/${activityId}`;
  const ref = doc(db, "users", uid, "activities", activityId);
  try {
    await updateDoc(ref, {
      chatHistory: sanitizeChatHistory(chatHistory),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function updateActivityQuiz(
  uid: string,
  activityId: string,
  questions: QuizQuestion[],
  score: number,
  total: number,
  incrementCompletedCount: boolean
): Promise<void> {
  const path = `users/${uid}/activities/${activityId}`;
  const ref = doc(db, "users", uid, "activities", activityId);
  const clampedScore =
    score < 0 ? -1 : Math.max(0, Math.min(5, Math.floor(score)));
  const clampedTotal = Math.max(0, Math.min(5, Math.floor(total)));

  try {
    await updateDoc(ref, {
      quizQuestions: sanitizeQuizQuestions(questions),
      lastQuizScore: clampedScore,
      lastQuizTotal: clampedTotal,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  if (incrementCompletedCount) {
    const userPath = `users/${uid}`;
    const userRef = doc(db, "users", uid);
    try {
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const current = Number(userSnap.data().totalQuizzesCompleted) || 0;
        await updateDoc(userRef, {
          totalQuizzesCompleted: Math.min(100000, current + 1),
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, userPath);
    }
  }
}

export function subscribeUserActivities(
  uid: string,
  onData: (activities: SavedActivity[]) => void,
  onError: (err: Error) => void
): () => void {
  const path = `users/${uid}/activities`;
  const q = query(
    collection(db, "users", uid, "activities"),
    where("userId", "==", uid),
    limit(50)
  );

  return onSnapshot(
    q,
    (snapshot) => {
      const items: SavedActivity[] = snapshot.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          userId: String(d.userId || uid),
          fileName: String(d.fileName || "document.pdf"),
          pageCount: Number(d.pageCount) || 1,
          wordCount: Number(d.wordCount) || 0,
          chunks: Array.isArray(d.chunks) ? d.chunks.map(String) : [],
          summary: String(d.summary || ""),
          simpleExplanation: String(d.simpleExplanation || ""),
          keyPoints: Array.isArray(d.keyPoints) ? d.keyPoints.map(String) : [],
          terms: Array.isArray(d.terms) ? d.terms : [],
          chatHistory: Array.isArray(d.chatHistory) ? d.chatHistory : [],
          quizQuestions: Array.isArray(d.quizQuestions) ? d.quizQuestions : [],
          lastQuizScore: typeof d.lastQuizScore === "number" ? d.lastQuizScore : -1,
          lastQuizTotal: typeof d.lastQuizTotal === "number" ? d.lastQuizTotal : 0,
          createdAtMs: toMillis(d.createdAt),
          updatedAtMs: toMillis(d.updatedAt),
        };
      });

      items.sort((a, b) => b.updatedAtMs - a.updatedAtMs);
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        onError(wrapped as Error);
      }
    }
  );
}

export async function deleteUserActivity(uid: string, activityId: string): Promise<void> {
  const path = `users/${uid}/activities/${activityId}`;
  const ref = doc(db, "users", uid, "activities", activityId);
  try {
    await deleteDoc(ref);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
