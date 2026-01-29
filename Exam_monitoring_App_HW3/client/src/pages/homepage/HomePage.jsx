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

// ✅ Your real images (from /public) — no other images used
const PRODUCT_SECTIONS = [
  {
    key: "dashboard",
    img: "/dashboardPIC.jpg",
    alt: "Dashboard",
    title: "A Powerful Dashboard that keeps you in control",
    desc: "Monitor classrooms in one place, take fast actions, and get clear visibility during the exam — without stress.",
    bullets: ["Real-time overview", "Fast actions", "Clean layout"],
  },
  {
    key: "examlist",
    img: "/examlistPIC.jpg",
    alt: "Exam List",
    title: "Exam List that feels organized and instant",
    desc: "Jump to any exam quickly, keep everything structured, and navigate like a professional system.",
    bullets: ["Quick navigation", "Organized structure", "Zero confusion"],
  },
  {
    key: "manage",
    img: "/mangeEXAM_pic.jpg",
    alt: "Manage Exam",
    title: "Manage Exams with confidence",
    desc: "Create and update exam settings smoothly with a clear workflow designed for staff and supervisors.",
    bullets: ["Staff workflow", "Safe updates", "Role-based control"],
  },
  {
    key: "reports",
    img: "/reporANDhistoryPIC.jpg",
    alt: "Reports & History",
    title: "Reports & History that tell the full story",
    desc: "Everything is documented: attendance, incidents, and actions — presented in a clean, readable timeline.",
    bullets: ["Timeline clarity", "Audit-friendly", "Professional reporting"],
  },
  {
    key: "chatbot",
    img: "/chatbotPIC.png",
    alt: "Chatbot",
    title: "Smart Assistant that helps in seconds",
    desc: "Quick guidance for staff during pressure time — fewer mistakes, faster decisions, smoother exam flow.",
    bullets: ["Instant help", "Less friction", "Better experience"],
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
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-sky-800 to-cyan-600" />
        <div className="absolute -top-28 -left-28 w-[26rem] h-[26rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-36 -right-36 w-[34rem] h-[34rem] rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div className="text-white">
            <div className="flex items-center gap-5">
              {/* ✅ Use your hero logo image */}

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

            {/* ✅ no login/register duplicates */}
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
                onClick={() => scrollToId("product")}
                className="px-7 py-3.5 rounded-full bg-white/10 border border-white/25 text-white font-extrabold
                           hover:bg-white/15 transition"
              >
                View System Screens
              </button>
            </div>

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
                alt="Exam classroom"
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

      {/* ===== PRODUCT SCREENS (one under another) ===== */}
      <section id="product" className="bg-slate-50">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900">
                System Screens (Real UI)
              </h2>
              <p className="mt-2 text-slate-600 max-w-2xl">
                A clean, modern experience across the entire platform — designed for real exam pressure.
              </p>
            </div>

            <Pill>
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              Dashboard • Exams • Reports • Chatbot
            </Pill>
          </div>

          <div className="mt-10 space-y-10">
            {PRODUCT_SECTIONS.map((s) => (
              <div
                key={s.key}
                className="rounded-[2rem] bg-white border border-slate-200 shadow-sm hover:shadow-xl transition overflow-hidden"
              >
                {/* Text */}
                <div className="p-7 md:p-9">
                  <h3 className="text-2xl md:text-3xl font-extrabold text-slate-900">
                    {s.title}
                  </h3>
                  <p className="mt-2 text-slate-600 text-sm md:text-base max-w-3xl leading-relaxed">
                    {s.desc}
                  </p>

                  <div className="mt-5 flex flex-wrap gap-2">
                    {s.bullets.map((b) => (
                      <span
                        key={b}
                        className="text-xs md:text-sm font-extrabold text-slate-700 bg-slate-100 border border-slate-200 px-3 py-2 rounded-full"
                      >
                        {b}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Image */}
                <div className="px-7 pb-7 md:px-9 md:pb-9">
                  <div className="relative">
                    <div className="absolute -inset-4 rounded-[1.8rem] bg-indigo-200/40 blur-2xl" />
                    <img
                      src={s.img}
                      alt={s.alt}
                      className="relative w-full rounded-[1.8rem] border border-slate-200 shadow-2xl object-cover"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
