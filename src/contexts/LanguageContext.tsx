import React, { createContext, useContext, useEffect, useState } from "react"

import { i18n, i18nDict } from "../lib/i18n"
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
        if (i18n.language !== savedLang) {
          i18n.changeLanguage(savedLang)
        }
        return savedLang
      }
    }
    if (typeof navigator !== "undefined" && navigator.language) {
      const browserLang = navigator.language.split("-")[0] as Language
      if (browserLang === "en" || browserLang === "ja") {
        if (i18n.language !== browserLang) {
          i18n.changeLanguage(browserLang)
        }
        return browserLang
      }
    }
    return (i18n.language as Language) || "en"
  })

  useEffect(() => {
    const handleLanguageChanged = (lng: string) => {
      setLang(lng as Language)
    }
    i18n.on("languageChanged", handleLanguageChanged)
    return () => {
      i18n.off("languageChanged", handleLanguageChanged)
    }
  }, [])

  const changeLanguage = (newLang: Language) => {
    i18n.changeLanguage(newLang)
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
    let browserLang: Language = "en"
    if (
      typeof localStorage !== "undefined" &&
      localStorage.getItem("style-atelier-language")
    ) {
      const savedLang = localStorage.getItem(
        "style-atelier-language"
      ) as Language
      if (savedLang === "en" || savedLang === "ja") {
        browserLang = savedLang
      }
    } else if (typeof navigator !== "undefined" && navigator.language) {
      const code = navigator.language.split("-")[0] as Language
      if (code === "en" || code === "ja") {
        browserLang = code
      }
    } else {
      browserLang = (i18n.language as Language) || "en"
    }

    return {
      lang: browserLang,
      changeLanguage: (newLang: Language) => {
        i18n.changeLanguage(newLang)
      },
      t: i18nDict[browserLang] || i18nDict.en
    }
  }
  return context
}
