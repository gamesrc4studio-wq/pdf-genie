import React from "react";
import { FourPointStar } from "./GeometricDecor";
import type { AppView, WorkspaceTab } from "../types/pdf";

interface NavbarProps {
  currentView: AppView;
  hasDocument: boolean;
  isSignedIn: boolean;
  activityCount: number;
  onNavigateView: (view: AppView) => void;
  onSelectTab: (tab: WorkspaceTab) => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentView,
  hasDocument,
  isSignedIn,
  activityCount,
  onNavigateView,
  onSelectTab,
  onSignOut,
}) => {
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
    <header className="sticky top-0 z-30 bg-[#FFF1D8]/95 backdrop-blur-sm border-b-2 border-[#17213B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#upload-section"
          onClick={(e) => handleWorkspaceLink(e, "upload-section")}
          className="inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-[#17213B] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2855D9]"
        >
          <FourPointStar className="w-6 h-6 shrink-0" fill="#F47A35" stroke="#17213B" />
          <span>PDF GENIUS</span>
        </a>

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

        {/* Zone 3: 1 Primary Action Button */}
        <div className="shrink-0">
          {isSignedIn ? (
            <button
              type="button"
              onClick={onSignOut}
              className="editorial-btn bg-[#FFFFFF] text-[#17213B] px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 cursor-pointer"
            >
              Sign Out
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
