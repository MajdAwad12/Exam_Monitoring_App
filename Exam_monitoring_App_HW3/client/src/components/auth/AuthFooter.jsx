// client/src/components/auth/AuthFooter.jsx
export default function AuthFooter() {
  return (
    <footer className="mt-6 text-center">
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-2 text-xs text-white/80">
        <span className="font-extrabold text-white/90">Braude College</span>
        <span className="opacity-60">•</span>
        <span className="font-semibold">Web Course</span>
        <span className="opacity-60">•</span>
        <span className="font-semibold">Exam Monitoring Project</span>
      </div>

      <div className="mt-2 text-[11px] text-white/70">
        Team: <span className="font-semibold text-white/85">Majd</span>,{" "}
        <span className="font-semibold text-white/85">Ali</span>,{" "}
        <span className="font-semibold text-white/85">Bashar</span>,{" "}
        <span className="font-semibold text-white/85">Aya</span>
      </div>

      <div className="mt-3 flex items-center justify-center gap-2">
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-extrabold text-white/85">
          🔒 Role-based access
        </span>
        <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 border border-white/15 text-[11px] font-extrabold text-white/85">
          ⚡ Live dashboard
        </span>
      </div>
    </footer>
  );
}
