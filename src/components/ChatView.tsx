import React, { useRef, useState } from "react";
import { Send, Trash2, MessageSquare, AlertCircle, Loader2 } from "lucide-react";
import { askPdfQuestion } from "../lib/apiClient";
import type { ChatMessage, DocumentAnalysis } from "../types/pdf";

interface ChatViewProps {
  doc: DocumentAnalysis;
  messages: ChatMessage[];
  onMessagesChange: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

const STARTER_QUESTIONS = [
  "What is the main conclusion or core message of this document?",
  "What are the most important facts or examples mentioned?",
  "Does this document mention the stock price of Apple in 2029?",
];

export const ChatView: React.FC<ChatViewProps> = ({ doc, messages, onMessagesChange }) => {
  const [input, setInput] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const sendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isSending) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: `${Date.now()}-u`,
      role: "user",
      text: trimmed,
    };

    const nextHistory = [...messages, userMsg];
    onMessagesChange(nextHistory);
    setInput("");
    setIsSending(true);

    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);

    try {
      const answer = await askPdfQuestion(doc, trimmed, messages);
      const modelMsg: ChatMessage = {
        id: `${Date.now()}-m`,
        role: "model",
        text: answer,
      };
      onMessagesChange((prev) => [...prev, modelMsg]);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
    } catch (err) {
      setError((err as Error).message || "Could not get an answer right now.");
    } finally {
      setIsSending(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendQuestion(input);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="font-display text-2xl sm:text-3xl font-bold text-[#17213B]">
            Ask Your PDF
          </h2>
          <p className="text-sm text-[#17213B]/75 mt-1">
            Answers are strictly grounded in <span className="font-semibold text-[#17213B]">{doc.fileName}</span>. If it isn&apos;t in the PDF, we&apos;ll tell you clearly.
          </p>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => {
              onMessagesChange([]);
              setError(null);
            }}
            disabled={isSending}
            className="editorial-btn bg-[#FFFFFF] text-[#17213B] px-4 py-2 rounded-xl text-sm font-semibold inline-flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            Clear Chat
          </button>
        )}
      </div>

      {/* Chat Container */}
      <div className="editorial-card bg-[#FFFFFF] rounded-2xl overflow-hidden flex flex-col">
        {/* Messages Feed */}
        <div className="p-5 sm:p-6 min-h-[340px] max-h-[480px] overflow-y-auto space-y-4 bg-[#FFF1D8]/35">
          {messages.length === 0 ? (
            <div className="py-6 flex flex-col items-center text-center max-w-xl mx-auto">
              <div className="w-12 h-12 rounded-2xl bg-[#FFE0C5] border-2 border-[#17213B] flex items-center justify-center mb-3">
                <MessageSquare className="w-6 h-6 text-[#17213B]" />
              </div>
              <h3 className="font-display text-lg font-bold text-[#17213B]">
                Start a conversation with your document
              </h3>
              <p className="text-sm text-[#17213B]/75 mt-1 mb-5">
                Pick a sample prompt below or type any question about the PDF.
              </p>

              <div className="w-full space-y-2.5">
                {STARTER_QUESTIONS.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => sendQuestion(q)}
                    className="w-full text-left px-4 py-3 rounded-xl bg-[#FFFFFF] border-2 border-[#17213B] hover:bg-[#FFE0C5] transition-colors text-sm font-medium text-[#17213B] cursor-pointer"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] sm:max-w-[75%] rounded-2xl border-2 border-[#17213B] px-4 py-3 text-[15px] leading-relaxed whitespace-pre-wrap ${
                    msg.role === "user"
                      ? "bg-[#2855D9] text-white shadow-[3px_3px_0px_#17213B]"
                      : "bg-[#FFE0C5] text-[#17213B] shadow-[3px_3px_0px_#17213B]"
                  }`}
                >
                  <p className="text-xs font-bold mb-1 opacity-80">
                    {msg.role === "user" ? "You" : "PDF GENIUS"}
                  </p>
                  <p>{msg.text}</p>
                </div>
              </div>
            ))
          )}

          {isSending && (
            <div className="flex justify-start">
              <div className="rounded-2xl border-2 border-[#17213B] bg-[#FFE0C5] px-4 py-3 inline-flex items-center gap-2.5 text-sm font-semibold text-[#17213B]">
                <Loader2 className="w-4 h-4 animate-spin text-[#2855D9]" />
                Reading document excerpts...
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Error Alert inside Chat */}
        {error && (
          <div className="px-5 py-3 bg-[#FFE0C5] border-t-2 border-[#17213B] flex items-center gap-2.5 text-sm text-[#17213B]">
            <AlertCircle className="w-4 h-4 text-[#F47A35] shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Composer */}
        <form
          onSubmit={handleSubmit}
          className="p-4 bg-[#FFFFFF] border-t-2 border-[#17213B] flex items-center gap-3"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask anything about this PDF..."
            disabled={isSending}
            aria-label="Ask a question about the uploaded PDF"
            className="flex-1 min-w-0 rounded-xl border-2 border-[#17213B] bg-[#FFF1D8]/50 px-4 py-2.5 text-sm sm:text-base text-[#17213B] placeholder:text-[#17213B]/50 focus:outline-none focus:ring-2 focus:ring-[#2855D9]"
          />
          <button
            type="submit"
            disabled={isSending || !input.trim()}
            className="editorial-btn bg-[#F47A35] text-[#17213B] px-5 py-2.5 rounded-xl text-sm font-bold inline-flex items-center gap-2 whitespace-nowrap shrink-0 disabled:opacity-50 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Ask
          </button>
        </form>
      </div>
    </div>
  );
};
