import { AlertTriangle, Database, Trash2 } from "lucide-react"
import React from "react"

import { HelpTooltip } from "../atoms/HelpTooltip"

interface StorageManagerSectionProps {
  estimate: any
  handleClearHistory: () => void
  t: any
}

interface StorageProgressBarProps {
  estimate: {
    usageFormatted: string
    quotaFormatted: string
    percentage: number
  }
  t: any
}

function StorageProgressBar({ estimate, t }: StorageProgressBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600">
        <span>
          {t.storageUsage}: {estimate.usageFormatted} /{" "}
          {estimate.quotaFormatted}
        </span>
        <span>{estimate.percentage}%</span>
      </div>

      <div
        className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden"
        role="progressbar"
        aria-valuenow={estimate.percentage}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${t.storageUsage}: ${estimate.usageFormatted} / ${estimate.quotaFormatted}`}>
        <div
          className={`h-full transition-all duration-500 rounded-full ${
            estimate.percentage >= 90
              ? "bg-gradient-to-r from-rose-500 to-red-500"
              : estimate.percentage >= 80
                ? "bg-gradient-to-r from-amber-500 to-yellow-500"
                : "bg-gradient-to-r from-blue-500 to-indigo-500"
          }`}
          style={{ width: `${estimate.percentage}%` }}
        />
      </div>
    </div>
  )
}

function StorageWarningAlert({
  percentage,
  t
}: {
  percentage: number
  t: any
}) {
  if (percentage >= 90) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 bg-red-50 border border-red-200/60 rounded-xl p-3 text-red-800 text-xs">
        <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">{t.storageWarning90Title}</span>
          <p className="text-[10px] text-red-700/90 mt-0.5 leading-relaxed">
            {t.storageWarning90Desc}
          </p>
        </div>
      </div>
    )
  }
  if (percentage >= 80) {
    return (
      <div
        role="alert"
        className="flex items-start gap-2 bg-amber-50 border border-amber-200/60 rounded-xl p-3 text-amber-800 text-xs">
        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold">{t.storageWarning80Title}</span>
          <p className="text-[10px] text-amber-700/90 mt-0.5 leading-relaxed">
            {t.storageWarning80Desc}
          </p>
        </div>
      </div>
    )
  }
  return null
}

interface StorageCleanupActionProps {
  handleClearHistory: () => void
  t: any
}

function StorageCleanupAction({
  handleClearHistory,
  t
}: StorageCleanupActionProps) {
  return (
    <div className="mt-4 pt-3 border-t border-slate-100 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-700">
            {t.cleanupHistoryLabel}
          </span>
          <HelpTooltip content={t.cleanupHistoryDesc} position="top-left" />
        </div>
        <button
          onClick={handleClearHistory}
          className="py-1.5 px-3 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center gap-1.5">
          <Trash2 className="w-3.5 h-3.5" />
          {t.clearHistoryBtn}
        </button>
      </div>
    </div>
  )
}

export function StorageManagerSection({
  estimate,
  handleClearHistory,
  t
}: StorageManagerSectionProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      {/* Subtle decorative background gradient */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-indigo-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

      <div className="flex items-start gap-4 mb-4">
        <div className="p-3 bg-slate-50 text-slate-600 rounded-xl border border-slate-100">
          <Database className="w-6 h-6" />
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            {t.storageTitle}
            <HelpTooltip content={t.storageDesc} position="top-left" />
          </h3>
        </div>
      </div>

      {/* Progress Bar & Status Text */}
      {estimate ? (
        <div className="space-y-3">
          <StorageProgressBar estimate={estimate} t={t} />
          <StorageWarningAlert percentage={estimate.percentage} t={t} />
        </div>
      ) : (
        <div className="text-xs text-slate-400 animate-pulse">
          {t.storageLoading}
        </div>
      )}

      {/* Action button & Optimization description */}
      <StorageCleanupAction handleClearHistory={handleClearHistory} t={t} />
    </div>
  )
}
