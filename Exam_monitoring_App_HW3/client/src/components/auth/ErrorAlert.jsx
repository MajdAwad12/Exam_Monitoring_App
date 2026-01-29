// client/src/components/auth/ErrorAlert.jsx
export default function ErrorAlert(props) {
  // Support BOTH APIs:
  // 1) <ErrorAlert message="..." />
  // 2) <ErrorAlert type="error|success" text="..." />
  const type = props?.type || "error";
  const text = props?.text || props?.message || "";
  const isError = type === "error";

  if (!text) return null;

  return (
    <div
      className={[
        "mb-5 rounded-2xl border p-4 shadow-sm",
        isError
          ? "border-rose-200 bg-rose-50"
          : "border-emerald-200 bg-emerald-50",
      ].join(" ")}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        {/* Icon bubble */}
        <div
          className={[
            "mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-xl border",
            isError
              ? "bg-rose-100 border-rose-200 text-rose-700"
              : "bg-emerald-100 border-emerald-200 text-emerald-700",
          ].join(" ")}
        >
          {isError ? (
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
          ) : (
            <svg
              className="w-5 h-5"
              fill="currentColor"
              viewBox="0 0 20 20"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 10-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                clipRule="evenodd"
              />
            </svg>
          )}
        </div>

        <div className="min-w-0">
          <div
            className={[
              "text-sm font-extrabold",
              isError ? "text-rose-900" : "text-emerald-900",
            ].join(" ")}
          >
            {isError ? "Action failed" : "Success"}
          </div>

          <div
            className={[
              "mt-1 text-sm leading-relaxed break-words",
              isError ? "text-rose-800" : "text-emerald-800",
            ].join(" ")}
          >
            {text}
          </div>
        </div>
      </div>
    </div>
  );
}
