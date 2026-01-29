// client/src/components/homepage/Header.jsx
import { Link } from "react-router-dom";

export default function Header() {
  return (
    <header className="bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
        {/* Left: Help desk */}
        <div className="text-xs sm:text-sm text-slate-600 flex flex-wrap gap-x-3 gap-y-1 items-center">
          <span className="inline-flex items-center gap-2">
            <span>📧</span>
            <a className="hover:underline" href="mailto:helpdesk@exam-monitoring.com">
              helpdesk@exam-monitoring.com
            </a>
          </span>

          <span className="hidden sm:inline text-slate-300">|</span>

          <span className="inline-flex items-center gap-2">
            <span>☎</span>
            <a className="hover:underline" href="tel:+97231234567">
              +972-3-123-4567
            </a>
          </span>
        </div>

        {/* Right: Auth buttons */}
        <nav className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 transition text-sm font-semibold"
          >
            Login
          </Link>

          <Link
            to="/register"
            className="px-4 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition text-sm font-semibold shadow-sm"
          >
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}
