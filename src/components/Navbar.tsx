import React, { useEffect, useState } from "react";
import { PanelLeft } from "lucide-react";
import { FourPointStar } from "./GeometricDecor";
import type { AppView, WorkspaceTab } from "../types/pdf";

interface NavbarProps {
  currentView: AppView;
  hasDocument: boolean;
  isSignedIn: boolean;
  isDesktopSidebarOpen: boolean;
  activityCount: number;
  userDisplayName: string;
  userEmail: string;
  userPhotoUrl: string | null;
  onToggleDesktopSidebar: () => void;
  onOpenMobileSidebar: () => void;
  onNavigateView: (view: AppView) => void;
  onSelectTab: (tab: WorkspaceTab) => void;
}

function getInitials(name: string, email: string): string {
  const source = name.trim() || email.trim();
  if (!source) return "U";
  const parts = source.split(/[\s@]+/).filter(Boolean);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  hasDocument,
  isSignedIn,
  isDesktopSidebarOpen,
  activityCount,
  userDisplayName,
  userEmail,
  userPhotoUrl,
  onToggleDesktopSidebar,
  onOpenMobileSidebar,
  onNavigateView,
  onSelectTab,
}) => {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [userPhotoUrl]);

  const handleWorkspaceLink = (
    e: React.MouseEvent<HTMLAnchorElement>,
    targetId: string,
    tab?: WorkspaceTab
  ) => {
    e.preventDefault();
    onNavigateView("studio");
    if (hasDocument && tab) {
      onSelectTab(tab);
    }
    setTimeout(() => {
      document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 60);
  };

  return (
    <header className="sticky top-0 z-20 bg-[#FFF1D8]/95 backdrop-blur-sm border-b-2 border-[#17213B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Sidebar Toggle + Brand Wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onOpenMobileSidebar}
            aria-label="Open past chats sidebar"
            className="lg:hidden p-2 rounded-xl border-2 border-[#17213B] bg-[#FFFFFF] hover:bg-[#FFE0C5] transition-colors cursor-pointer"
          >
            <PanelLeft className="w-4 h-4 text-[#17213B]" />
          </button>

          {!isDesktopSidebarOpen && (
            <button
              type="button"
              onClick={onToggleDesktopSidebar}
              aria-label="Open past chats sidebar"
              className="hidden lg:inline-flex p-2 rounded-xl border-2 border-[#17213B] bg-[#FFFFFF] hover:bg-[#FFE0C5] transition-colors cursor-pointer"
            >
              <PanelLeft className="w-4 h-4 text-[#17213B]" />
            </button>
          )}

          <a
            href="#upload-section"
            onClick={(e) => handleWorkspaceLink(e, "upload-section")}
            className="inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-[#17213B] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2855D9]"
          >
            <FourPointStar className="w-6 h-6 shrink-0" fill="#F47A35" stroke="#17213B" />
            <span>PDF GENIUS</span>
          </a>
        </div>

        {/* Zone 2: 4 Clean Single-line Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#17213B]">
          <a
            href="#upload-section"
            onClick={(e) => handleWorkspaceLink(e, "upload-section")}
            className={`underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0 ${
              currentView === "studio" ? "text-[#2855D9] font-semibold" : "hover:text-[#2855D9]"
            }`}
          >
            Studio
          </a>
          <a
            href="#past-activity"
            onClick={(e) => {
              e.preventDefault();
              onNavigateView(isSignedIn ? "activity" : "auth");
            }}
            className={`underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0 tabular-nums ${
              currentView === "activity" ? "text-[#2855D9] font-semibold" : "hover:text-[#2855D9]"
            }`}
          >
            {isSignedIn ? `Past Activity (${activityCount})` : "Past Activity"}
          </a>
          <a
            href="#workspace-section"
            onClick={(e) => handleWorkspaceLink(e, "workspace-section", "summary")}
            className="hover:text-[#2855D9] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0"
          >
            Summary
          </a>
          <a
            href="#workspace-section"
            onClick={(e) => handleWorkspaceLink(e, "workspace-section", "chat")}
            className="hover:text-[#2855D9] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0"
          >
            Ask PDF
          </a>
        </nav>

        {/* Zone 3: User Avatar/Email when signed in, or Log In / Sign Up */}
        <div className="shrink-0">
          {isSignedIn ? (
            <button
              type="button"
              onClick={() => onNavigateView("activity")}
              title={userEmail || userDisplayName}
              className="editorial-btn bg-[#FFFFFF] hover:bg-[#FFE0C5] text-[#17213B] pl-1.5 pr-3 py-1 rounded-full text-xs sm:text-sm font-semibold inline-flex items-center gap-2.5 whitespace-nowrap shrink-0 cursor-pointer"
            >
              {userPhotoUrl && !imgError ? (
                <img
                  src={userPhotoUrl}
                  alt={userDisplayName}
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-7 h-7 rounded-full border-2 border-[#17213B] object-cover shrink-0"
                />
              ) : (
                <span className="w-7 h-7 rounded-full bg-[#F47A35] border-2 border-[#17213B] flex items-center justify-center font-display text-[11px] font-bold text-[#17213B] shrink-0">
                  {getInitials(userDisplayName, userEmail)}
                </span>
              )}
              <span className="max-w-[170px] truncate hidden sm:inline">
                {userEmail || userDisplayName}
              </span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onNavigateView("auth")}
              className="editorial-btn bg-[#2855D9] text-white px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              Log In / Sign Up
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
