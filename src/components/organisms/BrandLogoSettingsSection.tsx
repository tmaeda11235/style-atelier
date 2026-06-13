import React from "react"

import { HelpTooltip } from "../atoms/HelpTooltip"

export interface BrandLogoSettingsProps {
  includeBrandLogo: boolean
  toggleBrandLogo: (enabled: boolean) => void
  alwaysEnglishLogoText: boolean
  toggleAlwaysEnglishLogoText: (enabled: boolean) => void
  t: any
}

interface ToggleProps {
  label: string
  subLabel: string
  enabled: boolean
  onToggle: (enabled: boolean) => void
  disabled?: boolean
  id: string
}

interface HeaderProps {
  label: string
  desc: string
}

function SettingsToggle({
  label,
  subLabel,
  enabled,
  onToggle,
  disabled = false,
  id
}: ToggleProps) {
  return (
    <div
      className={`flex items-center justify-between bg-slate-50/80 border border-slate-100/80 rounded-xl px-4 py-3 transition-all ${disabled ? "" : "hover:bg-slate-50"}`}>
      <div className="flex flex-col">
        <span className="text-xs font-bold text-slate-700">{label}</span>
        <span className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">
          {subLabel}
        </span>
      </div>
      <button
        type="button"
        id={id}
        disabled={disabled}
        onClick={() => onToggle(!enabled)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          disabled
            ? "opacity-50 cursor-not-allowed bg-slate-200"
            : enabled
              ? "bg-blue-600"
              : "bg-slate-200"
        }`}>
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            enabled && !disabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}

function BrandLogoSettingsHeader({ label, desc }: HeaderProps) {
  return (
    <div className="flex items-start gap-4 mb-4">
      <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-100">
        <span className="text-xl">🔮</span>
      </div>
      <div className="space-y-1 flex-1">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
          {label}
          <HelpTooltip content={desc} position="top-left" />
        </h3>
      </div>
    </div>
  )
}

export function BrandLogoSettings({
  includeBrandLogo,
  toggleBrandLogo,
  alwaysEnglishLogoText,
  toggleAlwaysEnglishLogoText,
  t
}: BrandLogoSettingsProps) {
  return (
    <div className="relative overflow-hidden" id="settings-brand-logo-section">
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

      <BrandLogoSettingsHeader
        label={t.includeBrandLogoLabel || "Include Brand Logo"}
        desc={
          t.includeBrandLogoDesc ||
          "Embed 'Minted with Style Atelier' badge in exported images."
        }
      />

      <div className="mb-3">
        <SettingsToggle
          label={t.includeBrandLogoToggleLabel || "Include Brand Logo"}
          subLabel={
            t.includeBrandLogoToggleSub ||
            "Embed brand badge in exported images"
          }
          enabled={includeBrandLogo}
          onToggle={toggleBrandLogo}
          id="brand-logo-toggle-btn"
        />
      </div>

      <SettingsToggle
        label={t.alwaysEnglishLogoTextLabel || "Force English Badge Logo"}
        subLabel={
          t.alwaysEnglishLogoTextSub ||
          "Keep 'Minted with Style Atelier' text even in Japanese"
        }
        enabled={alwaysEnglishLogoText}
        onToggle={toggleAlwaysEnglishLogoText}
        disabled={!includeBrandLogo}
        id="always-english-logo-toggle-btn"
      />
    </div>
  )
}
