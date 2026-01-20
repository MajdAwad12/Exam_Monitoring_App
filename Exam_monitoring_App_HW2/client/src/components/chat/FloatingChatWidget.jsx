// client/src/components/chat/FloatingChatWidget.jsx
import { useMemo, useRef, useState, useEffect } from "react";
import { chatWithAI } from "../../services/chat.service";

/**
 * Minimal, clean chat UI:
 * ✅ Quick buttons stay at the top (sticky)
 * ✅ Only 4 primary chips per tab (Live/Help)
 * ✅ "More" opens a compact scrollable drawer (does not push the chat down)
 * ✅ Messages area is the only scroll area (real chat feel)
 * ✅ Clear chat button (no clutter)
 */

/* =========================
   Live (DB) prompts
========================= */
const LIVE_PROMPTS = [
  { q: "Attendance summary (all rooms)", hint: "Total + present/not arrived/temp out/absent/moving/finished." },
  { q: "Who has not arrived yet?", hint: "List students not arrived yet (running exam)." },
  { q: "Top 5 students by toilet exits", hint: "Ranking by toiletCount (running exam)." },
  { q: "List upcoming exams", hint: "Shows upcoming exams from DB." },

  // More
  { q: "Toilet stats (all rooms)", hint: "Total exits + active now + total time." },
  { q: "Transfer stats", hint: "Pending/approved/rejected/cancelled." },
  { q: "Last 5 events", hint: "Recent events (if exists)." },
  { q: "Last 5 messages", hint: "Recent messages saved in the exam." },
  { q: "What exam is running now?", hint: "Shows current running exam title/date/status." },
  { q: "What is the next exam?", hint: "Shows next upcoming exam." },
  { q: "What is the second upcoming exam?", hint: "Shows 2nd upcoming exam." },
  { q: "Present count (all rooms)", hint: "How many present now." },
  { q: "Not arrived count (all rooms)", hint: "How many not arrived now." },
];

/* =========================
   Help (FAQ) prompts
========================= */
const HELP_PROMPTS = [
  { q: "How do I start an exam?", hint: "Steps to start/open dashboard." },
  { q: "Toilet break — how do I track it?", hint: "How to start/return toilet." },
  { q: "Transfer to another room", hint: "How transfers work." },
  { q: "Reports (lecturer only)", hint: "How to open/export reports." },

  // More
  { q: "Student not arrived (gray) — what does it mean?", hint: "Explains gray status." },
  { q: "What does 'purple' mean?", hint: "Explains pending transfer color." },
  { q: "What can you do? (commands)", hint: "Shows assistant capabilities." },
];

/* =========================
   Helpers
========================= */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function calcThinkingMs(userText) {
  const len = (userText || "").trim().length;
  const base = 380 + Math.min(850, Math.floor(len * 11)); // lighter feeling
  const jitter = Math.floor(Math.random() * 180);
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
  const [showMore, setShowMore] = useState(false);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const initialBotMessage =
    "Hi! I'm your Exam Assistant.\n" +
    "Use the quick buttons above for reliable answers.\n" +
    'Try: "Attendance summary (all rooms)".';

  const [messages, setMessages] = useState([{ from: "bot", text: initialBotMessage }]);

  const endRef = useRef(null);

  const livePrimary = useMemo(() => LIVE_PROMPTS.slice(0, 4), []);
  const liveMore = useMemo(() => LIVE_PROMPTS.slice(4), []);
  const helpPrimary = useMemo(() => HELP_PROMPTS.slice(0, 4), []);
  const helpMore = useMemo(() => HELP_PROMPTS.slice(4), []);

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
    setShowMore(false);
  }

  const primary = tab === "live" ? livePrimary : helpPrimary;
  const more = tab === "live" ? liveMore : helpMore;

  return (
    <div className="fixed bottom-5 right-5 z-50 select-none">
      {open && (
        <div className="w-[390px] h-[580px] bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center">
                <span className="text-lg">🤖</span>
              </div>
              <div className="leading-tight">
                <div className="font-extrabold tracking-wide">Exam Assistant</div>
                <div className="text-xs text-white/80">Minimal & reliable</div>
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

          {/* ✅ Sticky top bar (tabs + quick buttons) */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
            {/* Tabs + More */}
            <div className="px-4 pt-3 flex items-center gap-2">
              <button
                onClick={() => {
                  setTab("live");
                  setShowMore(false);
                }}
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
                onClick={() => {
                  setTab("help");
                  setShowMore(false);
                }}
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

              <button
                onClick={() => setShowMore((s) => !s)}
                className="text-xs font-semibold text-slate-600 hover:text-slate-900"
                title="Show more quick questions"
              >
                {showMore ? "Less" : "More"}
              </button>
            </div>

            {/* Primary chips */}
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

              {/* More drawer (compact, scrollable) */}
              {showMore && (
                <div className="mt-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 max-h-28 overflow-auto">
                  <div className="flex flex-wrap gap-2">
                    {more.map((it) => (
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
              )}
            </div>
          </div>

          {/* Messages (scrollable area only) */}
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
              <span className="font-semibold">Live (DB)</span> = guaranteed data.{" "}
              <span className="font-semibold">Help</span> = UI guidance.
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
