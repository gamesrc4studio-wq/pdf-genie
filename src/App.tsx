import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { onAuthStateChanged, sendEmailVerification, signOut, type User } from "firebase/auth";
import {
  FileText,
  BookOpen,
  MessageSquare,
  HelpCircle,
  BookMarked,
  X,
  History,
  CheckCircle2,
  MailCheck,
  LogIn,
} from "lucide-react";
import { auth } from "./lib/firebase";
import {
  deleteUserActivity,
  ensureUserProfile,
  saveNewActivity,
  subscribeUserActivities,
  subscribeUserProfile,
  updateActivityChat,
  updateActivityQuiz,
} from "./lib/activityStore";
import { Navbar } from "./components/Navbar";
import { HeroUpload } from "./components/HeroUpload";
import { LandingShowcase } from "./components/LandingShowcase";
import { SummaryView } from "./components/SummaryView";
import { ChatView } from "./components/ChatView";
import { QuizView } from "./components/QuizView";
import { TermsView } from "./components/TermsView";
import { AuthView } from "./components/AuthView";
import { ActivityHistoryView } from "./components/ActivityHistoryView";
import { FourPointStar } from "./components/GeometricDecor";
import { extractPdfText, validatePdfFile } from "./lib/pdfExtractor";
import { analyzePdfChunks, generatePdfQuiz } from "./lib/apiClient";
import type {
  AppView,
  ChatMessage,
  DocumentAnalysis,
  ExtractionProgress,
  QuizQuestion,
  SavedActivity,
  UserProfile,
  WorkspaceTab,
} from "./types/pdf";

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [emailVerifiedTick, setEmailVerifiedTick] = useState(0);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [activities, setActivities] = useState<SavedActivity[]>([]);
  const [cloudNotice, setCloudNotice] = useState<string | null>(null);

  const [currentView, setCurrentView] = useState<AppView>("studio");
  const [doc, setDoc] = useState<DocumentAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("summary");
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [lastQuizScore, setLastQuizScore] = useState<number>(-1);
  const [lastQuizTotal, setLastQuizTotal] = useState<number>(0);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  const docRef = useRef<DocumentAnalysis | null>(null);
  docRef.current = doc;
  const savingPendingRef = useRef(false);

  // Listen for Firebase Auth state
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setAuthReady(true);
      if (!firebaseUser) {
        setUserProfile(null);
        setActivities([]);
      }
    });
    return unsub;
  }, []);

  // Subscribe to profile & past activities once authenticated and verified
  useEffect(() => {
    if (!authReady || !user || !user.emailVerified) {
      return;
    }

    let unsubProfile: (() => void) | undefined;
    let unsubActivities: (() => void) | undefined;
    let cancelled = false;

    ensureUserProfile(user)
      .then(() => {
        if (cancelled) return;

        unsubProfile = subscribeUserProfile(
          user.uid,
          (profile) => setUserProfile(profile),
          (err) => setError(err.message)
        );

        unsubActivities = subscribeUserActivities(
          user.uid,
          (items) => setActivities(items),
          (err) => setError(err.message)
        );

        // If the user analyzed a PDF right before signing in, save it automatically now
        const currentDoc = docRef.current;
        if (currentDoc && !currentDoc.activityId && !savingPendingRef.current) {
          savingPendingRef.current = true;
          saveNewActivity(user, currentDoc)
            .then((activityId) => {
              setDoc((prev) => (prev ? { ...prev, activityId } : prev));
              setCloudNotice("Saved your current PDF analysis to Past Activity.");
              setTimeout(() => setCloudNotice(null), 3500);
            })
            .catch(() => {
              // ignore silent auto-save failure
            })
            .finally(() => {
              savingPendingRef.current = false;
            });
        }
      })
      .catch((err) => {
        if (!cancelled) setError((err as Error).message);
      });

    return () => {
      cancelled = true;
      unsubProfile?.();
      unsubActivities?.();
    };
  }, [authReady, user, emailVerifiedTick]);

  const processPdfFile = useCallback(
    async (file: File) => {
      const validationError = validatePdfFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      setError(null);
      setCurrentView("studio");
      setProgress({
        stage: "reading",
        currentPage: 1,
        totalPages: 1,
        percent: 5,
        label: `Reading ${file.name}...`,
      });

      try {
        const extracted = await extractPdfText(file, ({ currentPage, totalPages, percent }) => {
          setProgress({
            stage: "reading",
            currentPage,
            totalPages,
            percent,
            label: `Reading ${file.name}...`,
          });
        });

        setProgress({
          stage: "analyzing",
          currentPage: extracted.pageCount,
          totalPages: extracted.pageCount,
          percent: 90,
          label: `Summarizing ${extracted.pageCount} ${
            extracted.pageCount === 1 ? "page" : "pages"
          } with Gemini AI...`,
        });

        const analysis = await analyzePdfChunks(extracted);

        // Save automatically to Firestore if user is signed in & verified
        let activityId: string | undefined;
        if (user && user.emailVerified) {
          try {
            activityId = await saveNewActivity(user, analysis);
            setCloudNotice("Saved to Past Activity");
            setTimeout(() => setCloudNotice(null), 3000);
          } catch {
            // Keep working locally even if cloud save fails
          }
        }

        setDoc({ ...analysis, activityId });
        setActiveTab("summary");
        setChatMessages([]);
        setQuizQuestions(null);
        setLastQuizScore(-1);
        setLastQuizTotal(0);
        setQuizError(null);
        setProgress(null);

        setTimeout(() => {
          document
            .getElementById("workspace-section")
            ?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 120);
      } catch (err) {
        setProgress(null);
        setError((err as Error).message || "Failed to process this PDF.");
      }
    },
    [user]
  );

  const handleLoadSample = useCallback(async () => {
    setError(null);
    setCurrentView("studio");
    try {
      const res = await fetch("/sample-ai-guide.pdf");
      if (!res.ok) {
        throw new Error("Could not load the sample PDF file.");
      }
      const blob = await res.blob();
      const sampleFile = new File([blob], "sample-ai-guide.pdf", {
        type: "application/pdf",
      });
      await processPdfFile(sampleFile);
    } catch (err) {
      setError((err as Error).message || "Could not load the sample PDF.");
    }
  }, [processPdfFile]);

  // Persist chat changes to Firestore whenever chatMessages updates for a saved activity
  const handleChatMessagesChange: React.Dispatch<React.SetStateAction<ChatMessage[]>> =
    useCallback(
      (action) => {
        setChatMessages((prev) => {
          const next = typeof action === "function" ? action(prev) : action;
          const activeDoc = docRef.current;
          if (user && user.emailVerified && activeDoc?.activityId) {
            updateActivityChat(user.uid, activeDoc.activityId, next).catch(() => {
              // ignore background sync failures
            });
          }
          return next;
        });
      },
      [user]
    );

  const handleGenerateQuiz = useCallback(
    async (targetDoc?: DocumentAnalysis) => {
      const activeDoc = targetDoc ?? doc;
      if (!activeDoc || isQuizLoading) return;

      setIsQuizLoading(true);
      setQuizError(null);
      try {
        const questions = await generatePdfQuiz(activeDoc);
        setQuizQuestions(questions);
        if (user && user.emailVerified && activeDoc.activityId) {
          updateActivityQuiz(
            user.uid,
            activeDoc.activityId,
            questions,
            lastQuizScore,
            lastQuizTotal,
            false
          ).catch(() => {});
        }
      } catch (err) {
        setQuizError((err as Error).message || "Could not generate quiz questions.");
      } finally {
        setIsQuizLoading(false);
      }
    },
    [doc, isQuizLoading, user, lastQuizScore, lastQuizTotal]
  );

  const handleQuizSubmitted = useCallback(
    (score: number, total: number) => {
      setLastQuizScore(score);
      setLastQuizTotal(total);
      if (user && user.emailVerified && doc?.activityId && quizQuestions) {
        updateActivityQuiz(
          user.uid,
          doc.activityId,
          quizQuestions,
          score,
          total,
          true
        ).catch(() => {});
      }
    },
    [user, doc, quizQuestions]
  );

  const handleSelectTab = useCallback(
    (tab: WorkspaceTab) => {
      setActiveTab(tab);
      if (tab === "quiz" && doc && !quizQuestions && !isQuizLoading) {
        handleGenerateQuiz(doc);
      }
    },
    [doc, quizQuestions, isQuizLoading, handleGenerateQuiz]
  );

  const handleResetDocument = useCallback(() => {
    setDoc(null);
    setChatMessages([]);
    setQuizQuestions(null);
    setLastQuizScore(-1);
    setLastQuizTotal(0);
    setQuizError(null);
    setError(null);
    setActiveTab("summary");
    setCurrentView("studio");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const handleOpenSavedActivity = useCallback((saved: SavedActivity) => {
    setDoc({
      sessionId: `restored-${saved.id}`,
      activityId: saved.id,
      fileName: saved.fileName,
      pageCount: saved.pageCount,
      wordCount: saved.wordCount,
      chunks: saved.chunks,
      summary: saved.summary,
      simpleExplanation: saved.simpleExplanation,
      keyPoints: saved.keyPoints,
      terms: saved.terms,
    });
    setChatMessages(saved.chatHistory || []);
    setQuizQuestions(
      saved.quizQuestions && saved.quizQuestions.length > 0 ? saved.quizQuestions : null
    );
    setLastQuizScore(saved.lastQuizScore ?? -1);
    setLastQuizTotal(saved.lastQuizTotal ?? 0);
    setQuizError(null);
    setError(null);
    setActiveTab("summary");
    setCurrentView("studio");

    setTimeout(() => {
      document
        .getElementById("workspace-section")
        ?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 100);
  }, []);

  const handleDeleteSavedActivity = useCallback(
    async (activityId: string) => {
      if (!user) return;
      await deleteUserActivity(user.uid, activityId);
      if (doc?.activityId === activityId) {
        setDoc((prev) => (prev ? { ...prev, activityId: undefined } : prev));
      }
    },
    [user, doc]
  );

  const handleSignOut = useCallback(async () => {
    await signOut(auth);
    setCurrentView("studio");
  }, []);

  const handleRefreshVerification = async () => {
    if (!user) return;
    await user.reload();
    setEmailVerifiedTick((t) => t + 1);
  };

  const handleResendVerification = async () => {
    if (!user) return;
    try {
      await sendEmailVerification(user);
      setCloudNotice("Verification email sent! Please check your inbox.");
      setTimeout(() => setCloudNotice(null), 4000);
    } catch {
      setError("Please wait a minute before requesting another verification email.");
    }
  };

  const TABS: { id: WorkspaceTab; label: string; icon: typeof BookOpen }[] = [
    { id: "summary", label: "Summary & Points", icon: BookOpen },
    { id: "chat", label: "Ask Your PDF", icon: MessageSquare },
    { id: "quiz", label: "AI Quiz (5 Qs)", icon: HelpCircle },
    { id: "terms", label: "Important Terms", icon: BookMarked },
  ];

  const isSignedIn = user !== null;
  const userDisplayName =
    userProfile?.displayName || user?.displayName || user?.email?.split("@")[0] || "Student";

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF1D8] text-[#17213B]">
      <Navbar
        currentView={currentView}
        hasDocument={doc !== null}
        isSignedIn={isSignedIn}
        activityCount={activities.length}
        onNavigateView={setCurrentView}
        onSelectTab={handleSelectTab}
        onSignOut={handleSignOut}
      />

      {/* Email Verification Prompt Banner (for unverified email/password signups) */}
      {isSignedIn && user && !user.emailVerified && (
        <div className="bg-[#FFE0C5] border-b-2 border-[#17213B]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-wrap items-center justify-between gap-3 text-sm">
            <div className="flex items-center gap-2.5 font-medium text-[#17213B]">
              <MailCheck className="w-4 h-4 text-[#2855D9] shrink-0" />
              <span>
                Please verify <span className="font-bold">{user.email}</span> to save your activity to the cloud.
              </span>
            </div>
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={handleResendVerification}
                className="px-3 py-1 rounded-lg bg-[#FFFFFF] border-2 border-[#17213B] text-xs font-bold cursor-pointer"
              >
                Resend Email
              </button>
              <button
                type="button"
                onClick={handleRefreshVerification}
                className="px-3 py-1 rounded-lg bg-[#2855D9] text-white border-2 border-[#17213B] text-xs font-bold cursor-pointer"
              >
                I Verified
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Subtle Cloud Sync Toast */}
      {cloudNotice && (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4 w-full">
          <div className="rounded-xl bg-[#FFFFFF] border-2 border-[#17213B] px-4 py-2.5 text-sm font-semibold text-[#17213B] inline-flex items-center gap-2 shadow-[3px_3px_0px_#17213B]">
            <CheckCircle2 className="w-4 h-4 text-[#2855D9]" />
            <span>{cloudNotice}</span>
          </div>
        </div>
      )}

      <main className="flex-1">
        {currentView === "auth" ? (
          <AuthView
            onSuccess={() => setCurrentView("studio")}
            onBack={() => setCurrentView("studio")}
          />
        ) : currentView === "activity" && isSignedIn ? (
          <ActivityHistoryView
            userDisplayName={userDisplayName}
            userEmail={user?.email || ""}
            profile={userProfile}
            activities={activities}
            onOpenActivity={handleOpenSavedActivity}
            onDeleteActivity={handleDeleteSavedActivity}
            onGoToUpload={() => {
              setCurrentView("studio");
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
            onLoadSample={handleLoadSample}
          />
        ) : (
          <>
            {/* Compact Account / Past Activity Quick Strip */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-5">
              {isSignedIn ? (
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-medium text-[#17213B]/85">
                  <span>
                    Signed in as <strong className="text-[#17213B]">{userDisplayName}</strong> ·{" "}
                    <span className="tabular-nums">
                      {activities.length} saved {activities.length === 1 ? "PDF" : "PDFs"}
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentView("activity")}
                    className="inline-flex items-center gap-1.5 font-bold text-[#2855D9] hover:underline cursor-pointer"
                  >
                    <History className="w-4 h-4" />
                    View Past Activity
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs sm:text-sm font-medium text-[#17213B]/80">
                  <span>
                    Sign in to automatically save your summaries, Ask Your PDF chats, and quiz scores.
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentView("auth")}
                    className="inline-flex items-center gap-1.5 font-bold text-[#2855D9] hover:underline cursor-pointer"
                  >
                    <LogIn className="w-4 h-4" />
                    Log In or Sign Up
                  </button>
                </div>
              )}
            </div>

            <HeroUpload
              onFileSelected={processPdfFile}
              onLoadSample={handleLoadSample}
              progress={progress}
              error={error}
              onClearError={() => setError(null)}
              activeFileName={doc?.fileName}
            />

            {!doc ? (
              <LandingShowcase
                onLoadSample={handleLoadSample}
                isBusy={progress !== null}
              />
            ) : (
              <section
                id="workspace-section"
                className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-2 space-y-6"
              >
                {/* Active Document Metadata Bar + Clear Action */}
                <div className="editorial-card bg-[#FFFFFF] rounded-2xl px-5 py-4 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-[#F47A35] border-2 border-[#17213B] flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-[#17213B]" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-display font-bold text-base sm:text-lg text-[#17213B] truncate">
                        {doc.fileName}
                      </p>
                      <p className="text-xs sm:text-sm font-medium text-[#17213B]/75 tabular-nums">
                        {doc.pageCount} {doc.pageCount === 1 ? "page" : "pages"} ·{" "}
                        {doc.wordCount.toLocaleString()} words · {doc.chunks.length}{" "}
                        {doc.chunks.length === 1 ? "chunk" : "chunks"} processed
                        {doc.activityId ? " · Saved to Past Activity" : ""}
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2.5">
                    {!isSignedIn && (
                      <button
                        type="button"
                        onClick={() => setCurrentView("auth")}
                        className="editorial-btn bg-[#FFE0C5] text-[#17213B] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <LogIn className="w-4 h-4" />
                        Save to Account
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={handleResetDocument}
                      className="editorial-btn bg-[#FFF1D8] text-[#17213B] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                      Clear Document
                    </button>
                  </div>
                </div>

                {/* Interactive Workspace Tab Switcher */}
                <div
                  role="tablist"
                  aria-label="PDF study workspace views"
                  className="flex flex-wrap items-center gap-2.5"
                >
                  {TABS.map((tab) => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                      <button
                        key={tab.id}
                        type="button"
                        role="tab"
                        aria-selected={isActive}
                        onClick={() => handleSelectTab(tab.id)}
                        className={`editorial-btn px-4 sm:px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer ${
                          isActive
                            ? "bg-[#2855D9] text-white"
                            : "bg-[#FFFFFF] text-[#17213B] hover:bg-[#FFE0C5]"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{tab.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Active Workspace Content */}
                <AnimatePresence mode="wait">
                  <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -6 }}
                    transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                  >
                    {activeTab === "summary" && <SummaryView doc={doc} />}
                    {activeTab === "chat" && (
                      <ChatView
                        doc={doc}
                        messages={chatMessages}
                        onMessagesChange={handleChatMessagesChange}
                      />
                    )}
                    {activeTab === "quiz" && (
                      <QuizView
                        questions={quizQuestions}
                        lastScore={lastQuizScore}
                        lastTotal={lastQuizTotal}
                        isLoading={isQuizLoading}
                        error={quizError}
                        onGenerateQuiz={() => handleGenerateQuiz()}
                        onQuizSubmitted={handleQuizSubmitted}
                      />
                    )}
                    {activeTab === "terms" && <TermsView terms={doc.terms} />}
                  </motion.div>
                </AnimatePresence>
              </section>
            )}
          </>
        )}
      </main>

      <footer className="bg-[#17213B] text-[#FFF1D8] border-t-2 border-[#17213B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2.5 font-display font-bold text-lg">
            <FourPointStar className="w-5 h-5" fill="#F47A35" stroke="#FFF1D8" />
            <span>PDF GENIUS</span>
          </div>
          <p className="text-xs sm:text-sm text-[#FFF1D8]/75 text-center sm:text-right">
            Built with PDF.js, Gemini AI &amp; Firebase · Client-side PDF parsing, persistent study history
          </p>
        </div>
      </footer>
    </div>
  );
}
