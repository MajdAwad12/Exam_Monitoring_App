// client/src/components/auth/DemoAccountsBox.jsx
export default function DemoAccountsBox({ demoUsers = [], isLoading, onFill }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-sm font-semibold text-slate-800">
        Demo accounts
      </div>
      <div className="mt-1 text-xs text-slate-600">
        Click “Fill” to insert credentials quickly.
      </div>

      <div className="mt-3 space-y-2">
        {demoUsers.map((d, idx) => (
          <div
            key={idx}
            className="flex items-center justify-between gap-3 rounded-lg bg-white border border-slate-200 px-3 py-2"
          >
            <div className="text-sm">
              <span className="font-semibold text-slate-900">{d.label}</span>
              <span className="text-slate-500"> — {d.u} / {d.p}</span>
            </div>

            <button
              type="button"
              onClick={() => onFill?.(d)}
              disabled={isLoading}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold
                         hover:bg-slate-50 transition disabled:opacity-60"
            >
              Fill
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
