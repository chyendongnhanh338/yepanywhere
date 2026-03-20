import {
  type ReactNode,
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import deMessages from "./i18n/de.json";
import enMessages from "./i18n/en.json";
import esMessages from "./i18n/es.json";
import frMessages from "./i18n/fr.json";
import jaMessages from "./i18n/ja.json";
import zhCNMessages from "./i18n/zh-CN.json";
import { UI_KEYS } from "./lib/storageKeys";

export const SUPPORTED_LOCALES = [
  "en",
  "zh-CN",
  "es",
  "fr",
  "de",
  "ja",
] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];

const DEFAULT_LOCALE: Locale = "en";

const messages = {
  en: enMessages,
  "zh-CN": zhCNMessages,
  es: esMessages,
  fr: frMessages,
  de: deMessages,
  ja: jaMessages,
} as const;

type MessageKey = keyof (typeof messages)[typeof DEFAULT_LOCALE];

interface I18nContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

function isLocale(value: string | null): value is Locale {
  return value !== null && SUPPORTED_LOCALES.includes(value as Locale);
}

function detectLocale(): Locale {
  const stored = localStorage.getItem(UI_KEYS.locale);
  if (isLocale(stored)) return stored;
  if (navigator.language.toLowerCase().startsWith("zh")) return "zh-CN";
  if (navigator.language.toLowerCase().startsWith("es")) return "es";
  if (navigator.language.toLowerCase().startsWith("fr")) return "fr";
  if (navigator.language.toLowerCase().startsWith("de")) return "de";
  if (navigator.language.toLowerCase().startsWith("ja")) return "ja";
  return DEFAULT_LOCALE;
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(detectLocale);

  useEffect(() => {
    localStorage.setItem(UI_KEYS.locale, locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const value = useMemo<I18nContextValue>(
    () => ({
      locale,
      setLocale: setLocaleState,
      t: (key, vars) => {
        let text = String(
          messages[locale][key] ?? messages[DEFAULT_LOCALE][key],
        );
        if (!vars) return text;
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
        return text;
      },
    }),
    [locale],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return context;
}
