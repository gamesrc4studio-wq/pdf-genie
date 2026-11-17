import { useCallback, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  BookOpen,
  MessageSquare,
  HelpCircle,
  BookMarked,
  X,
} from "lucide-react";
import { Navbar } from "./components/Navbar";
import { HeroUpload } from "./components/HeroUpload";
import { LandingShowcase } from "./components/LandingShowcase";
import { SummaryView } from "./components/SummaryView";
import { ChatView } from "./components/ChatView";
import { QuizView } from "./components/QuizView";
import { TermsView } from "./components/TermsView";
import { FourPointStar } from "./components/GeometricDecor";
import { extractPdfText, validatePdfFile } from "./lib/pdfExtractor";
import { analyzePdfChunks, generatePdfQuiz } from "./lib/apiClient";
import type {
  ChatMessage,
  DocumentAnalysis,
  ExtractionProgress,
  QuizQuestion,
  WorkspaceTab,
} from "./types/pdf";

export default function App() {
  const [doc, setDoc] = useState<DocumentAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("summary");
  const [progress, setProgress] = useState<ExtractionProgress | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[] | null>(null);
  const [isQuizLoading, setIsQuizLoading] = useState(false);
  const [quizError, setQuizError] = useState<string | null>(null);

  const processPdfFile = useCallback(async (file: File) => {
    const validationError = validatePdfFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
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
        label: `Summarizing ${extracted.pageCount} ${extracted.pageCount === 1 ? "page" : "pages"} with Gemini AI...`,
      });

      const analysis = await analyzePdfChunks(extracted);

      setDoc(analysis);
      setActiveTab("summary");
      setChatMessages([]);
      setQuizQuestions(null);
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
  }, []);

  const handleLoadSample = useCallback(async () => {
    setError(null);
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

  const handleGenerateQuiz = useCallback(
    async (targetDoc?: DocumentAnalysis) => {
      const activeDoc = targetDoc ?? doc;
      if (!activeDoc || isQuizLoading) return;

      setIsQuizLoading(true);
      setQuizError(null);
      try {
        const questions = await generatePdfQuiz(activeDoc);
        setQuizQuestions(questions);
      } catch (err) {
        setQuizError((err as Error).message || "Could not generate quiz questions.");
      } finally {
        setIsQuizLoading(false);
      }
    },
    [doc, isQuizLoading]
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
    setQuizError(null);
    setError(null);
    setActiveTab("summary");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  const TABS: { id: WorkspaceTab; label: string; icon: typeof BookOpen }[] = [
    { id: "summary", label: "Summary & Points", icon: BookOpen },
    { id: "chat", label: "Ask Your PDF", icon: MessageSquare },
    { id: "quiz", label: "AI Quiz (5 Qs)", icon: HelpCircle },
    { id: "terms", label: "Important Terms", icon: BookMarked },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-[#FFF1D8] text-[#17213B]">
      <Navbar
        hasDocument={doc !== null}
        onSelectTab={handleSelectTab}
        onLoadSample={handleLoadSample}
        onResetDocument={handleResetDocument}
        isBusy={progress !== null}
      />

      <main className="flex-1">
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
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleResetDocument}
                className="editorial-btn bg-[#FFF1D8] text-[#17213B] px-3.5 py-2 rounded-xl text-xs sm:text-sm font-semibold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <X className="w-4 h-4" />
                Clear Document
              </button>
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
                    onMessagesChange={setChatMessages}
                  />
                )}
                {activeTab === "quiz" && (
                  <QuizView
                    questions={quizQuestions}
                    isLoading={isQuizLoading}
                    error={quizError}
                    onGenerateQuiz={() => handleGenerateQuiz()}
                  />
                )}
                {activeTab === "terms" && <TermsView terms={doc.terms} />}
              </motion.div>
            </AnimatePresence>
          </section>
        )}
      </main>

      <footer className="bg-[#17213B] text-[#FFF1D8] border-t-2 border-[#17213B]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="inline-flex items-center gap-2.5 font-display font-bold text-lg">
            <FourPointStar className="w-5 h-5" fill="#F47A35" stroke="#FFF1D8" />
            <span>PDF GENIUS</span>
          </div>
          <p className="text-xs sm:text-sm text-[#FFF1D8]/75 text-center sm:text-right">
            Built with PDF.js &amp; Gemini AI · Client-side PDF parsing, server-side AI synthesis
          </p>
        </div>
      </footer>
    </div>
  );
}
