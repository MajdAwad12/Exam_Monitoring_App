// client/src/pages/homepage/HomePage.jsx
import Header from "../../components/homepage/Header.jsx";
import Footer from "../../components/homepage/Footer.jsx";

const STATS = [
  { label: "Global Users", value: "2M+" },
  { label: "Users in Israel", value: "55K+" },
  { label: "System Uptime", value: "100%" },
];

const FEATURES = [
  {
    icon: "🗺️",
    title: "Live Classroom Map",
    desc: "Track seat status & attendance in real time per classroom.",
  },
  {
    icon: "⚡",
    title: "Instant Incident Logging",
    desc: "Create a clean exam timeline with fast reporting.",
  },
  {
    icon: "🛡️",
    title: "Role-Based Dashboards",
    desc: "Supervisor and Lecturer flows stay consistent and secure.",
  },
  {
    icon: "🎓",
    title: "Student Portal (Read-Only)",
    desc: "Students view their report without admin controls.",
  },
];

// ✅ Update src names here to match EXACT filenames in /public
const TOUR = [
  {
    key: "examlist",
    src: "/examlistPIC.png",
    alt: "Exam List",
    title: "Exam List — Organized & Fast",
    desc: "Browse active exams instantly, jump into the right room, and stay in control with a clear, structured view.",
    bullets: ["One-click access", "Clean layout", "Zero confusion"],
  },
  {
    key: "reports",
    src: "/reportANDhistoryPIC.png",
    alt: "Reports & History",
    title: "Reports & History — Ready for Review",
    desc: "Get a full exam story: attendance, incidents, and key actions — presented in a professional, readable format.",
    bullets: ["Timeline clarity", "Audit-friendly", "Export-ready"],
  },
  {
    key: "manage",
    src: "/manageEXAMPIC.png",
    alt: "Manage Exams",
    title: "Manage Exams — Full Control",
    desc: "Create, edit, and manage exam settings with confidence. Built for staff workflows and real operation needs.",
    bullets: ["Role-based actions", "Safe updates", "Production-style UX"],
  },
  {
    key: "chatbot",
    src: "/chatbotPIC.png",
    alt: "Chatbot",
    title: "Smart Assistant — Help in Seconds",
    desc: "A built-in assistant to guide staff quickly, reduce mistakes, and keep the workflow moving during pressure time.",
    bullets: ["Instant guidance", "Less support load", "Smooth experience"],
  },
];

function Pill({ children }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-2 rounded-full">
      {children}
    </span>
  );
}

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
        {/* background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-sky-800 to-cyan-600" />
        <div className="absolute -top-28 -left-28 w-[26rem] h-[26rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-36 -right-36 w-[34rem] h-[34rem] rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div className="text-white">
            {/* Brand row (BIG logo + title) */}
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-white/10 border border-white/20 backdrop-blur shadow-xl flex items-center justify-center overflow-hidden">
                <img
                  src="/system_logo.png"
                  alt="System Logo"
                  className="w-full h-full object-cover"
                />
              </div>

              <div className="min-w-0">
                <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
                  Exam Monitoring App
                </h1>
                <p className="text-white/85 mt-1 text-sm md:text-base">
                  Real-time supervision • Attendance • Integrity
                </p>
              </div>
            </div>

            <p className="mt-6 text-white/90 text-lg max-w-xl leading-relaxed">
              A smart web platform for live exam supervision, attendance tracking,
              incident reporting, and structured exam management.
            </p>

            {/* ✅ no login/register here */}
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => scrollToId("overview")}
                className="px-7 py-3.5 rounded-full bg-white text-indigo-700 font-extrabold
                           hover:bg-slate-100 transition shadow-lg"
              >
                Explore the Platform
              </button>

              <button
                type="button"
                onClick={() => scrollToId("dashboard")}
                className="px-7 py-3.5 rounded-full bg-white/10 border border-white/25 text-white font-extrabold
                           hover:bg-white/15 transition"
              >
                View Dashboard Preview
              </button>
            </div>

            {/* Stats */}
            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl">
              {STATS.map((s) => (
                <div
                  key={s.label}
                  className="rounded-2xl bg-white/10 border border-white/15 px-5 py-4"
                >
                  <div className="text-2xl font-extrabold">{s.value}</div>
                  <div className="text-xs text-white/80 mt-1">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero image */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-xl">
              <div className="absolute -inset-4 rounded-[2.2rem] bg-white/10 blur-2xl" />
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

              <p className="mt-3 text-xs text-white/70">
                Clean UI • Fast actions • Consistent feedback
              </p>
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

            <Pill>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              Stable UI • Consistent Design
            </Pill>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.title}
                className="group rounded-3xl border border-slate-200 bg-white p-6 shadow-sm
                           hover:shadow-xl hover:-translate-y-0.5 transition"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center text-2xl shadow-sm">
                  {f.icon}
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-slate-900">
                  {f.title}
                </h3>
                <p className="mt-2 text-sm text-slate-600 leading-relaxed">{f.desc}</p>
                <div className="mt-4 h-1 w-10 rounded-full bg-indigo-600/80 group-hover:w-16 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DASHBOARD PREVIEW + TOUR ===== */}
      <section id="dashboard" className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900">
                Dashboard Preview
              </h2>
              <p className="mt-3 text-slate-600 max-w-2xl leading-relaxed">
                A focused, production-style dashboard built for speed: clear visibility,
                fast actions, and smooth navigation during real exams.
              </p>
            </div>

            <Pill>
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              Real Screens • Real Workflow
            </Pill>
          </div>

          {/* Main preview (dashboardPIC.png) */}
          <div className="mt-10">
            <div className="relative w-full">
              <div className="absolute -inset-4 rounded-[2rem] bg-indigo-200/50 blur-2xl" />
              <img
                src="/dashboardPIC.png"
                alt="Exam Monitoring Dashboard"
                className="relative w-full rounded-[2rem] shadow-2xl border border-slate-200 object-cover"
              />
            </div>
          </div>

          {/* TOUR - your added screenshots */}
          <div className="mt-12 grid grid-cols-1 lg:grid-cols-2 gap-8">
            {TOUR.map((t, idx) => (
              <div
                key={t.key}
                className="rounded-3xl bg-white border border-slate-200 shadow-sm hover:shadow-xl transition overflow-hidden"
              >
                <div className="p-5 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-extrabold text-indigo-700">
                      SCREEN {String(idx + 1).padStart(2, "0")}
                    </div>
                    <h3 className="mt-1 text-xl font-extrabold text-slate-900">
                      {t.title}
                    </h3>
                    <p className="mt-2 text-sm text-slate-600 leading-relaxed">
                      {t.desc}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {t.bullets.map((b) => (
                        <span
                          key={b}
                          className="text-xs font-extrabold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-1.5 rounded-full"
                        >
                          {b}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="px-5 pb-5">
                  <div className="relative">
                    <div className="absolute -inset-3 rounded-2xl bg-slate-200/40 blur-xl" />
                    <img
                      src={t.src}
                      alt={t.alt}
                      className="relative w-full rounded-2xl border border-slate-200 shadow-lg object-cover"
                    />
                  </div>

                  <p className="mt-3 text-[11px] text-slate-500">
                    Tip: If the image doesn’t show, double-check the exact filename in <code>/public</code>.
                  </p>
                </div>
              </div>
            ))}
          </div>

          {/* Small extra cards */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900">Fast Actions</div>
              <div className="text-xs text-slate-600 mt-1">
                One-click updates and consistent UI feedback.
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900">Clear Visibility</div>
              <div className="text-xs text-slate-600 mt-1">
                Organized panels with live indicators.
              </div>
            </div>

            <div className="rounded-2xl bg-white border border-slate-200 p-4 shadow-sm">
              <div className="text-sm font-extrabold text-slate-900">Designed for Teams</div>
              <div className="text-xs text-slate-600 mt-1">
                Built for supervisors and lecturers with role-based access.
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
