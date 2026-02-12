// client/src/components/chat/FloatingChatWidget.jsx
import { useMemo, useRef, useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { chatWithAI } from "../../services/chat.service";

/**
 * Supervisor-first minimal chat UI (ENGLISH ONLY):
 * ✅ No tabs, no overload
 * ✅ Expand/Collapse "Quick Questions"
 * ✅ Only a few ready "help bubbles" for proctor during exam
 * ✅ Free text question is still supported
 * ✅ Messages scroll (real chat feel)
 * ✅ Clear button
 */

/* =========================
   Quick help bubbles (Supervisor)
   (Keep it short and direct)
========================= */
const QUICK_BUBBLE_KEYS = [
  { qKey: "chat.quick.nextExam", hintKey: "chat.quickHint.nextExam" },
  { qKey: "chat.quick.markStudent", hintKey: "chat.quickHint.markStudent" },
  { qKey: "chat.quick.toiletMoreThan3", hintKey: "chat.quickHint.toiletMoreThan3" },
  { qKey: "chat.quick.moveStudent", hintKey: "chat.quickHint.moveStudent" },
  { qKey: "chat.quick.notArrivedNames", hintKey: "chat.quickHint.notArrivedNames" },
];


/* =========================
   Helpers
========================= */
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function calcThinkingMs(userText) {
  const len = (userText || "").trim().length;
  const base = 220 + Math.min(420, Math.floor(len * 7));
  const jitter = Math.floor(Math.random() * 120);
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
      <path d="M8.2 12h.01M12 12h.01M15.8 12h.01" className="stroke-white" strokeWidth="2.2" strokeLinecap="round" />
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
      className="text-[11px] px-3 py-1.5 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-900 disabled:opacity-60 max-w-full"
      type="button"
    >
      <span className="truncate block max-w-[90vw] sm:w-[320px]">{text}</span>
    </button>
  );
}

/* =========================
   Component
========================= */
export default function FloatingChatWidget() {
  const { t, i18n } = useTranslation();
  const lang = i18n?.language || (typeof document !== "undefined" ? document.documentElement?.lang : "en") || "en";
  const isRtl = lang === "he" || (typeof document !== "undefined" && document.documentElement?.dir === "rtl");

  const [open, setOpen] = useState(false);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Expand/Collapse quick bubbles
  const [showQuick, setShowQuick] = useState(() => {
    const v = localStorage.getItem("chat_quick_collapsed");
    return v ? v !== "1" : true;
  });

  function toggleQuick() {
    setShowQuick((v) => {
      const next = !v;
      localStorage.setItem("chat_quick_collapsed", next ? "0" : "1");
      return next;
    });
  }

  const initialBotMessage = t("chat.initialMessage");

  const [messages, setMessages] = useState([{ from: "bot", text: initialBotMessage }]);
  const endRef = useRef(null);

  const bubbles = useMemo(() => QUICK_BUBBLE_KEYS.map((b) => ({ q: t(b.qKey), hint: t(b.hintKey) })), [t, lang]);

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
      const data = await chatWithAI({ message: clean, lang });
      const replyText = data?.text || "Sorry, I couldn't generate an answer. Try again.";
      await sleep(70 + Math.floor(Math.random() * 120));
      setMessages((m) => [...m, { from: "bot", text: replyText }]);
    } catch {
      await sleep(120);
      setMessages((m) => [...m, { from: "bot", text: t("chat.errors.connect") }]);
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
    <div className={"fixed bottom-5 " + (isRtl ? "left-5" : "right-5") + " z-50 select-none"} dir={isRtl ? "rtl" : "ltr"}>
      {open && (
        <div className="w-[92vw] sm:w-[380px] h-[75vh] max-h-[75vh] sm:h-[560px] sm:max-h-[560px] bg-white dark:bg-slate-950 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
          {/* Header */}
          <div className="px-4 py-3 bg-gradient-to-r from-sky-600 to-indigo-600 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-white/15 flex items-center justify-center">
                <span className="text-lg">🤖</span>
              </div>
              <div className="leading-tight">
                <div className="font-extrabold tracking-wide">{t("chat.title")}</div>
                <div className="text-xs text-white/80">{t("chat.subtitle")}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={clearChat}
                className="px-3 py-1.5 rounded-full bg-white/15 hover:bg-white/20 text-xs font-semibold"
                title={t("chat.actions.clearTitle")}
                type="button"
              >
                Clear
              </button>

              <button
                onClick={() => setOpen(false)}
                className="w-9 h-9 rounded-2xl hover:bg-white/15 flex items-center justify-center text-xl"
                title={t("chat.actions.close")}
                type="button"
              >
                ×
              </button>
            </div>
          </div>

          {/* Quick Questions (expand/collapse) */}
          <div className="sticky top-0 z-10 bg-white dark:bg-slate-950 border-b border-slate-200 dark:border-slate-800">
            <div className="px-4 py-3">
              <button
                onClick={toggleQuick}
                className="w-full flex items-center justify-between"
                type="button"
                title={showQuick ? t("chat.quick.collapseTitle") : t("chat.quick.expandTitle")}
              >
                <div className="text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">{t("chat.quick.label")}</div>
                <div className="text-sm font-extrabold text-slate-700 dark:text-slate-200">{showQuick ? "−" : "+"}</div>
              </button>

              {showQuick ? (
                <>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {bubbles.map((it) => (
                      <Chip key={it.q} text={it.q} hint={it.hint} disabled={isLoading} onClick={() => sendText(it.q)} />
                    ))}
                  </div>
                  <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
                    {t("chat.quick.tip")}
                  </div>
                </>
              ) : null}
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 px-3 py-3 overflow-auto space-y-2 bg-slate-50 dark:bg-slate-900/40">
            {messages.map((m, idx) => {
              const isMe = m.from === "me";
              return (
                <div key={idx} className={isMe ? "flex justify-end" : "flex justify-start"}>
                  <div
                    className={
                      "max-w-[85%] px-3 py-2 rounded-2xl text-sm whitespace-pre-wrap shadow-sm " +
                      (isMe
                        ? "bg-sky-600 text-white rounded-br-md"
                        : "bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md")
                    }
                  >
                    {m.text}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex justify-start">
                <div className="max-w-[85%] px-3 py-2 rounded-2xl text-sm bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-100 rounded-bl-md shadow-sm">
                  <div className="text-xs text-slate-500 dark:text-slate-400 dark:text-slate-500 mb-1">{t("chat.thinking")}</div>
                  <TypingDots />
                </div>
              </div>
            )}

            <div ref={endRef} />
          </div>

          {/* Input */}
          <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
            <div className="flex gap-2">
              <input
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                className="flex-1 px-3 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 focus:outline-none focus:ring-2 focus:ring-sky-200"
                placeholder={t("chat.input.placeholder")}
                disabled={isLoading}
              />
              <button
                onClick={send}
                disabled={isLoading || !input.trim()}
                className="px-4 py-2 rounded-2xl bg-sky-600 text-white font-semibold hover:bg-sky-700 disabled:opacity-60"
                type="button"
              >
                Send
              </button>
            </div>

            <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400 dark:text-slate-500">
              {t("chat.footerNote")}
            </div>
          </div>
        </div>
      )}

      {/* Bubble */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="w-14 h-14 rounded-full bg-gradient-to-r from-sky-600 to-indigo-600 text-white shadow-xl hover:brightness-110 flex items-center justify-center"
          title={t("chat.actions.openTitle")}
          type="button"
        >
          <BubbleIcon />
        </button>
      )}
    </div>
  );
}
