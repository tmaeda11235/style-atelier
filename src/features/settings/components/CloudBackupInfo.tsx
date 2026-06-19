import { Clock, RefreshCw } from "lucide-react"
import React from "react"

interface CloudBackupInfoProps {
  lastBackup: string | null
  cloudBackup: {
    modifiedTime: string
    size: string
  } | null
  isLoadingCloudBackup: boolean
  isSyncEnabled: boolean
  t: any
}

export function CloudBackupInfo({
  lastBackup,
  cloudBackup,
  isLoadingCloudBackup,
  isSyncEnabled,
  t
}: CloudBackupInfoProps) {
  if (!lastBackup && !cloudBackup && !isLoadingCloudBackup) return null
  return (
    <div className="flex flex-col items-center justify-center gap-1.5 border-t border-slate-100 pt-3">
      {lastBackup && (
        <div className="flex items-center gap-1 text-[10px] text-slate-400 font-medium">
          <Clock className="w-3.5 h-3.5" />
          <span>
            {t.lastBackupLabel} {lastBackup}
          </span>
        </div>
      )}
      {isLoadingCloudBackup ? (
        <div className="flex items-center gap-1 text-[10px] text-blue-400 font-medium animate-pulse">
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
          <span>{t.loadingCloudBackup}</span>
        </div>
      ) : cloudBackup ? (
        <div className="flex flex-col items-center gap-0.5 text-[10px] text-slate-500 font-medium bg-slate-50 rounded-lg py-1.5 px-3 border border-slate-100 w-full text-center">
          <span className="text-[9px] text-slate-400 uppercase tracking-wider font-bold">
            {t.cloudBackupPreview}
          </span>
          <span>
            {t.restoreConfirmTime} {cloudBackup.modifiedTime}
          </span>
          <span>
            {t.restoreConfirmSize} {cloudBackup.size}
          </span>
        </div>
      ) : (
        isSyncEnabled && (
          <div className="text-[10px] text-slate-400 font-medium">
            {t.noCloudBackup}
          </div>
        )
      )}
    </div>
  )
}
