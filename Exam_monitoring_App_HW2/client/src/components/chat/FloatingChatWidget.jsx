```jsx
// client/src/components/chat/FloatingChatWidget.jsx
import { useMemo, useRef, useState, useEffect } from "react";
import { chatWithAI } from "../../services/chat.service";

/**
 * Clean & minimal chat UI:
 * ✅ 6 chips max (no overload)
 * ✅ Chips stay on top (sticky)
 * ✅ Messages scroll only (real chat feel)
 * ✅ Simple Live/Help toggle
 * ✅ Clear button
 */

/* =========================
   Quick prompts (MAX 6 each tab)
========================= */
const LIVE_CHIPS = [
  { q: "Attendance summary (all rooms)", hint: "Total + present/not arrived/temp out/absent/moving/finished." },
  { q: "Present count (all rooms)", hint: "How many students are present now." },
  { q: "Who has not arrived yet?", hint: "List 'not arrived' students (running exam)." },
  { q: "Top 5 students by toilet exits", hint: "Ranking by toilet exits (if report has stats)." },
  { q: "List upcoming exams", hint: "Upcoming exams from DB." },
  { q: "What is the next exam?", hint: "Next scheduled exam from DB." },
];

const HELP_CHIPS = [
  { q: "How do I start an exam?", hint: "Steps to start/open dashboard." },
  { q: "What does green mean?", hint: "Attendance color meaning (present)." },
  { q: "What does yellow mean?", hint: "Attendance color meaning (temp out / toilet depending on your UI)." },
  { q: "What does gray mean?", hint: "Not arrived meaning." },
  { q: "What does purple mean?", hint: "Pending transfer meaning." },
  { q: "How do I track a toilet break?", hint: "How to start/return toilet." },
];

/* =========================
   Helpers
========================= */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function calcThinkingMs(userText) {
  const len = (userText || "").trim().length;
  const base = 320 + Math.min(650, Math.floor(len * 9));
  const jitter = Math.floor(Math.random() * 160);
  return base + jitter;
}

/* =========================
   UI bits
========================= */
function BubbleIcon() {
  return (
    <svg viewBox="0 0 24 24" className="w-7 h-7" fill="none" aria-hidden="true">
      <path
        d="M20 12c0 3.866-3.582 7-8 7a9.3 9.3 0 0 1-2.67-.39L5 20l1.15-3.43A6.35 6.35 0 0 1 4 12c0-3.866 3.582-7 8-7s8 3.134 8 7Z"
        className="stroke-white"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path
        d="M8.2 12h.01M12 12h.01M15.8 12h.01"
        className="stroke-white"
        strokeWidth="2.2"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1">
      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.2s]" />
      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:-0.1s]" />
      <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
    </div>
  );
}

function Chip({ text, hint, onClick, disabled }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      title={hint || ""}
      className="text-[11px] px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-60 max-w-full"
    >
      <span className="truncate block max-w-[260px]">{text}</span>
    </button>
  );
}

/* =========================
   Component
========================= */
export default function FloatingChatWidget() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState("live"); // live | help

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const initialBotMessage =
    "Hi! I'm your Exam Assistant.\n" +
    "Use the quick buttons above for fast answers.\n" +
    'Try: "Attendance summary (all rooms)".';

  const [messages, setMessages] = useState([{ from: "bot", text: initialBotMessage }]);

  const endRef = useRef(null);

  const primary = useMemo(() => (tab === "live" ? LIVE_CHIPS : HELP_CHIPS), [tab]);

  useEffect(() => {
    if (!open) return;
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, open, isLoading]);

  async function sendText(text) {
    const clean = (text ?? "").trim();
    if (!clean || isLoading) return;

    setInput("");
    setIsLoading(true);
    setMessages((m) => [...m, { from: "me", text: clean }]);

    try {
      await sleep(calcThinkingMs(clean));
      const data = await chatWithAI({ message: clean });
      const replyText = data?.text || "Sorry, I couldn't generate an answer. Try again.";
      await sleep(90 + Math.floor(Math.random() * 160));
      setMessages((m) => [...m, { from: "bot", text: replyText }]);
    } catch {
      await sleep(120);
      setMessages((m) => [...m, { from: "bot", text: "I'm having trouble connecting right now. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  }

  function send() {
    return sendText(input);
  }

  function clearChat() {
    setMessages([{ from: "bot", text: initialBotMessage }]);
  }

  return (
    <div className="fixed bottom-5 right-5 z-50 select-none">
      {open && (
        <div className="w-[380px] h-[560px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center">
                <span className="text-lg">🤖</span>
              </div>
              <div className="leading-tight">
                <div className="font-extrabold tracking-wide">Exam Assistant</div>
                <div className="text-xs text-white/80">Fast & minimal</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/20 text-xs font-semibold"
                title="Clear chat"
              >
                Clear
              </button>

              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-2xl hover:bg-white/15 flex items-center justify-center text-xl"
                title="Close"
              >
                ×
              </button>
            </div>
          </div>

          {/* Sticky top: Tabs + Chips (MAX 6) */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
            <div className="px-4 pt-3 flex items-center gap-2">
              <button
                onClick={() => setTab("live")}
                className={
                  "px-3 py-1.5 rounded-full text-xs font-semibold border " +
                  (tab === "live"
                    ? "bg-sky-600 text-white border-sky-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")
                }
              >
                Live (DB)
              </button>

              <button
                onClick={() => setTab("help")}
                className={
                  "px-3 py-1.5 rounded-full text-xs font-semibold border " +
                  (tab === "help"
                    ? "bg-indigo-600 text-white border-indigo-600"
                    : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50")
                }
              >
                Help
              </button>

              <div className="flex-1" />

              <div className="text-[11px] text-slate-500">
                {tab === "live" ? "DB answers" : "UI guidance"}
              </div>
            </div>

            <div className="px-4 py-3">
              <div className="flex flex-wrap gap-2">
                {primary.map((it) => (
                  <Chip
                    key={it.q}
                    text={it.q}
                    hint={it.hint}
                    disabled={isLoading}
                    onClick={() => sendText(it.q)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 px-3 py-3 overflow-auto space-y-2 bg-slate-50">
            {messages.map((m, idx) => {
              const isMe = m.from === "me";
              return (
                <div key={idx} className={isMe ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      "max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap shadow-sm " +
                      (isMe
                        ? "bg-sky-600 text-white rounded-br-md"
                        : "bg-white border border-slate-200 text-slate-800 rounded-bl-md")
                    }
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-3 py-2 rounded-2xl text-sm bg-white border border-slate-200 text-slate-800 rounded-bl-md shadow-sm">
                  <div className="text-xs text-slate-500 mb-1">Thinking…</div>
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-200 bg-white">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                className="flex-1 px-3 py-2 rounded-2xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-sky-200"
                placeholder={tab === "live" ? 'Try: "Attendance summary (all rooms)"' : 'Try: "How do I start an exam?"'}
                disabled={isLoading}
              />
              <button
                onClick={send}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 rounded-2xl bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:opacity-60"
              >
                Send
              </button>
            </div>

            <div className="mt-2 text-[11px] text-slate-500">
              Tip: Use chips for quick questions.
            </div>
          </div>
        </div>
      )}

      {/* Bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-xl hover:brightness-110 flex items-center justify-center"
          title="Open Exam Assistant"
        >
          <BubbleIcon />
        </button>
      )}
    </div>
  );
}
```
