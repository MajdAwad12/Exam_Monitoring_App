// client/src/components/auth/SupportBox.jsx
export default function SupportBox() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <div className="text-sm font-extrabold text-slate-900">
            Support & Helpdesk
          </div>
          <div className="mt-1 text-[12px] text-slate-600 leading-relaxed">
            Having trouble logging in? Contact the helpdesk below.
          </div>
        </div>

        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100 text-[11px] font-extrabold">
          ✅ Available
        </span>
      </div>

      <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <div className="text-[11px] font-extrabold text-slate-600">
            Email
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <span>📧</span>
            <span className="break-all">helpdesk@braude.ac.il</span>
          </div>
        </div>

        <div className="rounded-xl bg-slate-50 border border-slate-200 p-3">
          <div className="text-[11px] font-extrabold text-slate-600">
            Phone
          </div>
          <div className="mt-1 flex items-center gap-2 text-sm font-extrabold text-slate-900">
            <span>📞</span>
            <span>052-1234567</span>
          </div>
        </div>
      </div>

      <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-[12px] text-amber-900 font-semibold">
        ⚠️ For urgent exam-day issues, call the phone number above.
      </div>
    </div>
  );
}
