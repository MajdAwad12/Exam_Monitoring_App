// client/src/components/homepage/Header.jsx
import { Link, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";

export default function Header() {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  // Close dropdown on outside click
  useEffect(() => {
    function onClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onClickOutside);
    return () => document.removeEventListener("mousedown", onClickOutside);
  }, []);

  function go(to) {
    setOpen(false);
    navigate(to);
  }

  return (
    <header className="bg-white/80 backdrop-blur border-b border-slate-200">
      <div className="mx-auto max-w-7xl px-6 py-3 flex items-center justify-between">
        {/* Left: Help desk */}
        <div className="text-xs sm:text-sm text-slate-600 flex flex-wrap gap-x-3 gap-y-1 items-center">
          <span className="inline-flex items-center gap-2">
            📧
            <a className="hover:underline" href="mailto:helpdesk@exam-monitoring.com">
              helpdesk@exam-monitoring.com
            </a>
          </span>
          <span className="hidden sm:inline text-slate-300">|</span>
          <span className="inline-flex items-center gap-2">
            ☎
            <a className="hover:underline" href="tel:+97231234567">
              +972-3-123-4567
            </a>
          </span>
        </div>

        {/* Right: Login dropdown + Register */}
        <nav className="flex items-center gap-3 relative" ref={menuRef}>
          {/* Login dropdown */}
          <button
            onClick={() => setOpen((v) => !v)}
            className="px-4 py-2 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-100 transition text-sm font-semibold"
          >
            Login
          </button>

          {open && (
            <div className="absolute right-0 top-12 w-48 rounded-xl bg-white shadow-lg border border-slate-200 overflow-hidden z-50">
                <button
                onClick={() => go("/login?role=admin")}
                className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm"
                >
                Admin
                </button>
                <button
                onClick={() => go("/login?role=lecturer")}
                className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm"
                >
                Lecturer
                </button>
                <button
                onClick={() => go("/login?role=supervisor")}
                className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm"
                >
                Supervisor
                </button>
                <div className="border-t" />
                <button
                onClick={() => go("/login?role=student")}
                className="w-full text-left px-4 py-2 hover:bg-slate-100 text-sm font-semibold"
                >
                Student
                </button>
            </div>
            )}


          {/* Register */}
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
