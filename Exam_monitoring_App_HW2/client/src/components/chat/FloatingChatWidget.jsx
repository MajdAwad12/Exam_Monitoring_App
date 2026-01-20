// client/src/components/chat/FloatingChatWidget.jsx
import { useMemo, useRef, useState, useEffect } from "react";
import { chatWithAI } from "../../services/chat.service";

/**
 * ✅ SAFE Quick Questions (match server capabilities exactly)
 * - Live / DB queries: numbers + lists
 * - Help / UI guides: "how to" (server FAQ)
 *
 * NOTE:
 * We only show prompts we KNOW the backend can answer reliably.
 */

/* =========================
   Live (DB) prompts
========================= */
const LIVE_PROMPTS = [
  { q: "What exam is running now?", hint: "Shows current running exam title/date/status." },
  { q: "Attendance summary (all rooms)", hint: "Total + present/not arrived/temp out/absent/moving/finished." },
  { q: "Present count (all rooms)", hint: "How many present now (all rooms)." },
  { q: "Not arrived count (all rooms)", hint: "How many not arrived now (all rooms)." },
  { q: "Who has not arrived yet?", hint: "List students not arrived yet (running exam)." },

  { q: "Toilet stats (all rooms)", hint: "Total exits + active now + total time." },
  { q: "Top 5 students by toilet exits", hint: "Ranking by toiletCount (running exam)." },

  { q: "Transfer stats", hint: "Pending/approved/rejected/cancelled." },
  { q: "Last 5 events", hint: "Recent events (if exists)." },
  { q: "Last 5 messages", hint: "Recent chat messages saved in the exam." },

  { q: "List upcoming exams", hint: "Shows upcoming exams from DB." },
  { q: "What is the next exam?", hint: "Shows next upcoming exam." },
  { q: "What is the second upcoming exam?", hint: "Shows 2nd upcoming exam." },
];

/* =========================
   Help (FAQ) prompts
========================= */
const HELP_PROMPTS = [
  { q: "How do I start an exam?", hint: "Steps to start/open dashboard." },
  { q: "Student not arrived (gray) — what does it mean?", hint: "Explains gray status." },
  { q: "Toilet break — how do I track it?", hint: "How to start/return toilet." },
  { q: "Transfer to another room", hint: "How transfers work." },
  { q: "What does 'purple' mean?", hint: "Explains pending transfer color." },
  { q: "Reports (lecturer only)", hint: "How to open/export reports." },
  { q: "What can you do? (commands)", hint: "Shows assistant capabilities." },
];

/* =========================
   “Thinking” helpers
========================= */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function calcThinkingMs(userText) {
  const len = (userText || "").trim().length;
  const base = 420 + Math.min(900, Math.floor(len * 12)); // 420–1320ms-ish
  const jitter = Math.floor(Math.random() * 220);
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

/* =========================
   Chip Section
========================= */
function ChipSection({ title, items, onPick, disabled }) {
  return (
    <div className="pt-2">
      <div className="text-xs text-slate-500 mb-2">{title}</div>
      <div className="flex flex-wrap gap-2">
        {items.map((it) => (
          <button
            key={it.q}
            onClick={() => onPick(it.q)}
            disabled={disabled}
            className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-60"
            title={it.hint || ""}
          >
            {it.q}
          </button>
        ))}
      </div>
    </div>
  );
}

/* =========================
   Component
========================= */
export default function FloatingChatWidget() {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const [messages, setMessages] = useState([
    {
      from: "bot",
      text:
        "Hi! I'm your Exam Assistant.\n\n" +
        "Try:\n" +
        "- Attendance summary (all rooms)\n" +
        "- Who has not arrived yet?\n" +
        "- Toilet stats (all rooms)\n" +
        "- List upcoming exams\n\n" +
        "Or ask a 'how to' question (toilet, transfer, reports).",
    },
  ]);

  const endRef = useRef(null);

  // show a balanced set of chips (not too many)
  const quickLive = useMemo(() => LIVE_PROMPTS.slice(0, 8), []);
  const quickHelp = useMemo(() => HELP_PROMPTS.slice(0, 6), []);

  useEffect(() => {
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

      await sleep(110 + Math.floor(Math.random() * 180));

      setMessages((m) => [...m, { from: "bot", text: replyText }]);
    } catch (e) {
      await sleep(140);
      setMessages((m) => [...m, { from: "bot", text: "I'm having trouble connecting right now. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  }

  function send() {
    return sendText(input);
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
                <div className="font-extrabold tracking-wide">Exam Assistant - ChatBot</div>
                <div className="text-xs text-white/80">Reliable answers (DB-first)</div>
              </div>
            </div>

            <button
              onClick={() => setOpen(false)}
              className="w-9 h-9 rounded-2xl hover:bg-white/15 flex items-center justify-center text-xl"
              title="Close"
            >
              ×
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 p-3 overflow-auto space-y-2 bg-slate-50">
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

            {/* Quick chips */}
            <div className="pt-2">
              <ChipSection
                title="Live exam (DB):"
                items={quickLive}
                onPick={sendText}
                disabled={isLoading}
              />
              <ChipSection
                title="How to (UI help):"
                items={quickHelp}
                onPick={sendText}
                disabled={isLoading}
              />
            </div>

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
                placeholder='Try: "Attendance summary (all rooms)"'
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
              Tip: Use the Live chips for guaranteed DB answers. Use How to for UI guidance.
            </div>
          </div>
        </div>
      )}

      {/* Bubble button */}
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
