// client/src/components/homepage/Header.jsx
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="sticky top-0 z-50 bg-white/90 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-4 flex items-center justify-between gap-6">
        {/* Brand (BIG Logo) */}
        <Link to="/" className="flex items-center gap-4 min-w-0 group">
          <img
            src="/system_logo.png"
            alt="Exam Monitoring Logo"
            className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-white shadow-md border border-slate-200 object-contain"
            onError={(e) => {
              e.currentTarget.style.display = "none";
              const sib = e.currentTarget.nextSibling;
              if (sib) sib.style.display = "inline-flex";
            }}
          />
          <span
            className="hidden items-center justify-center w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-100 border border-slate-200"
            style={{ display: "none" }}
          >
            ⏱️
          </span>

          <div className="min-w-0">
            <div className="text-lg sm:text-xl font-extrabold text-slate-900 leading-tight truncate">
              Exam Monitoring App
            </div>
            <div className="text-xs sm:text-sm text-slate-500 leading-tight truncate">
              Real-time supervision • Attendance • Integrity
            </div>
          </div>
        </Link>

        {/* Helpdesk (center on desktop) */}
        <div className="hidden lg:flex items-center gap-3 text-sm text-slate-600">
          <span className="inline-flex items-center gap-2">
            📧{" "}
            <a className="hover:underline" href="mailto:helpdesk@exam-monitoring.com">
              helpdesk@exam-monitoring.com
            </a>
          </span>
          <span className="text-slate-300">|</span>
          <span className="inline-flex items-center gap-2">
            ☎{" "}
            <a className="hover:underline" href="tel:+97231234567">
              +972-3-123-4567
            </a>
          </span>
        </div>

        {/* Auth buttons (BIGGER + CLEARER) */}
        <nav className="flex items-center gap-3 shrink-0">
          <Link
            to="/login"
            className="px-6 py-3 rounded-full border-2 border-slate-300 text-slate-900 hover:bg-slate-100 transition text-base font-extrabold shadow-sm"
          >
            Login
          </Link>

          <Link
            to="/register"
            className="px-6 py-3 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition text-base font-extrabold shadow-md"
          >
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}
