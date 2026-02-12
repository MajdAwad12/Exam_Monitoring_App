export default function ErrorAlert(props) {
  // Support BOTH APIs:
  // 1) <ErrorAlert message="..." />
  // 2) <ErrorAlert type="error|success|info|warning" text="..." onClose={() => ...} />

  const type = (props?.type || "error").toLowerCase();
  const text = props?.text || props?.message || "";
  const onClose = props?.onClose;

  if (!text) return null;

  const cfg = {
    error: {
      title: "Action failed",
      wrap: "border-rose-200 bg-rose-50",
      bubble: "bg-rose-100 border-rose-200 text-rose-700",
      titleText: "text-rose-900",
      bodyText: "text-rose-800",
    },
    success: {
      title: "Success",
      wrap: "border-emerald-200 bg-emerald-50",
      bubble: "bg-emerald-100 border-emerald-200 text-emerald-700",
      titleText: "text-emerald-900",
      bodyText: "text-emerald-800",
    },
    info: {
      title: "Info",
      wrap: "border-sky-200 bg-sky-50",
      bubble: "bg-sky-100 border-sky-200 text-sky-700",
      titleText: "text-sky-900",
      bodyText: "text-sky-800",
    },
    warning: {
      title: "Please notice",
      wrap: "border-amber-200 bg-amber-50",
      bubble: "bg-amber-100 border-amber-200 text-amber-700",
      titleText: "text-amber-900",
      bodyText: "text-amber-800",
    },
  };

  const theme = cfg[type] || cfg.info;

  return (
    <div
      className={[
        "mb-5 rounded-2xl border p-4 shadow-sm relative",
        theme.wrap,
      ].join(" ")}
      role="alert"
      aria-live="polite"
    >
      {/* ❌ Close button */}
      {onClose && (
        <button
          type="button"
          onClick={onClose}
          aria-label="Close"
          className="absolute top-2 right-2 rounded-lg p-1
                     text-slate-500 dark:text-slate-400 dark:text-slate-500 hover:text-slate-800 dark:text-slate-100
                     hover:bg-white/60 transition"
        >
          ✕
        </button>
      )}

      <div className="flex items-start gap-3">
        {/* Icon bubble */}
        <div
          className={[
            "mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border",
            theme.bubble,
          ].join(" ")}
        >
          {type === "error" ? "❌" : type === "success" ? "✔️" : type === "warning" ? "⚠️" : "ℹ️"}
        </div>

        <div className="min-w-0">
          <div className={["text-sm font-extrabold", theme.titleText].join(" ")}>
            {theme.title}
          </div>

          <div
            className={[
              "mt-1 text-sm leading-relaxed break-words",
              theme.bodyText,
            ].join(" ")}
          >
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}
