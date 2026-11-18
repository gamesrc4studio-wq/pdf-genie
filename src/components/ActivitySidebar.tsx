import React, { useEffect, useMemo, useState } from "react";
import {
  Plus,
  MessageSquare,
  FileText,
  Trash2,
  Check,
  X,
  Search,
  PanelLeftClose,
  LogIn,
  LogOut,
  History,
} from "lucide-react";
import { FourPointStar } from "./GeometricDecor";
import type { DocumentAnalysis, SavedActivity } from "../types/pdf";

export interface ActivitySidebarProps {
  isOpen: boolean;
  onCloseMobile: () => void;
  onToggleCollapse: () => void;
  isSignedIn: boolean;
  userDisplayName: string;
  userEmail: string;
  userPhotoUrl?: string | null;
  activities: SavedActivity[];
  activeDoc: DocumentAnalysis | null;
  onNewChat: () => void;
  onSelectActivity: (activity: SavedActivity) => void;
  onDeleteActivity: (activityId: string) => Promise<void>;
  onOpenAllActivity: () => void;
  onOpenAuth: () => void;
  onSignOut: () => void;
}

type DateGroupLabel = "Today" | "Yesterday" | "Previous 7 Days" | "Older";

function getDateGroup(ms: number): DateGroupLabel {
  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const startOfYesterday = startOfToday - 24 * 60 * 60 * 1000;
  const startOfSevenDays = startOfToday - 7 * 24 * 60 * 60 * 1000;

  if (ms >= startOfToday) return "Today";
  if (ms >= startOfYesterday) return "Yesterday";
  if (ms >= startOfSevenDays) return "Previous 7 Days";
  return "Older";
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "U";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

interface SidebarBodyProps extends ActivitySidebarProps {
  mode: "desktop" | "mobile";
}

const SidebarBody: React.FC<SidebarBodyProps> = ({
  mode,
  onCloseMobile,
  onToggleCollapse,
  isSignedIn,
  userDisplayName,
  userEmail,
  userPhotoUrl,
  activities,
  activeDoc,
  onNewChat,
  onSelectActivity,
  onDeleteActivity,
  onOpenAllActivity,
  onOpenAuth,
  onSignOut,
}) => {
  const [search, setSearch] = useState("");
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    setAvatarError(false);
  }, [userPhotoUrl]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return activities;
    return activities.filter(
      (a) =>
        a.fileName.toLowerCase().includes(q) ||
        a.chatHistory.some((m) => m.text.toLowerCase().includes(q)) ||
        a.summary.toLowerCase().includes(q)
    );
  }, [activities, search]);

  const grouped = useMemo(() => {
    const groups: Record<DateGroupLabel, SavedActivity[]> = {
      Today: [],
      Yesterday: [],
      "Previous 7 Days": [],
      Older: [],
    };
    for (const item of filtered) {
      groups[getDateGroup(item.updatedAtMs)].push(item);
    }
    return groups;
  }, [filtered]);

  const handleConfirmDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    setDeletingId(id);
    try {
      await onDeleteActivity(id);
    } finally {
      setDeletingId(null);
      setConfirmId(null);
    }
  };

  const groupOrder: DateGroupLabel[] = ["Today", "Yesterday", "Previous 7 Days", "Older"];

  return (
    <div className="h-full flex flex-col bg-[#FFE0C5] text-[#17213B] border-r-2 border-[#17213B] w-72 select-none">
      {/* Top Bar: Title + Collapse / Close Button */}
      <div className="h-16 px-4 flex items-center justify-between border-b-2 border-[#17213B] shrink-0">
        <div className="inline-flex items-center gap-2 font-display text-base font-bold tracking-tight">
          <FourPointStar className="w-5 h-5 shrink-0" fill="#F47A35" stroke="#17213B" />
          <span>Past Chats</span>
        </div>

        <button
          type="button"
          onClick={mode === "desktop" ? onToggleCollapse : onCloseMobile}
          aria-label={mode === "desktop" ? "Collapse sidebar" : "Close sidebar"}
          className="p-1.5 rounded-lg hover:bg-[#FFF1D8] border border-transparent hover:border-[#17213B] transition-colors cursor-pointer"
        >
          {mode === "desktop" ? (
            <PanelLeftClose className="w-5 h-5 text-[#17213B]" />
          ) : (
            <X className="w-5 h-5 text-[#17213B]" />
          )}
        </button>
      </div>

      {/* Primary Action: + New PDF Chat */}
      <div className="p-3 space-y-2.5 shrink-0">
        <button
          type="button"
          onClick={() => {
            onNewChat();
            onCloseMobile();
          }}
          className="editorial-btn w-full bg-[#F47A35] text-[#17213B] px-3.5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center justify-between cursor-pointer"
        >
          <span className="inline-flex items-center gap-2">
            <Plus className="w-4 h-4 stroke-[2.5]" />
            New PDF Chat
          </span>
          <span className="text-xs font-semibold opacity-75">Upload</span>
        </button>

        {isSignedIn && activities.length > 0 && (
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#17213B]/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search past chats..."
              aria-label="Search past PDF chats"
              className="w-full rounded-xl border-2 border-[#17213B] bg-[#FFF1D8] pl-8 pr-3 py-1.5 text-xs font-medium text-[#17213B] placeholder:text-[#17213B]/55 focus:outline-none focus:ring-2 focus:ring-[#2855D9]"
            />
          </div>
        )}
      </div>

      {/* Scrollable Past Chats List */}
      <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-4">
        {!isSignedIn ? (
          <div className="space-y-3 mt-1">
            {activeDoc && (
              <div className="rounded-xl border-2 border-[#17213B] bg-[#FFF1D8] p-3">
                <p className="text-[11px] font-bold text-[#2855D9] mb-1">
                  Current Unsaved PDF
                </p>
                <p className="text-xs font-bold text-[#17213B] truncate">
                  {activeDoc.fileName}
                </p>
              </div>
            )}

            <div className="rounded-2xl border-2 border-[#17213B] bg-[#FFFFFF] p-4 space-y-2.5 shadow-[3px_3px_0px_#17213B]">
              <p className="font-display text-sm font-bold text-[#17213B]">
                Save your past chats
              </p>
              <p className="text-xs text-[#17213B]/80 leading-relaxed">
                Log in or sign up to keep every PDF summary, chat thread, and quiz score right here in your sidebar.
              </p>
              <button
                type="button"
                onClick={() => {
                  onOpenAuth();
                  onCloseMobile();
                }}
                className="editorial-btn w-full bg-[#2855D9] text-white px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Log In / Sign Up
              </button>
            </div>
          </div>
        ) : activities.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-[#17213B]/45 bg-[#FFF1D8]/60 p-4 text-center mt-2">
            <MessageSquare className="w-5 h-5 text-[#2855D9] mx-auto mb-2" />
            <p className="text-xs font-bold text-[#17213B]">No past chats yet</p>
            <p className="text-[11px] text-[#17213B]/75 mt-1">
              Upload a PDF or try the sample guide—your chats will appear here automatically.
            </p>
          </div>
        ) : filtered.length === 0 ? (
          <p className="text-xs text-[#17213B]/75 text-center py-6">
            No chats match &ldquo;{search}&rdquo;.
          </p>
        ) : (
          groupOrder.map((label) => {
            const list = grouped[label];
            if (list.length === 0) return null;

            return (
              <div key={label} className="space-y-1">
                <p className="px-2 text-[11px] font-bold tracking-wide text-[#17213B]/65">
                  {label}
                </p>

                <div className="space-y-1">
                  {list.map((item) => {
                    const isActive = activeDoc?.activityId === item.id;
                    const isConfirming = confirmId === item.id;
                    const isDeleting = deletingId === item.id;
                    const lastUserMsg = [...item.chatHistory]
                      .reverse()
                      .find((m) => m.role === "user");

                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          onSelectActivity(item);
                          onCloseMobile();
                        }}
                        role="button"
                        tabIndex={0}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === " ") {
                            e.preventDefault();
                            onSelectActivity(item);
                            onCloseMobile();
                          }
                        }}
                        className={`group relative rounded-xl px-2.5 py-2 transition-colors flex items-start gap-2.5 cursor-pointer border-2 ${
                          isActive
                            ? "bg-[#2855D9] text-white border-[#17213B] shadow-[2px_2px_0px_#17213B]"
                            : "bg-transparent hover:bg-[#FFF1D8] text-[#17213B] border-transparent hover:border-[#17213B]"
                        }`}
                      >
                        {item.chatHistory.length > 0 ? (
                          <MessageSquare
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isActive ? "text-white" : "text-[#2855D9]"
                            }`}
                          />
                        ) : (
                          <FileText
                            className={`w-4 h-4 shrink-0 mt-0.5 ${
                              isActive ? "text-white" : "text-[#F47A35]"
                            }`}
                          />
                        )}

                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold truncate leading-snug">
                            {item.fileName}
                          </p>
                          <p
                            className={`text-[11px] truncate mt-0.5 ${
                              isActive ? "text-white/80" : "text-[#17213B]/70"
                            }`}
                          >
                            {lastUserMsg
                              ? lastUserMsg.text
                              : `${item.pageCount} ${
                                  item.pageCount === 1 ? "page" : "pages"
                                } · Summary`}
                          </p>
                        </div>

                        <div
                          className="shrink-0 flex items-center gap-1"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {isConfirming ? (
                            <>
                              <button
                                type="button"
                                onClick={(e) => handleConfirmDelete(e, item.id)}
                                disabled={isDeleting}
                                aria-label="Confirm delete chat"
                                className="p-1 rounded-md bg-[#F47A35] text-[#17213B] border border-[#17213B] cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmId(null);
                                }}
                                aria-label="Cancel delete"
                                className={`p-1 rounded-md cursor-pointer ${
                                  isActive
                                    ? "text-white hover:bg-white/20"
                                    : "text-[#17213B] hover:bg-[#FFE0C5]"
                                }`}
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </>
                          ) : (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setConfirmId(item.id);
                              }}
                              aria-label={`Delete ${item.fileName}`}
                              className={`p-1 rounded-md opacity-0 group-hover:opacity-100 focus:opacity-100 transition-opacity cursor-pointer ${
                                isActive
                                  ? "text-white/85 hover:bg-white/20"
                                  : "text-[#17213B]/65 hover:text-[#17213B] hover:bg-[#FFE0C5]"
                              }`}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Profile / Account Dock */}
      <div className="p-3 border-t-2 border-[#17213B] bg-[#FFF1D8] space-y-2 shrink-0">
        {isSignedIn ? (
          <>
            <button
              type="button"
              onClick={() => {
                onOpenAllActivity();
                onCloseMobile();
              }}
              className="w-full px-3 py-2 rounded-xl border-2 border-[#17213B] bg-[#FFFFFF] hover:bg-[#FFE0C5] transition-colors text-xs font-bold text-[#17213B] inline-flex items-center justify-between cursor-pointer"
            >
              <span className="inline-flex items-center gap-2">
                <History className="w-3.5 h-3.5 text-[#2855D9]" />
                All Past Activity
              </span>
              <span className="tabular-nums text-[#2855D9]">{activities.length}</span>
            </button>

            <div className="flex items-center gap-2.5 px-1 pt-1">
              {userPhotoUrl && !avatarError ? (
                <img
                  src={userPhotoUrl}
                  alt={userDisplayName}
                  referrerPolicy="no-referrer"
                  onError={() => setAvatarError(true)}
                  className="w-8 h-8 rounded-full border-2 border-[#17213B] object-cover shrink-0"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[#F47A35] border-2 border-[#17213B] flex items-center justify-center font-display text-xs font-bold text-[#17213B] shrink-0">
                  {getInitials(userDisplayName)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-[#17213B] truncate">
                  {userDisplayName}
                </p>
                <p className="text-[11px] text-[#17213B]/70 truncate">
                  {userEmail}
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                onSignOut();
                onCloseMobile();
              }}
              className="editorial-btn w-full bg-[#FFFFFF] hover:bg-[#F47A35] text-[#17213B] px-3 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </>
        ) : (
          <button
            type="button"
            onClick={() => {
              onOpenAuth();
              onCloseMobile();
            }}
            className="editorial-btn w-full bg-[#2855D9] text-white px-3.5 py-2 rounded-xl text-xs font-bold inline-flex items-center justify-center gap-2 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5" />
            Log In / Sign Up
          </button>
        )}
      </div>
    </div>
  );
};

export const ActivitySidebar: React.FC<ActivitySidebarProps> = (props) => {
  if (!props.isOpen) return null;

  return (
    <aside
      aria-label="Past PDF chats sidebar"
      className="hidden lg:block shrink-0 h-screen sticky top-0 z-30"
    >
      <SidebarBody {...props} mode="desktop" />
    </aside>
  );
};

export const MobileActivityDrawer: React.FC<ActivitySidebarProps> = (props) => {
  if (!props.isOpen) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-50 flex">
      <div
        className="fixed inset-0 bg-[#17213B]/45 backdrop-blur-[1px]"
        onClick={props.onCloseMobile}
        aria-hidden="true"
      />
      <aside aria-label="Past PDF chats drawer" className="relative z-10 h-full shadow-2xl">
        <SidebarBody {...props} mode="mobile" />
      </aside>
    </div>
  );
};
