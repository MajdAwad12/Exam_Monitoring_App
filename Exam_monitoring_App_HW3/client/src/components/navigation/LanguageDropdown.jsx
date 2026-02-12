// client/src/components/navigation/LanguageDropdown.jsx
import { useTranslation } from "react-i18next";

export default function LanguageDropdown({ className = "" }) {
  const { i18n, t } = useTranslation();
  const value = i18n.language === "he" ? "he" : "en";

  return (
    <label className={"inline-flex items-center gap-2 " + className}>
      <span className="sr-only">{t("lang.label")}</span>
      <select
        value={value}
        onChange={(e) => i18n.changeLanguage(e.target.value)}
        className={
          "h-9 cursor-pointer rounded-xl border px-2 text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-200 transition " +
          "border-slate-200 bg-white text-slate-900 " +
          "dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 dark:focus:ring-indigo-500/30 " +
          "dark:[&>option]:bg-slate-900 dark:[&>option]:text-slate-100"
        }
      >
        <option value="he">{t("lang.he")}</option>
        <option value="en">{t("lang.en")}</option>
      </select>
    </label>
  );
}