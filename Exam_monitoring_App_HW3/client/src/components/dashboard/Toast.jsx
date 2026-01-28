// client/src/components/dashboard/Toast.jsx
import { useEffect, useMemo } from "react";

function tone(type) {
  const t = String(type || "info").toLowerCase();
  if (t === "danger" || t === "error") {
    return {
      wrap: "border-rose-300 bg-rose-50 text-rose-950",
      badge: "bg-rose-600 text-white",
      bar: "bg-rose-500",
    };
  }
  if (t === "warning" || t === "warn") {
    return {
      wrap: "border-amber-300 bg-amber-50 text-amber-950",
      badge: "bg-amber-500 text-white",
      bar: "bg-amber-500",
    };
  }
  return {
    wrap: "border-sky-300 bg-white text-slate-950",
    badge: "bg-sky-600 text-white",
    bar: "bg-sky-500",
  };
}

export default function Toast({
  show,
  type = "info",
  title = "Update",
  message = "",
  durationMs = 2000,
  icon = "✅", // ✅ NEW: icon by action
  actionLabel = "", // ✅ NEW: e.g. "Go to Events"
  onAction, // ✅ NEW: callback
  onClose,
}) {
  const ui = useMemo(() => tone(type), [type]);

  useEffect(() => {
    if (!show) return;
    const t = setTimeout(() => onClose?.(), durationMs);
    return () => clearTimeout(t);
  }, [show, durationMs, onClose]);

  if (!show) return null;

  return (
    <div className="fixed top-5 right-5 z-[9999]">
      <div
        className={[
          "w-[420px] max-w-[92vw]",
          "rounded-3xl border shadow-2xl",
          "backdrop-blur",
          "overflow-hidden",
          "animate-[toastIn_.18s_ease-out]",
          ui.wrap,
        ].join(" ")}
        role="status"
      >
        {/* Progress bar */}
        <div className="h-1 w-full bg-black/5">
          <div
            className={`h-1 ${ui.bar}`}
            style={{ width: "100%", animation: `toastBar ${durationMs}ms linear forwards` }}
          />
        </div>

        <div className="p-4">
          <div className="flex items-start gap-3">
            <div className="text-2xl leading-none">{icon}</div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <div className="font-extrabold text-base">{title}</div>
                <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${ui.badge}`}>
                  LIVE
                </span>
              </div>

              <div className="mt-1 text-sm text-slate-700 break-words">{message}</div>

              <div className="mt-3 flex items-center gap-2">
                {actionLabel && typeof onAction === "function" ? (
                  <button
                    onClick={() => {
                      onAction();
                      onClose?.();
                    }}
                    className="px-3 py-1.5 rounded-2xl text-sm font-extrabold bg-slate-900 text-white hover:bg-slate-800"
                    title={actionLabel}
                  >
                    {actionLabel}
                  </button>
                ) : null}

                <button
                onClick={() => onClose?.()}
                className="ml-auto px-3 py-1.5 rounded-2xl text-sm font-bold bg-black/5 hover:bg-black/10"
              >
                Close
              </button>

              </div>
            </div>

            <button
              onClick={() => onClose?.()}
              className="text-slate-500 hover:text-slate-700 px-2 -mt-1"
              aria-label="Close"
            >
              ✕
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes toastIn {
          from { transform: translateY(-6px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
        @keyframes toastBar {
          from { transform: translateX(0); }
          to   { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
