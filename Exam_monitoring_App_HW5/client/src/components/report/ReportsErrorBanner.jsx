import React from "react";

export default function ReportsErrorBanner({ err, title }) {
  if (!err) return null;
  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50 text-rose-900 p-4">
      <div className="font-bold text-sm">{title}</div>
      <div className="text-sm mt-1">{err}</div>
    </div>
  );
}
