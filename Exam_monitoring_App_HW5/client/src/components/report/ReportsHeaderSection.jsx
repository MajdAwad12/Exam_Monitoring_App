import React from "react";

export default function ReportsHeaderSection({ title, subtitle }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">{title}</h2>
        {subtitle ? (
          <p className="text-sm text-slate-600 dark:text-slate-300 max-w-3xl mt-1">{subtitle}</p>
        ) : null}
      </div>
    </div>
  );
}
