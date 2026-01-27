// client/src/components/dashboard/Toast.jsx
import { useEffect } from "react";

function toneClasses(type) {
  const t = String(type || "info").toLowerCase();

  if (t === "ok" || t === "success") {
    return "border-emerald-200 bg-emerald-50 text-emerald-900";
  }
  if (t === "warn" || t === "warning") {
    return "border-amber-200 bg-amber-50 text-amber-900";
  }
  if (t === "error" || t === "danger") {
    return "border-rose-200 bg-rose-50 text-rose-900";
  }
  return "border-slate-200 bg-white text-slate-900";
}

/**
 * Toast (single)
 * - fixed, floating "cloud" notification
 * - auto hides after `durationMs`
 *
 * usage:
 * <Toast toast={toast} onClose={() => setToast(null)} />
 *
 * toast: { title?: string, message: string, type?: "info"|"success"|"warning"|"error", durationMs?: number }
 */
export default function Toast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return;

    const ms = Number(toast?.durationMs || 2600);
    const t = setTimeout(() => onClose?.(), Math.max(800, ms));
    return () => clearTimeout(t);
  }, [toast, onClose]);

  if (!toast) return null;

  const type = toast?.type || "info";
  const title = String(toast?.title || "").trim();
  const message = String(toast?.message || "").trim();

  return (
    <div className="fixed top-4 right-4 z-[80] w-[min(420px,92vw)]">
      <div
        className={`rounded-3xl border shadow-xl px-4 py-3 ${toneClasses(type)}`}
        role="status"
        aria-live="polite"
      >
        <div className="flex items-start gap-3">
          <div className="mt-0.5 text-lg">
            {String(type).toLowerCase() === "success" || String(type).toLowerCase() === "ok"
              ? "✅"
              : String(type).toLowerCase() === "warning" || String(type).toLowerCase() === "warn"
              ? "⚠️"
              : String(type).toLowerCase() === "error" || String(type).toLowerCase() === "danger"
              ? "❌"
              : "🔔"}
          </div>

          <div className="min-w-0">
            {title ? <div className="text-sm font-extrabold truncate">{title}</div> : null}
            {message ? <div className="text-sm font-bold text-slate-700">{message}</div> : null}
          </div>

          <button
            onClick={onClose}
            className="ml-auto shrink-0 px-3 py-1.5 rounded-2xl border border-slate-200 bg-white/70 hover:bg-white text-xs font-extrabold"
            title="Close"
          >
            ✕
          </button>
        </div>
      </div>
    </div>
  );
}
