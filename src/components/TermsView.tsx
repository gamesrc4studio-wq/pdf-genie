import React, { useState } from "react";
import { Check, Copy, BookMarked } from "lucide-react";
import type { TermItem } from "../types/pdf";

interface TermsViewProps {
  terms: TermItem[];
}

export const TermsView: React.FC<TermsViewProps> = ({ terms }) => {
  const [copied, setCopied] = useState(false);

  const handleCopyGlossary = async () => {
    const text = terms.map((t) => `${t.term}: ${t.explanation}`).join("\n\n");
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // ignore clipboard errors silently
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17213B]">
            Important Terms &amp; Concepts
          </h2>
          <p className="text-sm text-[#17213B]/75 mt-1">
            Key ideas from your PDF, explained in simple English.
          </p>
        </div>

        <button
          type="button"
          onClick={handleCopyGlossary}
          className="editorial-btn bg-[#FFFFFF] text-[#17213B] px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
        >
          {copied ? (
            <>
              <Check className="w-4 h-4 text-[#2855D9]" />
              Glossary Copied
            </>
          ) : (
            <>
              <Copy className="w-4 h-4" />
              Copy Terms
            </>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {terms.map((item, idx) => (
          <div
            key={idx}
            className={`editorial-card editorial-card-interactive rounded-2xl p-6 flex flex-col justify-between ${
              idx % 3 === 1 ? "bg-[#FFE0C5]" : "bg-[#FFFFFF]"
            }`}
          >
            <div>
              <div className="flex items-center justify-between gap-2 mb-3">
                <span className="font-display text-xs font-bold tracking-wide text-[#2855D9] tabular-nums">
                  TERM {String(idx + 1).padStart(2, "0")}
                </span>
                <BookMarked className="w-4 h-4 text-[#17213B]/60" />
              </div>
              <h3 className="font-display text-xl font-bold text-[#17213B] leading-snug">
                {item.term}
              </h3>
              <p className="mt-2.5 text-[15px] leading-relaxed text-[#17213B]/85">
                {item.explanation}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
