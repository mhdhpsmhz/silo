import i18n, { type TFunction } from "i18next";
import { initReactI18next } from "react-i18next";
import { enUS, id as idDateLocale } from "date-fns/locale";
import type { VideoStatus } from "../types/silo";
import en from "./resources/en";
import id from "./resources/id";

export type SupportedLanguage = "en" | "id";
export const LANGUAGE_STORAGE_KEY = "silo_language";

function readInitialLanguage(): SupportedLanguage {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return saved === "id" ? "id" : "en";
  } catch {
    return "en";
  }
}

const initialLanguage = readInitialLanguage();

if (!i18n.isInitialized) {
  i18n.use(initReactI18next).init({
    resources: {
      en: { translation: en },
      id: { translation: id },
    },
    lng: initialLanguage,
    fallbackLng: "en",
    interpolation: {
      escapeValue: false,
    },
  });
}

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLanguage;
}

i18n.on("languageChanged", (lng) => {
  const normalized: SupportedLanguage = lng === "id" ? "id" : "en";
  if (typeof document !== "undefined") {
    document.documentElement.lang = normalized;
  }
  if (typeof window !== "undefined") {
    try {
      window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalized);
    } catch {
      // ignore storage quota errors
    }
  }
});

export function getDateFnsLocale(language: string) {
  return language === "id" ? idDateLocale : enUS;
}

export function translateVideoStatus(
  status: VideoStatus,
  t: TFunction,
): string {
  if (status === "Completed") return t("status.completed");
  if (status === "In Progress") return t("status.inProgress");
  return t("status.notStarted");
}

export default i18n;
