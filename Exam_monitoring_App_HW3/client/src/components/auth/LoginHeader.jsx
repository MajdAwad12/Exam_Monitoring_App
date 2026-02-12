// client/src/components/auth/LoginHeader.jsx
import { useTranslation } from "react-i18next";
export default function LoginHeader() {
  const { t } = useTranslation();

  return (
    <div className="text-center mb-7">
      <div className="w-20 h-20 rounded-2xl bg-white/20 backdrop-blur flex items-center justify-center mx-auto mb-4 overflow-hidden">
        <img
          src="/exammonitoringPIC.png"
          alt={t("app.title")}
          className="w-100 h-100 object-contain"
        />
      </div>

      <h2 className="text-2xl font-extrabold text-white tracking-tight">
        {t("auth.header.title")}
      </h2>

      <p className="text-sm text-indigo-100 mt-2">
        {t("auth.header.subtitle")}
      </p>
    </div>
  );
}
