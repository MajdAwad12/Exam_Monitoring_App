// client/src/components/dashboard/Toast.jsx
import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { useTranslation } from "react-i18next";

export default function Toast({
  show,
  type = "info",
  title,
  message,
  duration = 3500,
  onClose,
}) {
  const { t } = useTranslation();

  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (show) setVisible(true);
  }, [show]);

  useEffect(() => {
    if (!show) return;

    const id = setTimeout(() => {
      setVisible(false);
      onClose?.();
    }, duration);

    return () => clearTimeout(id);
  }, [show, duration, onClose]);

  const cfg = useMemo(() => {
    // Keep the exact same mapping / logic, just provide translated defaults
    const defaults = {
      info: {
        title: t("dashboard.toast.infoTitle"),
        icon: "ℹ️",
      },
      success: {
        title: t("dashboard.toast.successTitle"),
        icon: "✅",
      },
      warning: {
        title: t("dashboard.toast.warningTitle"),
        icon: "⚠️",
      },
      danger: {
        title: t("dashboard.toast.dangerTitle"),
        icon: "⛔",
      },
    };

    return defaults[type] || defaults.info;
  }, [type, t]);

  if (!show) return null;

  const finalTitle = title ?? cfg.title;

  const node = (
    <div
      className={[
        "fixed z-[9999] right-4 top-4 w-[360px] rounded-2xl border bg-white dark:bg-slate-950 shadow-2xl",
        "p-4",
        visible ? "opacity-100 translate-y-0" : "opacity-0 -translate-y-2",
        "transition-all duration-200",
      ].join(" ")}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <div className="text-xl leading-none">{cfg.icon}</div>

        <div className="flex-1">
          <div className="flex items-center justify-between gap-2">
            <div className="font-semibold">{finalTitle}</div>
            <button
              type="button"
              onClick={() => {
                setVisible(false);
                onClose?.();
              }}
              className="rounded-lg px-2 py-1 text-sm text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-900"
              aria-label={t("dashboard.toast.close")}
              title={t("dashboard.toast.close")}
            >
              ✕
            </button>
          </div>

          {message ? (
            <div className="mt-1 text-sm text-slate-600 dark:text-slate-300">{message}</div>
          ) : null}
        </div>
      </div>
    </div>
  );

  return createPortal(node, document.body);
}
