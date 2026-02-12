// client/src/localization/languageDirectionManager.js

export function applyDocumentLanguageAndDirection(lang) {
  const isHebrew = lang === "he";

  document.documentElement.lang = lang;
  document.documentElement.dir = isHebrew ? "rtl" : "ltr";
}
