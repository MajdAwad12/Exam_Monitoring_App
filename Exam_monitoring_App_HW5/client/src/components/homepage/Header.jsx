// client/src/components/homepage/Header.jsx
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import LanguageDropdown from "../navigation/LanguageDropdown.jsx";
import ThemeToggle from "../common/ThemeToggle.jsx";
import AccessibilityWidget from "../common/AccessibilityWidget.jsx";

export default function Header() {
  const { t, i18n } = useTranslation();
  const isRtl = i18n.language === "he";

  // Keep the "logo pinned to the edge" feel on larger screens,
  // but avoid huge padding on mobile/tablet.
  const contentPad = isRtl ? "md:pr-28 lg:pr-56" : "md:pl-28 lg:pl-56";

  return (
    <header className="sticky top-0 z-50 bg-white/90 dark:bg-slate-950/80 backdrop-blur border-b border-slate-200 dark:border-slate-800">
      <div className="w-full px-3 sm:px-4 md:px-6 lg:px-10 py-3">
        <div
          className={
            "flex flex-col md:flex-row md:items-center md:justify-between gap-3 md:gap-6 " +
            contentPad
          }
        >
          {/* ===== Brand (logo pinned to the edge) ===== */}
          <Link to="/" className="flex items-center gap-3 sm:gap-4 min-w-0 shrink-0">
            <img
              src="/exammonitoringPIC.png"
              alt={t("home.header.logoAlt")}
              className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-2xl bg-white dark:bg-slate-900 shadow-md border border-slate-200 dark:border-slate-800 object-contain"
            />

            <div className="min-w-0 max-w-[240px] sm:max-w-[320px] md:max-w-[360px]">
              <div className="text-base sm:text-lg md:text-xl font-extrabold text-slate-900 dark:text-slate-100 leading-tight truncate">
                {t("home.header.brandTitle")}
              </div>
              <div className="mt-0.5 text-[11px] sm:text-xs md:text-sm text-slate-500 dark:text-slate-300 leading-snug line-clamp-2">
                {t("home.header.brandSubtitle")}
              </div>
            </div>
          </Link>

          {/* ===== Helpdesk (show on md+ only; optional on phones) ===== */}
          <div className="hidden md:flex items-center gap-3 text-sm text-slate-600 dark:text-slate-200 min-w-0">
            <span className="inline-flex items-center gap-2 min-w-0">
              📧{" "}
              <a
                className="font-semibold hover:underline hover:text-slate-900 dark:hover:text-white transition truncate max-w-[260px] lg:max-w-[320px]"
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

          {/* ===== Controls + Auth ===== */}
          <nav className="w-full md:w-auto flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 shrink-0">
            {/* Controls row: keep compact & wrap on small screens */}
            <div className="w-full sm:w-auto flex flex-wrap items-center gap-2 justify-between sm:justify-end">
              <div className="flex items-center gap-2">
                <ThemeToggle />
                <AccessibilityWidget placement="topbar" />
              </div>
              <LanguageDropdown className={isRtl ? "ml-2" : "mr-2"} />
            </div>

            {/* Auth buttons: full-width on phones, inline on tablet/desktop */}
            <div className="w-full sm:w-auto flex items-center gap-2 sm:gap-3">
              <Link
                to="/login"
                className="w-full sm:w-auto text-center px-4 sm:px-5 py-2.5 rounded-full border-2 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-800 dark:bg-slate-900 transition text-sm sm:text-base font-extrabold shadow-sm whitespace-nowrap"
              >
                {t("nav.login")}
              </Link>

              <Link
                to="/register"
                className="w-full sm:w-auto text-center px-4 sm:px-5 py-2.5 rounded-full bg-indigo-600 text-white hover:bg-indigo-700 dark:bg-sky-600 dark:hover:bg-sky-500 transition text-sm sm:text-base font-extrabold shadow-md whitespace-nowrap"
              >
                {t("nav.register")}
              </Link>
            </div>
          </nav>
        </div>
      </div>
    </header>
  );
}
