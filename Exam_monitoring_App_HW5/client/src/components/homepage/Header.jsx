// client/src/components/homepage/Header.jsx
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageDropdown from "../navigation/LanguageDropdown.jsx";
import ThemeToggle from "../common/ThemeToggle.jsx";
import AccessibilityWidget from "../common/AccessibilityWidget.jsx";

export default function Header() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "he";

  // ✅ Push the "content group" inward, but keep the logo stuck to the edge.
  // LTR: logo at far LEFT, everything else starts after a big left padding.
  // RTL: logo at far RIGHT, everything else starts after a big right padding.
  const contentPad = isRtl ? "lg:pr-56" : "lg:pl-56";

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      {/* ✅ Full width, no max-width so logo can touch the edge */}
      <div className="w-full px-3 sm:px-6 lg:px-10 py-3">
        <div className={"flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 lg:gap-6 " + contentPad}>
          {/* ===== Brand (logo pinned to the edge) ===== */}
          <Link to="/" className="flex items-center gap-4 min-w-0 shrink-0">
            <img
              src="/exammonitoringPIC.png"
              alt={t("home.header.logoAlt")}
              className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 object-contain"
            />

            {/* Keep title/subtitle readable without stealing too much space */}
            <div className="min-w-0 max-w-[260px] sm:max-w-[320px]">
              <div className="text-lg sm:text-xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight truncate">
                {t("home.header.brandTitle")}
              </div>
              <div className="mt-0.5 text-xs sm:text-sm text-slate-500 dark:text-slate-300 leading-snug line-clamp-2">
                {t("home.header.brandSubtitle")}
              </div>
            </div>
          </Link>

          {/* ===== Helpdesk (moves with language naturally because of dir, stays centered-ish) ===== */}
          <div className="hidden lg:flex items-center gap-3 text-sm text-slate-600 dark:text-slate-200 min-w-0">
            <span className="inline-flex items-center gap-2 min-w-0">
              📧{" "}
              <a
                className="font-semibold hover:underline hover:text-slate-900 dark:hover:text-white transition truncate max-w-[320px]"
                href="mailto:helpdesk@exam-monitoring.com"
              >
                helpdesk@exam-monitoring.com
              </a>
            </span>

            <span className="text-slate-300 dark:text-slate-700">|</span>

            <span className="inline-flex items-center gap-2">
              ☎{" "}
              <a
                className="font-semibold hover:underline hover:text-slate-900 dark:hover:text-white transition"
                href="tel:+97231234567"
              >
                +972-3-123-4567
              </a>
            </span>
          </div>

          {/* ===== Auth + Controls (stays at opposite edge) ===== */}
          <nav className="w-full lg:w-auto flex flex-wrap items-center justify-between gap-3 shrink-0">
            <Link
              to="/login"
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-full border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-900 transition text-sm sm:text-base font-extrabold shadow-sm whitespace-nowrap"
            >
              {t("nav.login")}
            </Link>

            <Link
              to="/register"
              className="px-4 sm:px-6 py-2.5 sm:py-3 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-sky-600 dark:hover:bg-sky-500 transition text-sm sm:text-base font-extrabold shadow-md whitespace-nowrap"
            >
              {t("nav.register")}
            </Link>

            <div className="flex items-center gap-2 flex-wrap justify-end lg:justify-start">
              <ThemeToggle />
              <AccessibilityWidget placement="topbar" />
              <LanguageDropdown className={isRtl ? "ml-2" : "mr-2"} />
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
