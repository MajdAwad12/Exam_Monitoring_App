// client/src/components/auth/DemoAccountsBox.jsx
export default function DemoAccountsBox({ demoUsers = [], isLoading, onFill }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-slate-900">
            Demo Accounts
          </div>
          <div className="mt-1 text-[12px] text-slate-600 leading-relaxed">
            Use these accounts for quick testing. Click{" "}
            <span className="font-bold text-slate-800">Fill</span> to populate the
            form instantly.
          </div>
        </div>

        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100 text-[11px] font-extrabold">
          ⚡ Fast login
        </span>
      </div>

      {/* Accounts list */}
      <div className="mt-4 space-y-2">
        {demoUsers.map((d, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-3 rounded-xl bg-white border border-slate-200 px-3 py-2"
          >
            <div className="min-w-0">
              <div className="text-sm font-extrabold text-slate-900">
                {d.label}
              </div>
              <div className="text-[12px] text-slate-600 truncate">
                <span className="font-semibold text-slate-700">{d.u}</span>{" "}
                <span className="text-slate-400">/</span>{" "}
                <span className="font-semibold text-slate-700">{d.p}</span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onFill?.(d)}
              disabled={isLoading}
              className={[
                "shrink-0 rounded-full px-3 py-1.5 text-xs font-extrabold",
                "bg-slate-900 text-white",
                "hover:bg-slate-800",
                "focus:outline-none focus:ring-4 focus:ring-slate-200",
                "transition shadow-sm",
                "disabled:opacity-60 disabled:cursor-not-allowed",
              ].join(" ")}
            >
              Fill
            </button>
          </div>
        ))}
      </div>

      {/* Note */}
      <div className="mt-3 text-[11px] text-slate-500 leading-relaxed">
        Tip: test multiple roles (Admin / Supervisors / Lecturer) to validate
        all features in the system.
      </div>
    </div>
  );
}
