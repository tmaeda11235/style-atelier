import { Database, DownloadCloud, RefreshCw, Trash2 } from "lucide-react"
import React from "react"

import { HelpTooltip } from "../atoms/HelpTooltip"

interface DangerZoneSectionProps {
  isSyncEnabled: boolean
  isSyncing: boolean
  isRestoring: boolean
  isLoadingCloudBackup: boolean
  cloudBackup: {
    modifiedTime: string
    size: string
  } | null
  handleResetDbClick: () => void
  handleForceRecovery: () => void
  t: any
}

export function DangerZoneSection({
  isSyncEnabled,
  isSyncing,
  isRestoring,
  isLoadingCloudBackup,
  cloudBackup,
  handleResetDbClick,
  handleForceRecovery,
  t
}: DangerZoneSectionProps) {
  return (
    <div className="bg-red-50/20 border border-red-200/50 rounded-2xl p-5">
      <div className="flex items-start gap-4">
        <div className="p-3 bg-red-100 text-red-600 rounded-xl">
          <Trash2 className="w-5 h-5" />
        </div>
        <div className="space-y-1.5 flex-1">
          <h3 className="text-xs font-bold text-red-900 flex items-center gap-1.5">
            {t.dangerZoneTitle}
            <HelpTooltip content={t.dangerZoneDesc} position="top-left" />
          </h3>
          <div className="flex flex-col gap-2 mt-2">
            {isSyncEnabled && (
              <div className="text-[10px] text-slate-500 font-medium mb-1 flex items-center gap-1">
                {isLoadingCloudBackup ? (
                  <span className="text-blue-500 animate-pulse flex items-center gap-1">
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    {t.loadingCloudBackup}
                  </span>
                ) : cloudBackup ? (
                  <span>
                    {t.cloudBackupLabel}
                    {cloudBackup.modifiedTime} ({cloudBackup.size})
                  </span>
                ) : (
                  <span className="text-slate-400">{t.noCloudBackup}</span>
                )}
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              <button
                id="reset-db-btn"
                onClick={handleResetDbClick}
                className="px-3 py-2 bg-red-600 hover:bg-red-700 hover:shadow-sm text-white text-[10px] font-bold rounded-xl transition-all duration-150 flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5" />
                {t.resetBtn}
              </button>
              <button
                onClick={handleForceRecovery}
                disabled={!isSyncEnabled || isSyncing || isRestoring}
                className="px-3 py-2 bg-white hover:bg-red-50 border border-red-200 text-red-700 text-[10px] font-bold rounded-xl transition-all duration-150 flex items-center gap-1.5 disabled:opacity-30"
                id="force-recovery-btn">
                <DownloadCloud className="w-3.5 h-3.5 text-red-500" />
                {t.restoreBtnText}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
