import React from "react"

import type { Language } from "../../lib/i18n"
import { EasyModeSection } from "./EasyModeSection"

interface LanguageSettingsProps {
  lang: Language
  changeLanguage: (lang: Language) => void
  t: any
}

function LanguageSettings({ lang, changeLanguage, t }: LanguageSettingsProps) {
  return (
    <div className="relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-100">
          <span className="text-xl">🌐</span>
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="text-sm font-bold text-slate-800">
            {t.languageLabel}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {t.languageDesc}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between bg-slate-50/80 border border-slate-100/80 rounded-xl px-4 py-3 transition-all hover:bg-slate-50">
        <span className="text-xs font-bold text-slate-700">
          {t.languageLabel}
        </span>
        <select
          value={lang}
          onChange={(e) => changeLanguage(e.target.value as Language)}
          className="bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          id="language-select">
          <option value="en">English</option>
          <option value="ja">日本語</option>
        </select>
      </div>
    </div>
  )
}

interface TipsBarSettingsProps {
  showTipsBar: boolean
  toggleTipsBar: (show: boolean) => void
  t: any
}

function TipsBarSettings({
  showTipsBar,
  toggleTipsBar,
  t
}: TipsBarSettingsProps) {
  return (
    <div className="relative overflow-hidden" id="settings-tips-bar-section">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-100">
          <span className="text-xl">💡</span>
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="text-sm font-bold text-slate-800">
            {t.tipsBarToggleLabel || "Enable Tips Bar"}
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed">
            {t.tipsBarToggleSub ||
              "Show a cycling tips bar at the bottom of the screen"}
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between bg-slate-50/80 border border-slate-100/80 rounded-xl px-4 py-3 transition-all hover:bg-slate-50">
        <span className="text-xs font-bold text-slate-700">
          {t.tipsBarToggleLabel || "Enable Tips Bar"}
        </span>
        <button
          type="button"
          id="tips-bar-toggle-btn"
          onClick={() => toggleTipsBar(!showTipsBar)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            showTipsBar ? "bg-blue-600" : "bg-slate-200"
          }`}>
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              showTipsBar ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>
    </div>
  )
}

interface UiPreferencesSectionProps {
  lang: Language
  changeLanguage: (lang: Language) => void
  showTipsBar: boolean
  toggleTipsBar: (show: boolean) => void
  currentEasyMode: boolean
  currentToggleEasyMode: (checked: boolean) => void
  expertFeatures: any
  updateExpertFeature: (key: string, enabled: boolean) => void
  onNavigateToLibrary?: () => void
  t: any
}

export function UiPreferencesSection({
  lang,
  changeLanguage,
  showTipsBar,
  toggleTipsBar,
  currentEasyMode,
  currentToggleEasyMode,
  expertFeatures,
  updateExpertFeature,
  onNavigateToLibrary,
  t
}: UiPreferencesSectionProps) {
  return (
    <div className="p-5 space-y-6 animate-in slide-in-from-top-2 duration-250">
      <LanguageSettings lang={lang} changeLanguage={changeLanguage} t={t} />

      <TipsBarSettings
        showTipsBar={showTipsBar}
        toggleTipsBar={toggleTipsBar}
        t={t}
      />

      <EasyModeSection
        currentEasyMode={currentEasyMode}
        currentToggleEasyMode={currentToggleEasyMode}
        expertFeatures={expertFeatures}
        updateExpertFeature={updateExpertFeature}
        t={t}
        onNavigateToLibrary={onNavigateToLibrary}
      />
    </div>
  )
}
