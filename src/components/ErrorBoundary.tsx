import React from "react";
import { AlertCircle, RotateCcw } from "lucide-react";

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, message: "" };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      message: error.message || "Something unexpected happened.",
    };
  }

  override render() {
    if (this.state.hasError) {
      let displayMsg = this.state.message;
      try {
        const parsed = JSON.parse(this.state.message);
        if (parsed?.error) {
          displayMsg = parsed.error;
        }
      } catch {
        // plain error message
      }

      return (
        <div className="min-h-screen bg-[#FFF1D8] text-[#17213B] flex items-center justify-center p-6">
          <div className="editorial-card bg-[#FFFFFF] rounded-3xl p-8 max-w-lg w-full space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFE0C5] border-2 border-[#17213B] flex items-center justify-center">
              <AlertCircle className="w-6 h-6 text-[#F47A35]" />
            </div>
            <h1 className="font-display text-2xl font-bold">Something went wrong</h1>
            <p className="text-sm text-[#17213B]/80 leading-relaxed">{displayMsg}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="editorial-btn bg-[#2855D9] text-white px-5 py-2.5 rounded-xl text-sm font-semibold inline-flex items-center gap-2 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              Reload PDF GENIUS
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
