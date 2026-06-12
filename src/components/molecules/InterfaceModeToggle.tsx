import { Settings2 } from "lucide-react"
import React from "react"

import { HelpTooltip } from "../atoms/HelpTooltip"

interface InterfaceModeToggleProps {
  currentEasyMode: boolean
  currentToggleEasyMode: (checked: boolean) => void
  t: any
  onNavigateToLibrary?: () => void
}

interface ToggleSwitchProps {
  currentEasyMode: boolean
  currentToggleEasyMode: (checked: boolean) => void
  t: any
}

function ToggleSwitch({
  currentEasyMode,
  currentToggleEasyMode,
  t
}: ToggleSwitchProps) {
  return (
    <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100/80 dark:border-slate-800 rounded-xl px-4 py-3 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {t.easyModeToggleLabel}
        </span>
        <HelpTooltip content={t.easyModeToggleSub} position="top-left" />
      </div>
      <button
        type="button"
        id="easy-mode-toggle-btn"
        onClick={() => currentToggleEasyMode(!currentEasyMode)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          currentEasyMode
            ? "bg-blue-600 dark:bg-blue-500"
            : "bg-slate-200 dark:bg-slate-700"
        }`}>
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            currentEasyMode ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}

interface BackToLibraryButtonProps {
  onNavigate: () => void
  label: string
}

function BackToLibraryButton({ onNavigate, label }: BackToLibraryButtonProps) {
  return (
    <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end">
      <button
        type="button"
        onClick={onNavigate}
        id="back-to-library-btn"
        className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 transition-colors cursor-pointer py-1 px-2 hover:bg-blue-50/50 dark:hover:bg-blue-950/20 rounded-lg">
        <span>🎴 {label}</span>
        <span>&rarr;</span>
      </button>
    </div>
  )
}

export function InterfaceModeToggle({
  currentEasyMode,
  currentToggleEasyMode,
  t,
  onNavigateToLibrary
}: InterfaceModeToggleProps) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

      <div className="flex items-start gap-4 mb-4">
        <div
          className={`p-3 rounded-xl ${
            currentEasyMode
              ? "bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/60"
              : "bg-slate-50 dark:bg-slate-800 text-slate-400 border border-slate-100 dark:border-slate-800"
          }`}>
          <Settings2 className="w-6 h-6" />
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            {t.easyModeLabel}
            <HelpTooltip content={t.easyModeDesc} position="top-left" />
            {currentEasyMode && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 dark:bg-green-950/60 text-green-700 dark:text-green-300">
                {t.activeStatus || "Active"}
              </span>
            )}
          </h3>
        </div>
      </div>

      <ToggleSwitch
        currentEasyMode={currentEasyMode}
        currentToggleEasyMode={currentToggleEasyMode}
        t={t}
      />

      {currentEasyMode && onNavigateToLibrary && (
        <BackToLibraryButton
          onNavigate={onNavigateToLibrary}
          label={t.backToLibrary || "Back to Library"}
        />
      )}
    </div>
  )
}
