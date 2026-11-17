import React from "react";
import { FourPointStar } from "./GeometricDecor";
import type { WorkspaceTab } from "../types/pdf";

interface NavbarProps {
  hasDocument: boolean;
  onSelectTab: (tab: WorkspaceTab) => void;
  onLoadSample: () => void;
  onResetDocument: () => void;
  isBusy: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  hasDocument,
  onSelectTab,
  onLoadSample,
  onResetDocument,
  isBusy,
}) => {
  const handleNavClick = (e: React.MouseEvent<HTMLAnchorElement>, targetId: string, tab?: WorkspaceTab) => {
    e.preventDefault();
    if (hasDocument && tab) {
      onSelectTab(tab);
    }
    const el = document.getElementById(targetId);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  };

  return (
    <header className="sticky top-0 z-30 bg-[#FFF1D8]/95 backdrop-blur-sm border-b-2 border-[#17213B]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark */}
        <a
          href="#upload-section"
          onClick={(e) => handleNavClick(e, "upload-section")}
          className="inline-flex items-center gap-2.5 font-display text-xl font-bold tracking-tight text-[#17213B] whitespace-nowrap shrink-0 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#2855D9]"
        >
          <FourPointStar className="w-6 h-6 shrink-0" fill="#F47A35" stroke="#17213B" />
          <span>PDF GENIUS</span>
        </a>

        {/* Zone 2: 4 Single-line Navigation Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#17213B]">
          <a
            href="#upload-section"
            onClick={(e) => handleNavClick(e, "upload-section")}
            className="hover:text-[#2855D9] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0"
          >
            Upload
          </a>
          <a
            href="#workspace-section"
            onClick={(e) => handleNavClick(e, "workspace-section", "summary")}
            className="hover:text-[#2855D9] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0"
          >
            Summary
          </a>
          <a
            href="#workspace-section"
            onClick={(e) => handleNavClick(e, "workspace-section", "chat")}
            className="hover:text-[#2855D9] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0"
          >
            Ask PDF
          </a>
          <a
            href="#workspace-section"
            onClick={(e) => handleNavClick(e, "workspace-section", "quiz")}
            className="hover:text-[#2855D9] underline-offset-4 hover:underline transition-colors whitespace-nowrap shrink-0"
          >
            Quiz & Terms
          </a>
        </nav>

        {/* Zone 3: 1 Primary Action Button */}
        <div className="shrink-0">
          {hasDocument ? (
            <button
              type="button"
              onClick={onResetDocument}
              disabled={isBusy}
              className="editorial-btn bg-[#2855D9] text-white px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
            >
              Upload New PDF
            </button>
          ) : (
            <button
              type="button"
              onClick={onLoadSample}
              disabled={isBusy}
              className="editorial-btn bg-[#2855D9] text-white px-4 py-2 rounded-xl text-sm font-semibold whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
            >
              Try Sample PDF
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
