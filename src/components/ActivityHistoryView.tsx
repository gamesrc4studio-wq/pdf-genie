import React, { useMemo, useState } from "react";
import {
  FileText,
  Trash2,
  ArrowRight,
  Search,
  Clock,
  MessageSquare,
  HelpCircle,
  UploadCloud,
} from "lucide-react";
import type { SavedActivity, UserProfile } from "../types/pdf";

interface ActivityHistoryViewProps {
  userDisplayName: string;
  userEmail: string;
  profile: UserProfile | null;
  activities: SavedActivity[];
  onOpenActivity: (activity: SavedActivity) => void;
  onDeleteActivity: (activityId: string) => Promise<void>;
  onGoToUpload: () => void;
  onLoadSample: () => void;
}

function formatDate(ms: number): string {
  try {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(ms));
  } catch {
    return "Recently";
  }
}

export const ActivityHistoryView: React.FC<ActivityHistoryViewProps> = ({
  userDisplayName,
  userEmail,
  profile,
  activities,
  onOpenActivity,
  onDeleteActivity,
  onGoToUpload,
  onLoadSample,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter(
      (a) =>
        a.fileName.toLowerCase().includes(q) ||
        a.summary.toLowerCase().includes(q)
    );
  }, [activities, searchTerm]);

  const handleConfirmDelete = async (activityId: string) => {
    setDeletingId(activityId);
    try {
      await onDeleteActivity(activityId);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* User Overview Header */}
      <div className="editorial-card bg-[#FFE0C5] rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div>
          <p className="text-xs font-bold tracking-wide text-[#2855D9]">
            Saved Study History · {userEmail}
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[#17213B] mt-1">
            {userDisplayName}&apos;s Past Activity
          </h1>
          <p className="mt-2 text-sm sm:text-base font-medium text-[#17213B]/85 tabular-nums">
            {activities.length} saved {activities.length === 1 ? "document" : "documents"} ·{" "}
            {profile?.totalDocsAnalyzed ?? activities.length} PDFs analyzed ·{" "}
            {profile?.totalQuizzesCompleted ?? 0} quizzes completed
          </p>
        </div>

        <button
          type="button"
          onClick={onGoToUpload}
          className="editorial-btn bg-[#F47A35] text-[#17213B] px-5 py-3 rounded-xl text-sm sm:text-base font-bold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <UploadCloud className="w-4 h-4" />
          Analyze New PDF
        </button>
      </div>

      {/* Search Bar */}
      {activities.length > 0 && (
        <div className="flex items-center gap-3 max-w-md">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-[#17213B]/60 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filter past PDFs by name or topic..."
              aria-label="Filter past PDFs"
              className="w-full rounded-xl border-2 border-[#17213B] bg-[#FFFFFF] pl-10 pr-4 py-2.5 text-sm text-[#17213B] placeholder:text-[#17213B]/50 focus:outline-none focus:ring-2 focus:ring-[#2855D9]"
            />
          </div>
        </div>
      )}

      {/* Activity List or Empty State */}
      {activities.length === 0 ? (
        <div className="editorial-card bg-[#FFFFFF] rounded-3xl p-10 text-center max-w-2xl mx-auto space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-[#FFE0C5] border-2 border-[#17213B] flex items-center justify-center">
            <FileText className="w-7 h-7 text-[#17213B]" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[#17213B]">
            No past activity yet
          </h2>
          <p className="text-sm sm:text-base text-[#17213B]/80">
            Every PDF you summarize, chat with, or quiz yourself on while signed in is automatically saved right here.
          </p>
          <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
            <button
              type="button"
              onClick={onGoToUpload}
              className="editorial-btn bg-[#2855D9] text-white px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
            >
              Upload a PDF
            </button>
            <button
              type="button"
              onClick={onLoadSample}
              className="editorial-btn bg-[#FFF1D8] text-[#17213B] px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
            >
              Try Sample PDF
            </button>
          </div>
        </div>
      ) : filtered.length === 0 ? (
        <div className="editorial-card bg-[#FFFFFF] rounded-2xl p-8 text-center">
          <p className="font-display font-bold text-lg text-[#17213B]">
            No matching documents found
          </p>
          <p className="text-sm text-[#17213B]/75 mt-1">
            Try clearing your search filter.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {filtered.map((item) => {
            const isConfirming = confirmDeleteId === item.id;
            const isDeleting = deletingId === item.id;

            return (
              <div
                key={item.id}
                className="editorial-card editorial-card-interactive bg-[#FFFFFF] rounded-2xl p-6 flex flex-col justify-between gap-5"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-[#F47A35] border-2 border-[#17213B] flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5 text-[#17213B]" />
                      </div>
                      <div className="min-w-0">
                        <h2 className="font-display text-lg font-bold text-[#17213B] truncate">
                          {item.fileName}
                        </h2>
                        <p className="text-xs text-[#17213B]/70 inline-flex items-center gap-1.5 mt-0.5 tabular-nums">
                          <Clock className="w-3.5 h-3.5" />
                          <span>{formatDate(item.updatedAtMs)}</span>
                          <span aria-hidden="true">·</span>
                          <span>
                            {item.pageCount} {item.pageCount === 1 ? "page" : "pages"}
                          </span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <p className="text-sm text-[#17213B]/85 leading-relaxed line-clamp-3">
                    {item.summary}
                  </p>

                  {/* Unboxed activity metrics */}
                  <div className="flex flex-wrap items-center gap-4 pt-1 text-xs font-semibold text-[#17213B]/80 tabular-nums">
                    <span className="inline-flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-[#2855D9]" />
                      {item.chatHistory.length}{" "}
                      {item.chatHistory.length === 1 ? "chat message" : "chat messages"}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <HelpCircle className="w-3.5 h-3.5 text-[#F47A35]" />
                      {item.lastQuizScore >= 0
                        ? `Last quiz: ${item.lastQuizScore}/${item.lastQuizTotal}`
                        : item.quizQuestions.length > 0
                        ? "Quiz ready"
                        : "No quiz yet"}
                    </span>
                  </div>
                </div>

                {/* Actions */}
                <div className="pt-4 border-t border-[#17213B]/15 flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    onClick={() => onOpenActivity(item)}
                    className="editorial-btn bg-[#2855D9] text-white px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    Open Study Workspace
                    <ArrowRight className="w-4 h-4" />
                  </button>

                  {isConfirming ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleConfirmDelete(item.id)}
                        disabled={isDeleting}
                        className="px-3 py-1.5 rounded-lg bg-[#F47A35] border-2 border-[#17213B] text-xs font-bold text-[#17213B] cursor-pointer"
                      >
                        {isDeleting ? "Deleting..." : "Confirm"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(null)}
                        disabled={isDeleting}
                        className="px-2.5 py-1.5 rounded-lg text-xs font-semibold text-[#17213B]/75 hover:underline cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(item.id)}
                      aria-label={`Delete ${item.fileName}`}
                      className="px-3 py-2 rounded-xl text-xs font-semibold text-[#17213B]/75 hover:text-[#17213B] hover:bg-[#FFE0C5] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      Delete
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
};
