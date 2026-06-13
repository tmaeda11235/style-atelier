import React from "react"

interface SyncProgressBarProps {
  isSyncing: boolean
  isRestoring: boolean
  syncProgress: number | null
  restoreProgress: number | null
}

export function SyncProgressBar({
  isSyncing,
  isRestoring,
  syncProgress,
  restoreProgress
}: SyncProgressBarProps) {
  if (!isSyncing && !isRestoring) return null
  return (
    <div className="mt-2 mb-4 w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
      <div
        className="h-full transition-all duration-300 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 animate-pulse"
        style={{
          width: `${isSyncing ? (syncProgress ?? 0) : (restoreProgress ?? 0)}%`
        }}
      />
    </div>
  )
}
