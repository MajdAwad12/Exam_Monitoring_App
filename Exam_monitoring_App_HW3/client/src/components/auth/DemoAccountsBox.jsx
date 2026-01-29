// client/src/components/auth/DemoAccountsBox.jsx
export default function DemoAccountsBox({ demoUsers = [], isLoading, onFill }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-800">
        Demo accounts
      </div>

      <p className="mt-1 text-xs text-slate-600">
        Click “Fill” to quickly insert demo credentials.
      </p>

      <div className="mt-3 space-y-2">
        {demoUsers.map((d, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between rounded-xl bg-white border border-slate-200 px-3 py-2"
          >
            <div className="text-sm text-slate-800">
              <span className="font-semibold">{d.label}</span>
              <span className="text-slate-500">
                {" "}
                — {d.u} / {d.p}
              </span>
            </div>

            <button
              type="button"
              onClick={() => onFill?.(d)}
              disabled={isLoading}
              className="rounded-lg border border-slate-300 bg-white px-3 py-1.5
                         text-xs font-semibold text-slate-700
                         hover:bg-slate-100 transition
                         disabled:opacity-60 disabled:cursor-not-allowed"
            >
              Fill
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
