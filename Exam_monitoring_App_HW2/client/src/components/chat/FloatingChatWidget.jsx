// client/src/components/chat/FloatingChatWidget.jsx
import { useMemo, useRef, useState, useEffect } from "react";
import { chatWithAI } from "../../services/chat.service";

/**
 * Supervisor-first minimal chat UI:
 * ✅ No tabs, no overload
 * ✅ Only a few ready "help bubbles" for proctor during exam
 * ✅ Free text question is still supported
 * ✅ Messages scroll (real chat feel)
 * ✅ Clear button
 */

/* =========================
   Quick help bubbles (Supervisor)
   (Keep it short and direct)
========================= */
const QUICK_BUBBLES = [
  { q: "מה המבחן הנוכחי?", hint: "Shows the running exam (DB truth)." },
  { q: "כמה סטודנטים לא הגיעו?", hint: "Not arrived count (DB truth)." },
  { q: "מי יצא לשירותים יותר מ 3 פעמים?", hint: "Lists students with toilet exits > 3." },
  { q: "איזה סטודנט בחוץ עכשיו?", hint: "Students outside now (temp_out / active toilet)." },
  { q: "מי לא הגיע עדיין? (רשימה)", hint: "List not arrived students (safe truncation)." },
  { q: "How do I track a toilet break?", hint: "UI guidance only." },
];

/* =========================
   Helpers
========================= */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function calcThinkingMs(userText) {
  const len = (userText || "").trim().length;
  const base = 260 + Math.min(520, Math.floor(len * 8));
  const jitter = Math.floor(Math.random() * 150);
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
      <span className="truncate block max-w-[280px]">{text}</span>
    </button>
  );
}

/* =========================
   Component
========================= */
export default function FloatingChatWidget() {
  const [open, setOpen] = useState(false);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const initialBotMessage =
    "Hi 👋 I’m your Exam Assistant.\n" +
    "Use the bubbles for fast supervisor answers (DB).\n" +
    'Or type a question (Hebrew/English).';

  const [messages, setMessages] = useState([{ from: "bot", text: initialBotMessage }]);
  const endRef = useRef(null);

  const bubbles = useMemo(() => QUICK_BUBBLES, []);

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
      await sleep(80 + Math.floor(Math.random() * 140));
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
                <div className="text-xs text-white/80">Supervisor quick help</div>
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

          {/* Bubbles (sticky) */}
          <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
            <div className="px-4 py-3">
              <div className="text-[11px] text-slate-500 mb-2">Quick supervisor questions</div>
              <div className="flex flex-wrap gap-2">
                {bubbles.map((it) => (
                  <Chip key={it.q} text={it.q} hint={it.hint} disabled={isLoading} onClick={() => sendText(it.q)} />
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
                placeholder='Type a question… (e.g., "כמה סטודנטים לא הגיעו?")'
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

            <div className="mt-2 text-[11px] text-slate-500">Tip: Use bubbles for instant supervisor answers.</div>
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
