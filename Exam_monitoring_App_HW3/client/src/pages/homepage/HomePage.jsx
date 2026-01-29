//client /src /pages/homepage/HomePage.jsx
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      
      {/* ===== Top Bar (temporary, simple) ===== */}
      <header className="flex items-center justify-between px-8 py-4 bg-white shadow-sm">
        <div className="text-sm text-slate-600">
          📧 helpdesk@exam-monitoring.com | ☎ 03-1234567
        </div>

        <div className="flex gap-3">
          <Link
            to="/login"
            className="px-4 py-2 rounded-md border border-slate-300 text-slate-700 hover:bg-slate-100 transition"
          >
            Login
          </Link>

          <Link
            to="/register"
            className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 transition"
          >
            Register
          </Link>
        </div>
      </header>

      {/* ===== Hero Section ===== */}
      <main className="flex-1 flex flex-col items-center justify-center text-center px-6">
        <h1 className="text-4xl font-extrabold mb-4">
          Exam Monitoring System
        </h1>

        <p className="text-lg text-slate-600 max-w-2xl mb-8">
          A modern web platform for real-time exam supervision, student tracking,
          incident reporting, and academic integrity management.
        </p>

        <div className="flex gap-4">
          <Link
            to="/login"
            className="px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition"
          >
            Get Started
          </Link>

          <Link
            to="/register"
            className="px-6 py-3 rounded-lg border border-slate-300 font-semibold hover:bg-slate-100 transition"
          >
            Create Account
          </Link>
        </div>
      </main>

      {/* ===== Footer (temporary) ===== */}
      <footer className="py-4 text-center text-sm text-slate-500 bg-white border-t">
        © {new Date().getFullYear()} Exam Monitoring App
      </footer>
    </div>
  );
}
