// client/src/components/auth/LoginCard.jsx
export default function LoginCard({ shake, children }) {
  return (
    <div
      className={[
        "bg-white/95 backdrop-blur rounded-3xl shadow-2xl",
        "border border-white/40",
        "p-6 sm:p-8",
        shake ? "shake" : "",
      ].join(" ")}
    >
      {/* Inner mini-header (premium, not too big) */}
      <div className="mb-5">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-lg sm:text-xl font-extrabold text-slate-900">
              Welcome 👋
            </h3>
            <p className="text-sm text-slate-600">
              Sign in with your credentials.
            </p>
          </div>

          <div className="hidden sm:flex items-center gap-2">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold border border-slate-200">
              🔒 Secure
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 text-xs font-extrabold border border-slate-200">
              ⚡ Fast
            </span>
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
