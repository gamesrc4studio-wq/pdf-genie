import React, { useState } from "react";
import { Check, Copy, Download, BookOpen, Lightbulb } from "lucide-react";
import type { DocumentAnalysis } from "../types/pdf";

interface SummaryViewProps {
  doc: DocumentAnalysis;
}

export function buildExportText(doc: DocumentAnalysis): string {
  const lines: string[] = [
    `PDF GENIUS - AI DOCUMENT SUMMARY`,
    `Document: ${doc.fileName}`,
    `Pages: ${doc.pageCount} | Words: ${doc.wordCount.toLocaleString()}`,
    ``,
    `============================================================`,
    `EXECUTIVE SUMMARY`,
    `============================================================`,
    doc.summary,
    ``,
    `============================================================`,
    `SIMPLE EXPLANATION`,
    `============================================================`,
    doc.simpleExplanation,
    ``,
    `============================================================`,
    `IMPORTANT POINTS`,
    `============================================================`,
    ...doc.keyPoints.map((pt, i) => `${i + 1}. ${pt}`),
    ``,
    `============================================================`,
    `IMPORTANT TERMS`,
    `============================================================`,
    ...doc.terms.map((t) => `- ${t.term}: ${t.explanation}`),
    ``,
  ];
  return lines.join("\n");
}

export const SummaryView: React.FC<SummaryViewProps> = ({ doc }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(buildExportText(doc));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback textarea copy if clipboard API is restricted
      const ta = document.createElement("textarea");
      ta.value = buildExportText(doc);
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleDownloadTxt = () => {
    const text = buildExportText(doc);
    const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = doc.fileName.replace(/\.pdf$/i, "") || "summary";
    a.href = url;
    a.download = `${safeName}-summary.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17213B]">
            AI Summary &amp; Key Takeaways
          </h2>
          <p className="text-sm text-[#17213B]/75 mt-1">
            Distilled directly from your uploaded document.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleCopy}
            className="editorial-btn bg-[#FFFFFF] text-[#17213B] px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#2855D9]" />
                Copied!
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                Copy Summary
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadTxt}
            className="editorial-btn bg-[#2855D9] text-white px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-4 h-4" />
            Download .TXT
          </button>
        </div>
      </div>

      {/* Summary + Simple Explanation Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        <div className="lg:col-span-7 editorial-card bg-[#FFFFFF] rounded-2xl p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#2855D9] border-2 border-[#17213B] flex items-center justify-center text-white shrink-0">
                <BookOpen className="w-4 h-4" />
              </div>
              <h3 className="font-display text-xl font-bold text-[#17213B]">
                Executive Summary
              </h3>
            </div>
            <div className="space-y-3 text-[15px] sm:text-base leading-relaxed text-[#17213B]/90 whitespace-pre-line">
              {doc.summary}
            </div>
          </div>
        </div>

        <div className="lg:col-span-5 editorial-card bg-[#FFE0C5] rounded-2xl p-6 sm:p-7 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2.5 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#F47A35] border-2 border-[#17213B] flex items-center justify-center text-[#17213B] shrink-0">
                <Lightbulb className="w-4 h-4" />
              </div>
              <h3 className="font-display text-xl font-bold text-[#17213B]">
                Simple Explanation
              </h3>
            </div>
            <p className="text-[15px] sm:text-base leading-relaxed text-[#17213B]">
              {doc.simpleExplanation}
            </p>
          </div>
          <p className="mt-6 pt-4 border-t border-[#17213B]/15 text-xs font-medium text-[#17213B]/75">
            Plain-English overview without technical jargon
          </p>
        </div>
      </div>

      {/* 5–10 Important Points Cards */}
      <div>
        <div className="flex items-baseline justify-between mb-4">
          <h3 className="font-display text-xl sm:text-2xl font-bold text-[#17213B]">
            Important Points
          </h3>
          <span className="text-sm font-semibold text-[#17213B]/75 tabular-nums">
            {doc.keyPoints.length} takeaways extracted
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {doc.keyPoints.map((point, index) => (
            <div
              key={index}
              className="editorial-card editorial-card-interactive bg-[#FFFFFF] rounded-2xl p-5 flex items-start gap-4"
            >
              <span className="font-display text-lg font-bold text-[#2855D9] tabular-nums shrink-0 leading-snug">
                {String(index + 1).padStart(2, "0")}.
              </span>
              <p className="text-[15px] leading-relaxed text-[#17213B]/90">
                {point}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
