// client/src/components/auth/AuthFooter.jsx
import { useTranslation } from "react-i18next";
export default function AuthFooter() {
  const { t } = useTranslation();

  return (
    <footer className="text-center text-xs text-white font-semibold">{t("auth.footer")}</footer>
  );
}
