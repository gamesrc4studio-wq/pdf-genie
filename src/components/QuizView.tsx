import React, { useEffect, useState } from "react";
import { CheckCircle2, XCircle, RotateCcw, Sparkles, Loader2, AlertCircle } from "lucide-react";
import type { QuizQuestion } from "../types/pdf";

interface QuizViewProps {
  questions: QuizQuestion[] | null;
  lastScore?: number;
  lastTotal?: number;
  isLoading: boolean;
  error: string | null;
  onGenerateQuiz: () => void;
  onQuizSubmitted?: (score: number, total: number) => void;
}

const OPTION_LETTERS = ["A", "B", "C", "D"];

export const QuizView: React.FC<QuizViewProps> = ({
  questions,
  lastScore = -1,
  lastTotal = 0,
  isLoading,
  error,
  onGenerateQuiz,
  onQuizSubmitted,
}) => {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [imgError, setImgError] = useState(false);

  // Reset local selection state when a new set of questions arrives
  useEffect(() => {
    setSelectedAnswers({});
    setIsSubmitted(false);
  }, [questions]);

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({ ...prev, [questionIndex]: optionIndex }));
  };

  const handleSubmitQuiz = () => {
    if (!questions) return;
    const total = questions.length;
    const correct = questions.reduce(
      (sum, q, idx) => sum + (selectedAnswers[idx] === q.correctIndex ? 1 : 0),
      0
    );
    setIsSubmitted(true);
    onQuizSubmitted?.(correct, total);
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
  };

  const handleNewQuiz = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    onGenerateQuiz();
  };

  const answeredCount = Object.keys(selectedAnswers).length;
  const totalQuestions = questions?.length ?? 5;
  const correctCount =
    questions && isSubmitted
      ? questions.reduce(
          (sum, q, idx) => sum + (selectedAnswers[idx] === q.correctIndex ? 1 : 0),
          0
        )
      : 0;
  const scorePercent =
    totalQuestions > 0 ? Math.round((correctCount / totalQuestions) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Quiz Intro / Header Card */}
      <div className="editorial-card bg-[#FFE0C5] rounded-2xl p-5 sm:p-6 flex flex-col sm:flex-row items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-20 h-20 rounded-2xl border-2 border-[#17213B] bg-[#FFF1D8] overflow-hidden shrink-0">
            {!imgError ? (
              <img
                src="/src/assets/images/quiz_trophy_graphic_1794926504524.jpg"
                alt="Editorial lightbulb and quiz checkmark illustration"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <Sparkles className="w-7 h-7 text-[#2855D9]" />
              </div>
            )}
          </div>
          <div>
            <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17213B]">
              AI Comprehension Quiz
            </h2>
            <p className="text-sm text-[#17213B]/85 mt-1 tabular-nums">
              5 multiple-choice questions generated straight from your PDF
              {lastScore >= 0 && lastTotal > 0
                ? ` · Previous best: ${lastScore} / ${lastTotal}`
                : "."}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={handleNewQuiz}
          disabled={isLoading}
          className="editorial-btn bg-[#2855D9] text-white px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Generating Quiz...
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              {questions ? "Generate New Questions" : "Generate 5-Question Quiz"}
            </>
          )}
        </button>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="editorial-card bg-[#FFFFFF] rounded-2xl p-10 flex flex-col items-center text-center">
          <Loader2 className="w-10 h-10 text-[#2855D9] animate-spin mb-3" />
          <p className="font-display text-lg font-bold text-[#17213B]">
            Writing 5 multiple-choice questions...
          </p>
          <p className="text-sm text-[#17213B]/75 mt-1">
            Checking key concepts and crafting 4 options per question.
          </p>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="editorial-card bg-[#FFFFFF] rounded-2xl p-6 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[#F47A35] shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-[#17213B]">Quiz generation failed</p>
            <p className="text-sm text-[#17213B]/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Score Banner when Submitted */}
      {!isLoading && questions && isSubmitted && (
        <div className="editorial-card bg-[#2855D9] text-white rounded-2xl p-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-white/85">Quiz Results</p>
            <p className="font-display text-2xl sm:text-3xl font-bold mt-0.5 tabular-nums">
              {correctCount} / {totalQuestions} Correct · {scorePercent}%
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleRetake}
              className="editorial-btn bg-[#FFF1D8] text-[#17213B] px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Retake Quiz
            </button>
            <button
              type="button"
              onClick={handleNewQuiz}
              className="editorial-btn bg-[#F47A35] text-[#17213B] px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              New Questions
            </button>
          </div>
        </div>
      )}

      {/* Questions List */}
      {!isLoading && questions && (
        <div className="space-y-5">
          {questions.map((q, qIdx) => {
            const userPick = selectedAnswers[qIdx];
            const isCorrect = isSubmitted && userPick === q.correctIndex;

            return (
              <div
                key={qIdx}
                className="editorial-card bg-[#FFFFFF] rounded-2xl p-5 sm:p-6 space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <h3 className="font-display text-lg font-bold text-[#17213B] leading-snug">
                    <span className="text-[#2855D9] mr-2 tabular-nums">Q{qIdx + 1}.</span>
                    {q.question}
                  </h3>

                  {isSubmitted && (
                    <span
                      className={`inline-flex items-center gap-1.5 text-xs font-bold whitespace-nowrap shrink-0 px-2.5 py-1 rounded-lg border-2 border-[#17213B] ${
                        isCorrect
                          ? "bg-[#FFE0C5] text-[#17213B]"
                          : "bg-[#F47A35]/25 text-[#17213B]"
                      }`}
                    >
                      {isCorrect ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 text-[#2855D9]" />
                          Correct
                        </>
                      ) : (
                        <>
                          <XCircle className="w-3.5 h-3.5 text-[#F47A35]" />
                          Incorrect
                        </>
                      )}
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {q.options.map((opt, oIdx) => {
                    const isSelected = userPick === oIdx;
                    const isRightAnswer = q.correctIndex === oIdx;

                    let cardStyle =
                      "bg-[#FFF1D8]/50 border-[#17213B] text-[#17213B] hover:bg-[#FFE0C5]";
                    if (!isSubmitted && isSelected) {
                      cardStyle = "bg-[#2855D9] border-[#17213B] text-white";
                    } else if (isSubmitted && isRightAnswer) {
                      cardStyle = "bg-[#2855D9] border-[#17213B] text-white";
                    } else if (isSubmitted && isSelected && !isRightAnswer) {
                      cardStyle = "bg-[#F47A35]/30 border-[#17213B] text-[#17213B]";
                    }

                    return (
                      <button
                        key={oIdx}
                        type="button"
                        onClick={() => handleSelectOption(qIdx, oIdx)}
                        disabled={isSubmitted}
                        className={`text-left rounded-xl border-2 px-4 py-3 text-sm sm:text-[15px] font-medium transition-colors flex items-start gap-3 ${
                          isSubmitted ? "cursor-default" : "cursor-pointer"
                        } ${cardStyle}`}
                      >
                        <span className="font-display font-bold shrink-0">
                          {OPTION_LETTERS[oIdx]}.
                        </span>
                        <span className="flex-1">{opt}</span>
                        {isSubmitted && isRightAnswer && (
                          <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
                        )}
                        {isSubmitted && isSelected && !isRightAnswer && (
                          <XCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#17213B]" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {isSubmitted && (
                  <div className="pt-3 border-t border-[#17213B]/15 text-sm text-[#17213B]/90">
                    <span className="font-bold text-[#17213B]">
                      Correct Answer ({OPTION_LETTERS[q.correctIndex]}):{" "}
                    </span>
                    {q.explanation}
                  </div>
                )}
              </div>
            );
          })}

          {!isSubmitted && (
            <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
              <p className="text-sm font-medium text-[#17213B]/80 tabular-nums">
                {answeredCount} of {totalQuestions} questions answered
              </p>
              <button
                type="button"
                onClick={handleSubmitQuiz}
                disabled={answeredCount < totalQuestions}
                className="editorial-btn bg-[#F47A35] text-[#17213B] px-6 py-3 rounded-xl text-base font-bold disabled:opacity-50 cursor-pointer"
              >
                Submit Quiz &amp; Check Score
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
