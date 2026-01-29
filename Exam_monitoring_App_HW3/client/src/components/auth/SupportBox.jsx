// client/src/components/auth/SupportBox.jsx
export default function SupportBox() {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <div className="text-sm font-semibold text-slate-800">
        Support & Helpdesk
      </div>

      <p className="mt-1 text-xs text-slate-600">
        Having trouble logging in? Contact the helpdesk below.
      </p>

      <div className="mt-3 space-y-1 text-sm text-slate-700">
        <div>
          <span className="font-semibold">Email:</span>{" "}
          helpdesk@braude.ac.il
        </div>
        <div>
          <span className="font-semibold">Phone:</span>{" "}
          052-1234567
        </div>
      </div>

      <p className="mt-3 text-[11px] text-slate-500">
        For urgent exam-day issues, please use the phone number above.
      </p>
    </div>
  );
}
