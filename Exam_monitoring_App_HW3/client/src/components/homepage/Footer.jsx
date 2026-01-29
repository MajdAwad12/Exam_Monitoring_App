// client/src/components/homepage/Header.jsx
import { Link, useLocation } from "react-router-dom";

export default function Header() {
  const { pathname } = useLocation();
  const isHome = pathname === "/";

  return (
    <header className="sticky top-0 z-50 bg-white/85 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between gap-4">
        {/* Left: Brand */}
        <div className="flex items-center gap-3 min-w-0">
          <Link to="/" className="flex items-center gap-3 group">
            {/* ✅ absolute path from /public */}
            <img
              src="/logo-mark.svg"
              alt="Exam Monitoring Logo"
              className="w-10 h-10 rounded-xl bg-white shadow-sm border border-slate-200 object-contain"
              onError={(e) => {
                // fallback: hide broken image, show emoji
                e.currentTarget.style.display = "none";
                const sib = e.currentTarget.nextSibling;
                if (sib) sib.style.display = "inline-flex";
              }}
            />
            <span
              className="hidden items-center justify-center w-10 h-10 rounded-xl bg-slate-100 border border-slate-200"
              style={{ display: "none" }}
            >
              ⏱️
            </span>

            <div className="min-w-0">
              <div className="text-sm sm:text-base font-extrabold text-slate-900 leading-tight truncate">
                Exam Monitoring App
              </div>
              <div className="text-[11px] sm:text-xs text-slate-500 leading-tight truncate">
                Real-time supervision • Attendance • Integrity
              </div>
            </div>
          </Link>
        </div>

        {/* Middle: Helpdesk */}
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

        {/* Right: Auth buttons (only here, no duplicates elsewhere) */}
        <nav className="flex items-center gap-3 shrink-0">
          <Link
            to="/login"
            className="px-4 py-2 rounded-full border border-slate-300 text-slate-800 hover:bg-slate-100 transition text-sm font-semibold"
          >
            Login
          </Link>

          <Link
            to="/register"
            className="px-4 py-2 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 transition text-sm font-semibold shadow-sm"
          >
            Register
          </Link>

          {/* subtle indicator on home */}
          {isHome ? (
            <span className="hidden sm:inline-flex px-3 py-2 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold border border-indigo-100">
              Home
            </span>
          ) : null}
        </nav>
      </div>
    </header>
  );
}
