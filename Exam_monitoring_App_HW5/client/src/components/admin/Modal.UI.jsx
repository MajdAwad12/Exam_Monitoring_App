// ===============================
// file: client/src/components/admin/Modal.UI.jsx
// ===============================
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();

  useEffect(() => {
    if (!open) return;
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const bodyMax = Math.max(44, Math.min(74, maxVh - 22));

  return (
    <div className="fixed inset-0 z-50">
      <div className="absolute inset-0 bg-black/45" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-2 sm:p-4">
        <div
          className={`w-full ${maxWidth} overflow-hidden rounded-2xl sm:rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-2xl`}
          style={{ maxHeight: `${maxVh}vh` }}
          role="dialog"
          aria-modal="true"
        >
          {/* Header */}
          <div className="flex items-start justify-between gap-4 p-4">
            <div className="min-w-0">
              <div className="text-lg font-extrabold text-slate-900 dark:text-slate-100 truncate">
                {title}
              </div>
              {subtitle ? (
                <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                  {subtitle}
                </div>
              ) : null}
            </div>

            <button
              onClick={onClose}
              className="shrink-0 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 px-3 py-2 text-sm font-semibold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-900"
              title={t("common.close")}
              aria-label={t("common.close")}
            >
              ✕
            </button>
          </div>

          <div className="h-px bg-slate-200 dark:bg-slate-800" />

          {/* Body */}
          <div className="p-4 overflow-y-auto" style={{ maxHeight: `${bodyMax}vh` }}>
            {children}
          </div>

          {/* Footer */}
          {footer ? (
            <>
              <div className="h-px bg-slate-200 dark:bg-slate-800" />
              <div className="p-4 bg-slate-50 dark:bg-slate-900/40">{footer}</div>
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
}
