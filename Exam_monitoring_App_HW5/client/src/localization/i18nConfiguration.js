// client/src/localization/i18nConfiguration.js

import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import heTranslations from "./translations/he.json";
import enTranslations from "./translations/en.json";

import { getSavedLanguage, saveLanguage } from "./languageStorage";
import { applyDocumentLanguageAndDirection } from "./languageDirectionManager";

const TRANSLATION_RESOURCES = {
  he: { translation: heTranslations },
  en: { translation: enTranslations },
};

const DEFAULT_LANGUAGE = "he";
const initialLanguage = getSavedLanguage() || DEFAULT_LANGUAGE;

i18n.use(initReactI18next).init({
  resources: TRANSLATION_RESOURCES,
  lng: initialLanguage,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

applyDocumentLanguageAndDirection(initialLanguage);

i18n.on("languageChanged", (lang) => {
  saveLanguage(lang);
  applyDocumentLanguageAndDirection(lang);
});

export default i18n;
