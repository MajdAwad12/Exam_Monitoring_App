// client/src/pages/homepage/HomePage.jsx
import Header from "../../components/homepage/Header.jsx";
import Footer from "../../components/homepage/Footer.jsx";

const STATS = [
  { label: "Global Users", value: "2M+" },
  { label: "Users in Israel", value: "55K+" },
  { label: "System Uptime", value: "99.9%" },
];

const FEATURES = [
  { icon: "🗺️", title: "Live Classroom Map", desc: "Track seat status & attendance in real time per classroom." },
  { icon: "⚡", title: "Instant Incident Logging", desc: "Create a clean exam timeline with fast reporting." },
  { icon: "🛡️", title: "Role-Based Dashboards", desc: "Supervisor and Lecturer flows stay consistent and secure." },
  { icon: "🎓", title: "Student Portal (Read-Only)", desc: "Students view their report without admin controls." },
];

export default function HomePage() {
  function scrollToId(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-white text-slate-900">
      <Header />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-800 via-sky-700 to-cyan-500" />
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[32rem] h-[32rem] rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div className="text-white">
            <div className="inline-flex items-center gap-3 px-3 py-2 rounded-full bg-white/10 border border-white/20 text-xs font-bold">
              <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-white/15 border border-white/20">
                ✅
              </span>
              Production-style UI • Clean • Modern
            </div>

            <div className="mt-6 flex items-center gap-4">
              <img
                src="/system_logo.png"
                alt="System Logo"
                className="w-14 h-14 rounded-2xl bg-white/10 border border-white/20 object-contain shadow-lg"
              />
              <div>
                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
                  Exam Monitoring App
                </h1>
                <p className="text-white/85 mt-1">
                  Real-time supervision • Attendance • Integrity
                </p>
              </div>
            </div>

            <p className="mt-5 text-white/90 text-lg max-w-xl">
              A smart web platform for live exam supervision, attendance tracking,
              incident reporting, and structured exam management.
            </p>

            {/* ✅ no login/register here (no duplicates) */}
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => scrollToId("overview")}
                className="px-6 py-3 rounded-full bg-white text-indigo-700 font-extrabold hover:bg-slate-100 transition shadow-lg"
              >
                Explore the Platform
              </button>

              <button
                type="button"
                onClick={() => scrollToId("dashboard")}
                className="px-6 py-3 rounded-full bg-white/10 border border-white/25 text-white font-bold hover:bg-white/15 transition"
              >
                View Dashboard Preview
              </button>
            </div>

            <div className="mt-10 grid grid-cols-3 gap-3 max-w-xl">
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-white/10 border border-white/15 px-4 py-3"
                >
                  <div className="text-2xl font-extrabold">{s.value}</div>
                  <div className="text-xs text-white/80">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero image */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-xl">
              <div className="absolute -inset-3 rounded-[2rem] bg-white/10 blur-xl" />
              <img
                src="/hero-classroom.jpg"
                alt="Exam classroom monitoring"
                className="relative w-full rounded-[2rem] shadow-2xl border border-white/20 object-cover max-h-[420px]"
              />
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-slate-900/40 border border-white/15 backdrop-blur px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-white">
                    <div className="text-sm font-extrabold">Live Supervision</div>
                    <div className="text-xs text-white/80">
                      Seat actions • Attendance • Incidents
                    </div>
                  </div>
                  <div className="text-xs font-extrabold text-white bg-white/10 border border-white/15 px-3 py-2 rounded-full">
                    Real-time
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="overview" className="bg-white">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900">
                Built like a real product
              </h2>
              <p className="mt-2 text-slate-600 max-w-2xl">
                Fast workflow, clear UX, and a consistent design language across the system.
              </p>
            </div>
            <div className="inline-flex items-center gap-2 text-xs font-bold text-slate-600">
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Stable UI • Consistent Design
            </div>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-3xl border border-slate-200 bg-slate-50 p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition"
              >
                <div className="w-12 h-12 rounded-2xl bg-white border border-slate-200 flex items-center justify-center text-2xl shadow-sm">
                  {f.icon}
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600">{f.desc}</p>
                <div className="mt-4 h-1 w-10 rounded-full bg-indigo-600/80 group-hover:w-16 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DASHBOARD PREVIEW ===== */}
      <section id="dashboard" className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-extrabold text-slate-900">
              Dashboard Preview
            </h2>
            <p className="mt-3 text-slate-600 max-w-xl">
              A single place to monitor classrooms, manage attendance states, and take actions quickly.
            </p>

            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                <div className="text-sm font-extrabold text-slate-900">Fast Actions</div>
                <div className="text-xs text-slate-600 mt-1">One-click updates and consistent UI feedback.</div>
              </div>
              <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
                <div className="text-sm font-extrabold text-slate-900">Clear Visibility</div>
                <div className="text-xs text-slate-600 mt-1">Organized panels with live indicators.</div>
              </div>
            </div>
          </div>

          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-2xl">
              <div className="absolute -inset-3 rounded-[2rem] bg-indigo-200/40 blur-2xl" />
              <img
                src="/dashboardPIC.png"
                alt="Exam Monitoring Dashboard"
                className="relative w-full rounded-[2rem] shadow-2xl border border-slate-200"
              />
            </div>
          </div>
        </div>
      </section>

      {/* ✅ Footer only (social + contact) */}
      <Footer />
    </div>
  );
}
