import React from "react"

import { HelpTooltip } from "../atoms/HelpTooltip"

interface FeatureToggleItemProps {
  id: string
  label: string
  tooltipContent: string
  checked: boolean
  onChange: (checked: boolean) => void
}

export function FeatureToggleItem({
  id,
  label,
  tooltipContent,
  checked,
  onChange
}: FeatureToggleItemProps) {
  return (
    <div className="flex items-center justify-between bg-slate-50/80 dark:bg-slate-800/40 border border-slate-100/80 dark:border-slate-800 rounded-xl px-4 py-2.5 transition-all hover:bg-slate-50 dark:hover:bg-slate-800/60">
      <div className="flex items-center gap-1.5">
        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
          {label}
        </span>
        <HelpTooltip content={tooltipContent} position="top-left" />
      </div>
      <button
        type="button"
        id={id}
        onClick={() => onChange(!checked)}
        className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
          checked
            ? "bg-blue-600 dark:bg-blue-500"
            : "bg-slate-200 dark:bg-slate-700"
        }`}>
        <span
          className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  )
}
