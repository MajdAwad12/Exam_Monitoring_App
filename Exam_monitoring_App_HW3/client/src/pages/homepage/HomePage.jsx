// client/src/pages/homepage/HomePage.jsx
import { Link } from "react-router-dom";
import Header from "../../components/homepage/Header.jsx";
import Footer from "../../components/homepage/Footer.jsx";

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-slate-800">
      <Header />

      {/* ===== Hero Section ===== */}
      <section className="flex-1 bg-gradient-to-br from-indigo-700 via-sky-600 to-cyan-400">
        <div className="mx-auto max-w-7xl px-6 py-24 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          
          {/* Text */}
          <div className="text-white">
            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight mb-6">
              Smart Exam Monitoring <br /> & Attendance System
            </h1>

            <p className="text-lg text-white/90 max-w-xl mb-8">
              Monitor exams in real time, manage attendance, track incidents,
              and ensure academic integrity with a modern web-based platform.
            </p>

            <div className="flex flex-wrap gap-4">
              <Link
                to="/login"
                className="px-8 py-3 rounded-full bg-white text-indigo-700 font-bold hover:bg-slate-100 transition"
              >
                Login
              </Link>

              <Link
                to="/register"
                className="px-8 py-3 rounded-full border border-white text-white font-bold hover:bg-white/10 transition"
              >
                Register
              </Link>
            </div>
          </div>

          {/* Image */}
          <div className="flex justify-center">
            <img
              src="/hero-classroom.jpg"
              alt="Exam classroom monitoring"
              className="rounded-3xl shadow-2xl max-h-[420px] object-cover"
            />
          </div>
        </div>
      </section>

      {/* ===== Stats Section ===== */}
      <section className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16 grid grid-cols-1 md:grid-cols-3 gap-8 text-center">
          
          <div className="bg-white rounded-2xl shadow-md p-8">
            <p className="text-sm text-slate-500 mb-2">Global Users</p>
            <p className="text-4xl font-extrabold text-indigo-600">2M+</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-8">
            <p className="text-sm text-slate-500 mb-2">Users in Israel</p>
            <p className="text-4xl font-extrabold text-indigo-600">55K+</p>
          </div>

          <div className="bg-white rounded-2xl shadow-md p-8">
            <p className="text-sm text-slate-500 mb-2">System Uptime</p>
            <p className="text-4xl font-extrabold text-indigo-600">99.9%</p>
          </div>
        </div>
      </section>
        {/* ===== Dashboard Preview ===== */}
        <section className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            
    {/* Image */}
        <div className="flex justify-center">
        <img
            src="/dashboardPIC.png"
            alt="Exam Monitoring Dashboard"
            className="rounded-3xl shadow-2xl border border-slate-200"
        />
        </div>

        {/* Text */}
        <div>
        <h2 className="text-3xl font-extrabold text-slate-800 mb-4">
            Real-Time Exam Dashboard
        </h2>

        <p className="text-slate-600 max-w-md">
            Monitor classrooms live, track attendance, manage incidents,
            and control exams from a single intuitive dashboard.
        </p>
        </div>
    </div>
    </section>

      <Footer />
    </div>
  );
}
