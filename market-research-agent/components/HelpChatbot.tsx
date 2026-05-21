"use client";
import { useState, useRef, useEffect } from "react";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: Date;
}

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}

function renderContent(text: string) {
  return text
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^- (.+)$/gm, "<li>$1</li>")
    .replace(/(<li>[\s\S]*?<\/li>)/g, "<ul>$1</ul>")
    .replace(/\n\n/g, "<br/><br/>")
    .replace(/\n/g, "<br/>");
}

const QUICK_QUESTIONS = [
  "How do I analyze a market?",
  "What tools does ARIA have?",
  "How do I generate a chart?",
  "Which model should I use?",
];

const WELCOME_MESSAGE: Message = {
  id: "welcome",
  role: "assistant",
  content: `Hi! I am ARIA Assistant.\n\nI can help you with:\n- Using ARIA's research tools\n- Market and business research\n- Getting the best AI results\n\nWhat can I help you with?`,
  timestamp: new Date(),
};

export default function HelpChatbot() {
  const [isOpen, setIsOpen]           = useState(false);
  const [messages, setMessages]       = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput]             = useState("");
  const [isLoading, setIsLoading]     = useState(false);
  const [unread, setUnread]           = useState(0);
  const [hasOpened, setHasOpened]     = useState(false);

  const endRef   = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  useEffect(() => {
    if (isOpen) {
      setUnread(0);
      setHasOpened(true);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  useEffect(() => {
    if (hasOpened) return;
    const timer = setTimeout(() => setUnread(1), 30000);
    return () => clearTimeout(timer);
  }, [hasOpened]);

  const send = async (text: string) => {
    const t = text.trim();
    if (!t || isLoading) return;

    setInput("");
    const userMsg: Message = {
      id: generateId(),
      role: "user",
      content: t,
      timestamp: new Date(),
    };

    setMessages(p => [...p, userMsg]);
    setIsLoading(true);

    try {
      const history = messages
        .filter(m => m.id !== "welcome")
        .map(m => ({ role: m.role, content: m.content }));

      const res = await fetch("/api/help", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: t, history }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");

      setMessages(p => [
        ...p,
        {
          id: generateId(),
          role: "assistant",
          content: data.content,
          timestamp: new Date(),
        },
      ]);

      if (!isOpen) setUnread(u => u + 1);
    } catch {
      setMessages(p => [
        ...p,
        {
          id: generateId(),
          role: "assistant",
          content: "Sorry, I ran into an error. Please check your API key and try again.",
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") { e.preventDefault(); send(input); }
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-2">

      {/* ── Chat Window ── */}
      {isOpen && (
        <div
          className="w-72 bg-[#0d0d14] border border-[#1e1e2e] rounded-2xl shadow-2xl shadow-black/60 flex flex-col overflow-hidden"
          style={{ height: "340px" }}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2.5 border-b border-[#1a1a24] bg-[#111118] flex-shrink-0">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center signal-glow">
                <span className="text-[8px] font-bold text-[#00ff88]">AR</span>
              </div>
              <div>
                <div
                  className="text-xs font-semibold text-[#e8e8f0]"
                  style={{ fontFamily: "Syne,sans-serif" }}
                >
                  ARIA Assistant
                </div>
                <div className="flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[#00ff88]" />
                  <span className="text-[8px] text-[#505070] font-mono">Online</span>
                </div>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="w-5 h-5 rounded-md flex items-center justify-center text-[#505070] hover:text-[#ff6b6b] hover:bg-[#1a1a24] transition-all text-xs"
            >
              x
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
            {messages.map(msg => (
              <div
                key={msg.id}
                className={`flex gap-1.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {msg.role === "assistant" && (
                  <div className="w-5 h-5 rounded-md bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <span className="text-[7px] font-bold text-[#00ff88]">AI</span>
                  </div>
                )}
                <div
                  className={`max-w-[85%] px-2.5 py-1.5 rounded-xl text-[11px] leading-relaxed ${
                    msg.role === "user"
                      ? "bg-[#1a1a24] border border-[#252533] text-[#e8e8f0] rounded-tr-sm"
                      : "bg-[#111118] border border-[#1a1a24] text-[#c8c8d8] rounded-tl-sm"
                  }`}
                >
                  {msg.role === "assistant" ? (
                    <div
                      className="help-content"
                      dangerouslySetInnerHTML={{ __html: renderContent(msg.content) }}
                    />
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex gap-1.5">
                <div className="w-5 h-5 rounded-md bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center flex-shrink-0">
                  <span className="text-[7px] font-bold text-[#00ff88]">AI</span>
                </div>
                <div className="bg-[#111118] border border-[#1a1a24] rounded-xl rounded-tl-sm px-2.5 py-1.5 flex items-center gap-1">
                  <span className="w-1 h-1 rounded-full bg-[#00ff88] typing-dot" />
                  <span className="w-1 h-1 rounded-full bg-[#00ff88] typing-dot" />
                  <span className="w-1 h-1 rounded-full bg-[#00ff88] typing-dot" />
                </div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Quick questions — only on first open */}
          {messages.length <= 2 && (
            <div className="px-3 pb-2 flex-shrink-0">
              <div className="flex flex-wrap gap-1">
                {QUICK_QUESTIONS.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => send(q)}
                    className="text-[9px] px-2 py-1 rounded-lg border border-[#1e1e2e] text-[#505070] hover:border-[#00ff88]/25 hover:text-[#c8c8d8] transition-all bg-[#111118]"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input */}
          <div className="px-3 pb-3 flex-shrink-0">
            <div className="flex items-center gap-2 bg-[#111118] border border-[#1e1e2e] rounded-xl px-2.5 py-2 focus-within:border-[#00ff88]/25 transition-all">
              <input
                ref={inputRef}
                type="text"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                placeholder="Ask me anything..."
                disabled={isLoading}
                className="flex-1 bg-transparent text-[11px] text-[#e8e8f0] placeholder-[#404060] outline-none disabled:opacity-50"
              />
              <button
                onClick={() => send(input)}
                disabled={!input.trim() || isLoading}
                className="w-5 h-5 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/20 flex items-center justify-center hover:bg-[#00ff88]/20 transition-all disabled:opacity-30 disabled:cursor-not-allowed flex-shrink-0"
              >
                <svg width="9" height="9" viewBox="0 0 16 16" fill="none">
                  <path d="M2 8L14 8M14 8L9 3M14 8L9 13" stroke="#00ff88" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <p className="text-[8px] text-[#303050] font-mono mt-1 text-center">
              ARIA Assistant · Powered by GPT-4o Mini
            </p>
          </div>
        </div>
      )}

      {/* ── Floating Button ── */}
      <button
        onClick={() => setIsOpen(o => !o)}
        className="w-12 h-12 rounded-2xl bg-[#0d0d14] border border-[#00ff88]/25 shadow-lg shadow-black/40 flex items-center justify-center hover:border-[#00ff88]/50 hover:bg-[#111118] transition-all duration-200 signal-glow relative"
      >
        {isOpen ? (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M3 3L13 13M13 3L3 13" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        ) : (
          <>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
              <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 13.8214 2.48697 15.5291 3.33782 17L2.5 21.5L7 20.6622C8.47087 21.513 10.1786 22 12 22Z" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              <path d="M8 10.5H16M8 13.5H13" stroke="#00ff88" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-[#ff6b6b] border border-[#0d0d14] flex items-center justify-center text-[9px] font-bold text-white">
                {unread}
              </span>
            )}
          </>
        )}
      </button>
    </div>
  );
}
