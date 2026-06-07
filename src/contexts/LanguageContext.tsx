import React, { createContext, useContext, useEffect, useState } from "react"

import { i18nDict } from "../lib/i18n"
import type { Language } from "../lib/i18n"

interface LanguageContextType {
  lang: Language
  changeLanguage: (newLang: Language) => void
  t: typeof i18nDict.en
}

const LanguageContext = createContext<LanguageContextType | undefined>(
  undefined
)

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLang] = useState<Language>(() => {
    if (typeof localStorage !== "undefined") {
      const savedLang = localStorage.getItem(
        "style-atelier-language"
      ) as Language
      if (savedLang === "en" || savedLang === "ja") {
        return savedLang
      }
    }
    const browserLang =
      typeof navigator !== "undefined" && navigator.language?.startsWith("ja")
        ? "ja"
        : "en"
    return browserLang
  })

  const changeLanguage = (newLang: Language) => {
    setLang(newLang)
    localStorage.setItem("style-atelier-language", newLang)
  }

  const t = i18nDict[lang] || i18nDict.en

  return (
    <LanguageContext.Provider value={{ lang, changeLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  )
}

export function useLanguage() {
  const context = useContext(LanguageContext)
  if (context === undefined) {
    const browserLang =
      typeof navigator !== "undefined" && navigator.language?.startsWith("ja")
        ? "ja"
        : "en"
    return {
      lang: browserLang,
      changeLanguage: () => {},
      t: i18nDict[browserLang] || i18nDict.en
    }
  }
  return context
}
