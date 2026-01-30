import { useEffect } from "react";

export default function ModalUI({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = "max-w-xl",
  maxVh = 85,
}) {
  useEffect(() => {
    if (!open) return;

    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const bodyMax = Math.max(40, Math.min(72, maxVh - 25));

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div
          className={`w-full ${maxWidth} bg-white rounded-3xl shadow-2xl border border-slate-200 overflow-hidden`}
          style={{ maxHeight: `${maxVh}vh` }}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 p-4 border-b border-slate-200">
            <div>
              <div className="text-lg font-extrabold text-slate-900">
                {title}
              </div>
              {subtitle ? (
                <div className="text-sm text-slate-600 mt-1">
                  {subtitle}
                </div>
              ) : null}
            </div>

            <button
              onClick={onClose}
              className="shrink-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              title="Close"
            >
              ✕
            </button>
          </div>

          {/* Body */}
          <div
            className="p-4 overflow-y-auto"
            style={{ maxHeight: `${bodyMax}vh` }}
          >
            {children}
          </div>

          {/* Footer */}
          {footer ? (
            <div className="p-4 border-t border-slate-200 bg-slate-50">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
