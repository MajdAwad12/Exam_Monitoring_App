// client/src/localization/languageStorage.js

const STORAGE_KEY = "app_language_preference";

export function getSavedLanguage() {
  const lang = localStorage.getItem(STORAGE_KEY);
  return lang === "he" || lang === "en" ? lang : null;
}

export function saveLanguage(lang) {
  if (lang === "he" || lang === "en") {
    localStorage.setItem(STORAGE_KEY, lang);
  }
}
