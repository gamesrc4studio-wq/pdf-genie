import React, { useState } from "react";
import { ArrowRight, BookOpen, MessageSquare, HelpCircle, BookMarked, FileText } from "lucide-react";

interface LandingShowcaseProps {
  onLoadSample: () => void;
  isBusy: boolean;
}

const CAPABILITIES = [
  {
    num: "01.",
    title: "Instant AI Summary",
    desc: "Get an executive overview, plain-English explanation, and 5–10 key takeaways in seconds.",
    icon: BookOpen,
    bg: "bg-[#FFFFFF]",
  },
  {
    num: "02.",
    title: "Ask Your PDF",
    desc: "Chat directly with your document. Every answer is grounded in the text—and admits when info is missing.",
    icon: MessageSquare,
    bg: "bg-[#FFE0C5]",
  },
  {
    num: "03.",
    title: "5-Question AI Quiz",
    desc: "Test your comprehension with 5 multiple-choice questions, instant scoring, and answer explanations.",
    icon: HelpCircle,
    bg: "bg-[#FFE0C5]",
  },
  {
    num: "04.",
    title: "Important Terms",
    desc: "Automatically pull out key vocabulary and jargon explained in simple, friendly English.",
    icon: BookMarked,
    bg: "bg-[#FFFFFF]",
  },
];

export const LandingShowcase: React.FC<LandingShowcaseProps> = ({
  onLoadSample,
  isBusy,
}) => {
  const [imgError, setImgError] = useState(false);

  return (
    <section
      id="workspace-section"
      className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-20 pt-4 space-y-12"
    >
      {/* Editorial 4-Capability Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {CAPABILITIES.map((cap) => {
          const Icon = cap.icon;
          return (
            <div
              key={cap.num}
              className={`editorial-card editorial-card-interactive ${cap.bg} rounded-2xl p-6 flex flex-col justify-between`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-display text-lg font-bold text-[#2855D9]">
                    {cap.num}
                  </span>
                  <div className="w-9 h-9 rounded-xl bg-[#FFF1D8] border-2 border-[#17213B] flex items-center justify-center">
                    <Icon className="w-4 h-4 text-[#17213B]" />
                  </div>
                </div>
                <h3 className="font-display text-xl font-bold text-[#17213B]">
                  {cap.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-[#17213B]/80">
                  {cap.desc}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* First-Time User Sample Document Callout */}
      <div className="editorial-card bg-[#FFFFFF] rounded-3xl p-6 sm:p-8 lg:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
        <div className="lg:col-span-6 space-y-4">
          <p className="text-xs font-bold tracking-wide text-[#2855D9]">
            First-Time Demo · Ready to Test Live
          </p>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17213B] [text-wrap:balance]">
            No PDF handy right now? Try our 3-page AI Study Guide.
          </h2>
          <p className="text-[15px] sm:text-base text-[#17213B]/80 leading-relaxed">
            Click below to load <span className="font-semibold text-[#17213B]">sample-ai-guide.pdf</span> (3 pages on how language models learn, attention, and grounding). It runs through the real PDF.js text extractor and live Gemini AI pipeline.
          </p>
          <div className="pt-2">
            <button
              type="button"
              onClick={onLoadSample}
              disabled={isBusy}
              className="editorial-btn bg-[#F47A35] text-[#17213B] px-6 py-3 rounded-xl text-base font-bold inline-flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
            >
              Load Sample PDF &amp; Summarize
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="lg:col-span-6">
          <div className="rounded-2xl border-2 border-[#17213B] overflow-hidden bg-[#FFF1D8] aspect-[4/3]">
            {!imgError ? (
              <img
                src="/src/assets/images/feature_study_notes_1794926503104.jpg"
                alt="Editorial illustration of an open study notebook, speech bubbles, and concept cards"
                referrerPolicy="no-referrer"
                onError={() => setImgError(true)}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center">
                <FileText className="w-12 h-12 text-[#F47A35] mb-3" />
                <p className="font-display font-bold text-lg text-[#17213B]">
                  Sample 3-Page Study Primer
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
};
