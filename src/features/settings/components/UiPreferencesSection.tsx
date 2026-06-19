import React from "react"

import { HelpTooltip } from "../../../components/atoms/HelpTooltip"
import type { Theme } from "../../../contexts/SettingsContext"
import type { Language } from "../../../lib/i18n"
import { BrandLogoSettings } from "./BrandLogoSettingsSection"
import { EasyModeSection } from "./EasyModeSection"

interface ThemeSettingsProps {
  theme: Theme
  changeTheme: (theme: Theme) => void
  t: any
}

function ThemeSettings({ theme, changeTheme, t }: ThemeSettingsProps) {
  return (
    <div className="relative overflow-hidden" id="settings-theme-section">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 bg-muted text-text-secondary rounded-xl border border-border-primary">
          <span className="text-xl">🌓</span>
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
            {t.themeLabel || "Theme Setting"}
            <HelpTooltip
              content={
                t.themeDesc || "Choose the appearance mode of the application."
              }
              position="top-left"
            />
          </h3>
        </div>
      </div>
      <div className="flex items-center justify-between bg-muted/80 border border-border-primary/80 rounded-xl px-4 py-3 transition-all hover:bg-surface-hover">
        <span className="text-xs font-bold text-text-primary">
          {t.themeLabel || "Theme"}
        </span>
        <select
          value={theme}
          onChange={(e) => changeTheme(e.target.value as Theme)}
          className="bg-surface border border-border-primary text-text-primary text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
          id="theme-select">
          <option value="system">{t.themeSystem || "System"}</option>
          <option value="light">{t.themeLight || "Light"}</option>
          <option value="dark">{t.themeDark || "Dark"}</option>
        </select>
      </div>
    </div>
  )
}

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
        <div className="p-3 bg-muted text-text-secondary rounded-xl border border-border-primary">
          <span className="text-xl">🌐</span>
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
            {t.languageLabel}
            <HelpTooltip content={t.languageDesc} position="top-left" />
          </h3>
        </div>
      </div>
      <div className="flex items-center justify-between bg-muted/80 border border-border-primary/80 rounded-xl px-4 py-3 transition-all hover:bg-surface-hover">
        <span className="text-xs font-bold text-text-primary">
          {t.languageLabel}
        </span>
        <select
          value={lang}
          onChange={(e) => changeLanguage(e.target.value as Language)}
          className="bg-surface border border-border-primary text-text-primary text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 cursor-pointer"
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
        <div className="p-3 bg-muted text-text-secondary rounded-xl border border-border-primary">
          <span className="text-xl">💡</span>
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
            {t.tipsBarToggleLabel || "Enable Tips Bar"}
            <HelpTooltip
              content={
                t.tipsBarToggleSub ||
                "Show a cycling tips bar at the bottom of the screen"
              }
              position="top-left"
            />
          </h3>
        </div>
      </div>
      <div className="flex items-center justify-between bg-muted/80 border border-border-primary/80 rounded-xl px-4 py-3 transition-all hover:bg-surface-hover">
        <span className="text-xs font-bold text-text-primary">
          {t.tipsBarToggleLabel || "Enable Tips Bar"}
        </span>
        <button
          type="button"
          id="tips-bar-toggle-btn"
          onClick={() => toggleTipsBar(!showTipsBar)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            showTipsBar ? "bg-blue-600" : "bg-slate-200 dark:bg-slate-800"
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

interface ReplayTutorialSettingsProps {
  onReplayTutorial?: () => void
  t: any
}

function ReplayTutorialSettings({
  onReplayTutorial,
  t
}: ReplayTutorialSettingsProps) {
  return (
    <div
      className="relative overflow-hidden"
      id="settings-replay-tutorial-section">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />
      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 bg-muted text-text-secondary rounded-xl border border-border-primary">
          <span className="text-xl">🎓</span>
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5">
            {t.replayTutorialLabel || "Interactive Tutorial"}
            <HelpTooltip
              content={
                t.replayTutorialDesc ||
                "Run the interactive guide explaining how to operate from the beginning."
              }
              position="top-left"
            />
          </h3>
        </div>
      </div>
      <div className="flex items-center justify-between bg-muted/80 border border-border-primary/80 rounded-xl px-4 py-3 transition-all hover:bg-surface-hover">
        <span className="text-xs font-bold text-text-primary">
          {t.replayTutorialLabel || "Tutorial"}
        </span>
        <button
          type="button"
          id="settings-replay-tutorial-btn"
          onClick={onReplayTutorial}
          className="bg-surface hover:bg-surface-hover border border-border-primary text-blue-600 hover:text-blue-700 text-xs font-bold rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all cursor-pointer">
          {t.replayTutorialBtn || "Replay Tutorial"}
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
  theme: Theme
  changeTheme: (theme: Theme) => void
  includeBrandLogo: boolean
  toggleBrandLogo: (enabled: boolean) => void
  alwaysEnglishLogoText: boolean
  toggleAlwaysEnglishLogoText: (enabled: boolean) => void
  onReplayTutorial?: () => void
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
  t,
  theme,
  changeTheme,
  includeBrandLogo,
  toggleBrandLogo,
  alwaysEnglishLogoText,
  toggleAlwaysEnglishLogoText,
  onReplayTutorial
}: UiPreferencesSectionProps) {
  return (
    <div className="p-5 space-y-6 animate-in slide-in-from-top-2 duration-250">
      <ThemeSettings theme={theme} changeTheme={changeTheme} t={t} />

      <LanguageSettings lang={lang} changeLanguage={changeLanguage} t={t} />

      <TipsBarSettings
        showTipsBar={showTipsBar}
        toggleTipsBar={toggleTipsBar}
        t={t}
      />

      <ReplayTutorialSettings onReplayTutorial={onReplayTutorial} t={t} />

      <BrandLogoSettings
        includeBrandLogo={includeBrandLogo}
        toggleBrandLogo={toggleBrandLogo}
        alwaysEnglishLogoText={alwaysEnglishLogoText}
        toggleAlwaysEnglishLogoText={toggleAlwaysEnglishLogoText}
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
