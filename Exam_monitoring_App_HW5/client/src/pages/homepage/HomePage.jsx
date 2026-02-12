// client/src/pages/homepage/HomePage.jsx
import { useTranslation } from "react-i18next";
import Header from "../../components/homepage/Header.jsx";
import Footer from "../../components/homepage/Footer.jsx";

const STATS = [
  { labelKey: "home.stats.globalUsers", value: "2M+" },
  { labelKey: "home.stats.usersInIsrael", value: "55K+" },
  { labelKey: "home.stats.uptime", value: "100%" },
];

const FEATURES = [
  {
    icon: "🗺️",
    titleKey: "home.features.items.liveMap.title",
    descKey: "home.features.items.liveMap.desc",
  },
  {
    icon: "⚡",
    titleKey: "home.features.items.incidents.title",
    descKey: "home.features.items.incidents.desc",
  },
  {
    icon: "🛡️",
    titleKey: "home.features.items.roleDashboards.title",
    descKey: "home.features.items.roleDashboards.desc",
  },
  {
    icon: "🎓",
    titleKey: "home.features.items.studentPortal.title",
    descKey: "home.features.items.studentPortal.desc",
  },
];

// ✅ your images only (from /public)
const PRODUCT_SECTIONS = [
  {
    key: "dashboard",
    img: "/dashboardPIC.jpg",
    altKey: "home.product.sections.dashboard.alt",
    titleKey: "home.product.sections.dashboard.title",
    descKey: "home.product.sections.dashboard.desc",
    bulletsKeys: [
      "home.product.sections.dashboard.bullets.realtime",
      "home.product.sections.dashboard.bullets.fastActions",
      "home.product.sections.dashboard.bullets.clearLayout",
    ],
  },
  {
    key: "examlist",
    img: "/examlistPIC.jpg",
    altKey: "home.product.sections.examlist.alt",
    titleKey: "home.product.sections.examlist.title",
    descKey: "home.product.sections.examlist.desc",
    bulletsKeys: [
      "home.product.sections.examlist.bullets.quickNav",
      "home.product.sections.examlist.bullets.structured",
      "home.product.sections.examlist.bullets.smoothFlow",
    ],
  },
  {
    key: "manage",
    img: "/mangeEXAM_pic.jpg",
    altKey: "home.product.sections.manage.alt",
    titleKey: "home.product.sections.manage.title",
    descKey: "home.product.sections.manage.desc",
    bulletsKeys: [
      "home.product.sections.manage.bullets.staffWorkflow",
      "home.product.sections.manage.bullets.safeUpdates",
      "home.product.sections.manage.bullets.roleControl",
    ],
  },
  {
    key: "reports",
    img: "/reporANDhistoryPIC.jpg",
    altKey: "home.product.sections.reports.alt",
    titleKey: "home.product.sections.reports.title",
    descKey: "home.product.sections.reports.desc",
    bulletsKeys: [
      "home.product.sections.reports.bullets.timeline",
      "home.product.sections.reports.bullets.audit",
      "home.product.sections.reports.bullets.fastReview",
    ],
  },
  {
    key: "chatbot",
    img: "/chatbotPIC.png",
    altKey: "home.product.sections.chatbot.alt",
    titleKey: "home.product.sections.chatbot.title",
    descKey: "home.product.sections.chatbot.desc",
    bulletsKeys: [
      "home.product.sections.chatbot.bullets.instantHelp",
      "home.product.sections.chatbot.bullets.lessFriction",
      "home.product.sections.chatbot.bullets.betterUX",
    ],
  },
];

function Pill({ children }) {
  return (
    <span className="inline-flex items-center gap-2 text-xs font-extrabold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-full">
      {children}
    </span>
  );
}

export default function HomePage() {
  const { t } = useTranslation();

  function scrollToId(id) {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-100">
      <Header />

      {/* ===== HERO ===== */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-900 via-sky-800 to-cyan-600" />
        <div className="absolute -top-28 -left-28 w-[26rem] h-[26rem] rounded-full bg-white/10 blur-3xl" />
        <div className="absolute -bottom-36 -right-36 w-[34rem] h-[34rem] rounded-full bg-white/10 blur-3xl" />

        <div className="relative mx-auto max-w-7xl px-6 py-16 md:py-20 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          {/* Text */}
          <div className="text-white">
            {/* ✅ NO logo here (logo is already in Header) */}
            <div className="min-w-0">
              <h1 className="text-4xl md:text-5xl font-extrabold leading-tight tracking-tight">
                {t("home.hero.title")}
              </h1>
              <p className="text-white/85 mt-2 text-sm md:text-base">
                {t("home.hero.subtitle")}
              </p>
            </div>

            <p className="mt-6 text-white/90 text-lg max-w-xl leading-relaxed">
              {t("home.hero.description")}
            </p>

            {/* ✅ no login/register duplicates */}
            <div className="mt-8 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => scrollToId("overview")}
                className="px-7 py-3.5 rounded-full bg-white dark:bg-slate-950 text-indigo-700 font-extrabold
                           hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-900 transition shadow-lg"
              >
                {t("home.hero.cta.explore")}
              </button>

              <button
                type="button"
                onClick={() => scrollToId("product")}
                className="px-7 py-3.5 rounded-full bg-white/10 border border-white/25 text-white font-extrabold
                           hover:bg-white/15 transition"
              >
                {t("home.hero.cta.screens")}
              </button>
            </div>

            <div className="mt-10 grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-xl">
              {STATS.map((s) => (
                <div
                  key={s.labelKey}
                  className="rounded-2xl bg-white/10 border border-white/15 px-5 py-4"
                >
                  <div className="text-2xl font-extrabold">{s.value}</div>
                  <div className="text-xs text-white/80 mt-1">
                    {t(s.labelKey)}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Hero image */}
          <div className="flex justify-center lg:justify-end">
            <div className="relative w-full max-w-xl">
              <div className="absolute -inset-4 rounded-[2.2rem] bg-white/10 blur-2xl" />
              <img
                src="/supervisor.jpg"
                alt={t("home.hero.imageAlt")}
                className="relative w-full rounded-[2rem] shadow-2xl border border-white/20 object-cover max-h-[420px]"
                draggable={false}
              />
              <div className="absolute bottom-4 left-4 right-4 rounded-2xl bg-slate-900/40 border border-white/15 backdrop-blur px-4 py-3">
                <div className="flex items-center justify-between gap-3">
                  <div className="text-white">
                    <div className="text-sm font-extrabold">
                      {t("home.hero.card.title")}
                    </div>
                    <div className="text-xs text-white/80">
                      {t("home.hero.card.subtitle")}
                    </div>
                  </div>
                  <div className="text-xs font-extrabold text-white bg-white/10 border border-white/15 px-3 py-2 rounded-full">
                    {t("home.hero.card.badge")}
                  </div>
                </div>
              </div>
              <p className="mt-3 text-xs text-white/70">
                {t("home.hero.caption")}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ===== FEATURES ===== */}
      <section id="overview" className="bg-white dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                {t("home.overview.title")}
              </h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
                {t("home.overview.subtitle")}
              </p>
            </div>

            <Pill>
              <span className="w-2 h-2 rounded-full bg-emerald-500" />
              {t("home.overview.pill")}
            </Pill>
          </div>

          <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((f) => (
              <div
                key={f.titleKey}
                className="group rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 p-6 shadow-sm
                           hover:shadow-xl hover:-translate-y-0.5 transition"
              >
                <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 flex items-center justify-center text-2xl shadow-sm">
                  {f.icon}
                </div>
                <h3 className="mt-4 text-lg font-extrabold text-slate-900 dark:text-slate-100">
                  {t(f.titleKey)}
                </h3>
                <p className="mt-2 text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                  {t(f.descKey)}
                </p>
                <div className="mt-4 h-1 w-10 rounded-full bg-indigo-600/80 group-hover:w-16 transition-all" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== PRODUCT SCREENS (small image + text side) ===== */}
      <section id="product" className="bg-slate-50 dark:bg-slate-900/40">
        <div className="mx-auto max-w-7xl px-6 py-16">
          <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
            <div>
              <h2 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100">
                {t("home.product.title")}
              </h2>
              <p className="mt-2 text-slate-600 dark:text-slate-300 max-w-2xl">
                {t("home.product.subtitle")}
              </p>
            </div>

            <Pill>
              <span className="w-2 h-2 rounded-full bg-indigo-600" />
              {t("home.product.pill")}
            </Pill>
          </div>

          <div className="mt-10 space-y-5">
            {PRODUCT_SECTIONS.map((s) => (
              <div
                key={s.key}
                className="rounded-3xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-lg transition p-5 sm:p-6"
              >
                <div className="grid grid-cols-1 md:grid-cols-[320px_1fr] gap-6 items-start">
                  {/* ✅ smaller image */}
                  <div className="relative">
                    <div className="absolute -inset-2 rounded-3xl bg-indigo-200/30 blur-xl" />
                    <img
                      src={s.img}
                      alt={t(s.altKey)}
                      className="relative w-full h-[180px] sm:h-[200px] rounded-3xl border border-slate-200 dark:border-slate-800 shadow-md object-cover"
                      draggable={false}
                    />
                  </div>

                  {/* Text */}
                  <div className="min-w-0">
                    <h3 className="text-xl sm:text-2xl font-extrabold text-slate-900 dark:text-slate-100">
                      {t(s.titleKey)}
                    </h3>
                    <p className="mt-2 text-sm sm:text-base text-slate-600 dark:text-slate-300 leading-relaxed max-w-3xl">
                      {t(s.descKey)}
                    </p>

                    <div className="mt-4 flex flex-wrap gap-2">
                      {s.bulletsKeys.map((bk) => (
                        <span
                          key={bk}
                          className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-2 rounded-full"
                        >
                          {t(bk)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ✅ Only Footer has contact + social (NO duplicates here) */}
      <Footer />
    </div>
  );
}
