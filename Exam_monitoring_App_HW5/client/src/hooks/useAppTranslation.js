// client/src/hooks/useAppTranslation.js

import { useTranslation } from "react-i18next";

export function useAppTranslation() {
  const { t, i18n } = useTranslation();
  return { t, i18n };
}
