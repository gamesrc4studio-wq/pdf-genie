import React, { useRef, useState } from "react";
import { UploadCloud, FileText, AlertCircle, Sparkles, ArrowRight, Loader2 } from "lucide-react";
import { EightPointStar, FourPointStar } from "./GeometricDecor";
import type { ExtractionProgress } from "../types/pdf";

interface HeroUploadProps {
  onFileSelected: (file: File) => void;
  onLoadSample: () => void;
  progress: ExtractionProgress | null;
  error: string | null;
  onClearError: () => void;
  activeFileName?: string;
}

export const HeroUpload: React.FC<HeroUploadProps> = ({
  onFileSelected,
  onLoadSample,
  progress,
  error,
  onClearError,
  activeFileName,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [imgError, setImgError] = useState(false);
  const isBusy = progress !== null;

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0 || isBusy) return;
    onClearError();
    onFileSelected(files[0]);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!isBusy) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(e.dataTransfer.files);
  };

  return (
    <section id="upload-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-10 pb-12 lg:pt-14 lg:pb-16">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
        {/* Left Column: Headline + Vibrant Orange Dropzone */}
        <div className="lg:col-span-7 flex flex-col justify-between gap-6">
          <div>
            <p className="text-xs sm:text-sm font-semibold tracking-wide text-[#2855D9] mb-3">
              AI PDF Summarizer · PDF.js &amp; Gemini Study Studio
            </p>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-bold leading-[1.05] tracking-tight text-[#17213B] [text-wrap:balance]">
              Your PDFs. Understood in Seconds.
            </h1>
            <p className="mt-4 text-lg sm:text-xl text-[#17213B]/85 max-w-xl leading-relaxed">
              Drop the boring reading. Get the important stuff.
            </p>
          </div>

          {/* Large Vibrant Orange PDF Upload Area */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => !isBusy && inputRef.current?.click()}
            role="button"
            tabIndex={0}
            aria-label="Upload a PDF document by clicking or dragging and dropping"
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === " ") && !isBusy) {
                e.preventDefault();
                inputRef.current?.click();
              }
            }}
            className={`relative rounded-3xl bg-[#F47A35] border-2 border-[#17213B] p-4 sm:p-5 transition-transform duration-150 ${
              isBusy ? "cursor-wait" : "cursor-pointer hover:-translate-y-0.5"
            } ${
              isDragging
                ? "shadow-[8px_8px_0px_#2855D9] -translate-y-1"
                : "shadow-[6px_6px_0px_#17213B]"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              onChange={(e) => {
                handleFiles(e.target.files);
                e.target.value = "";
              }}
              className="sr-only"
              disabled={isBusy}
            />

            <div
              className={`rounded-2xl border-2 border-dashed border-[#17213B] bg-[#F47A35] px-5 py-7 sm:px-8 sm:py-8 flex flex-col items-center text-center transition-colors ${
                isDragging ? "bg-[#FFE0C5]/35" : ""
              }`}
            >
              {isBusy && progress ? (
                <div className="w-full max-w-md space-y-4">
                  <div className="w-12 h-12 mx-auto rounded-2xl bg-[#FFF1D8] border-2 border-[#17213B] flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-[#17213B] animate-spin" />
                  </div>
                  <div>
                    <p className="font-display text-lg font-bold text-[#17213B]">
                      {progress.label}
                    </p>
                    <p className="text-sm font-medium text-[#17213B]/85 mt-1 tabular-nums">
                      {progress.stage === "reading"
                        ? `Extracting page ${progress.currentPage} of ${progress.totalPages} (${progress.percent}%)`
                        : "Analyzing chunks with Gemini AI..."}
                    </p>
                  </div>
                  <div className="w-full h-3.5 rounded-full bg-[#FFF1D8] border-2 border-[#17213B] overflow-hidden">
                    <div
                      className="h-full bg-[#2855D9] transition-all duration-200"
                      style={{
                        width: `${
                          progress.stage === "reading"
                            ? Math.max(8, Math.round(progress.percent * 0.5))
                            : 85
                        }%`,
                      }}
                    />
                  </div>
                </div>
              ) : (
                <>
                  <div className="w-14 h-14 rounded-2xl bg-[#FFF1D8] border-2 border-[#17213B] shadow-[3px_3px_0px_#17213B] flex items-center justify-center mb-4">
                    <UploadCloud className="w-7 h-7 text-[#17213B]" />
                  </div>
                  <h2 className="font-display text-xl sm:text-2xl font-bold text-[#17213B]">
                    {isDragging ? "Drop your PDF right here!" : "Drag & drop your PDF here"}
                  </h2>
                  <p className="mt-1.5 text-sm sm:text-base font-medium text-[#17213B]/90">
                    {activeFileName
                      ? `Currently loaded: ${activeFileName} · Drop another to replace`
                      : "Supports lecture notes, research papers, & reports up to 25 MB"}
                  </p>

                  <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                    <span className="editorial-btn bg-[#17213B] text-white px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0">
                      <FileText className="w-4 h-4" />
                      Choose PDF File
                    </span>

                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onClearError();
                        onLoadSample();
                      }}
                      className="editorial-btn bg-[#FFF1D8] text-[#17213B] px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4 text-[#2855D9]" />
                      Try Sample PDF
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Useful Validation / API Error Banner */}
          {error && (
            <div
              role="alert"
              className="rounded-2xl bg-[#FFFFFF] border-2 border-[#17213B] shadow-[4px_4px_0px_#17213B] px-4 py-3.5 flex items-start justify-between gap-3"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-[#F47A35] shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-[#17213B]">Unable to process document</p>
                  <p className="text-sm text-[#17213B]/85 mt-0.5">{error}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClearError}
                className="text-xs font-semibold text-[#2855D9] hover:underline shrink-0 cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}
        </div>

        {/* Right Column: Bespoke Editorial Illustration Card */}
        <div className="lg:col-span-5 flex flex-col">
          <div className="relative flex-1 rounded-3xl bg-[#FFE0C5] border-2 border-[#17213B] shadow-[6px_6px_0px_#17213B] p-4 sm:p-5 flex flex-col justify-between overflow-hidden">
            <FourPointStar
              className="w-7 h-7 absolute top-3 right-3 z-10"
              fill="#F47A35"
              stroke="#17213B"
            />
            <EightPointStar
              className="w-8 h-8 absolute bottom-14 left-3 z-10"
              fill="#2855D9"
              stroke="#17213B"
            />

            <div className="relative flex-1 rounded-2xl border-2 border-[#17213B] overflow-hidden bg-[#FFF1D8] min-h-[260px]">
              {!imgError ? (
                <img
                  src="/src/assets/images/hero_pdf_editorial_1794926501852.jpg"
                  alt="Editorial illustration showing PDF pages transforming into organized summary cards"
                  referrerPolicy="no-referrer"
                  onError={() => setImgError(true)}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center bg-[#FFF1D8]">
                  <FileText className="w-12 h-12 text-[#2855D9] mb-3" />
                  <p className="font-display font-bold text-lg text-[#17213B]">
                    Instant Document Intelligence
                  </p>
                </div>
              )}
            </div>

            <div className="mt-4 pt-1 flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm font-semibold text-[#17213B]">
              <span>01. Smart Summary</span>
              <span aria-hidden="true">·</span>
              <span>02. Grounded Q&amp;A</span>
              <span aria-hidden="true">·</span>
              <span>03. 5-Q Quiz</span>
              <span aria-hidden="true">·</span>
              <span>04. Key Terms</span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
