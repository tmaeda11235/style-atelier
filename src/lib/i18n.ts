import i18n from "i18next"
import { initReactI18next } from "react-i18next"

import enJson from "../locales/en/translation.json"
import jaJson from "../locales/ja/translation.json"

export type Language = "en" | "ja"

// Type safety configurations for i18next
declare module "i18next" {
  interface CustomTypeOptions {
    defaultNS: "translation"
    resources: {
      translation: typeof enJson
    }
  }
}

const resources = {
  en: {
    translation: enJson
  },
  ja: {
    translation: jaJson
  }
}

const getInitialLanguage = (): Language => {
  if (typeof localStorage !== "undefined") {
    const savedLang = localStorage.getItem("style-atelier-language") as Language
    if (savedLang === "en" || savedLang === "ja") {
      return savedLang
    }
  }
  if (
    typeof navigator !== "undefined" &&
    navigator.language?.startsWith("ja")
  ) {
    return "ja"
  }
  return "en"
}

i18n.use(initReactI18next).init({
  resources,
  lng: getInitialLanguage(),
  fallbackLng: "en",
  initImmediate: false,
  interpolation: {
    escapeValue: false // react already safes from xss
  }
})

export { i18n }
export const i18nDict = {
  en: enJson,
  ja: jaJson
}
