import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Cloud,
  Lock,
  RefreshCw,
  ShieldCheck
} from "lucide-react"
import React from "react"

import { HelpTooltip } from "../atoms/HelpTooltip"

interface CloudSyncSectionProps {
  isSyncEnabled: boolean
  isAutoSyncEnabled: boolean
  isSyncing: boolean
  isRestoring: boolean
  lastBackup: string | null
  cloudBackup: {
    modifiedTime: string
    size: string
  } | null
  isLoadingCloudBackup: boolean
  syncProgress: number | null
  restoreProgress: number | null
  statusMessage: {
    text: string
    type: "success" | "error" | "info" | null
  }
  handleCancelSync: () => void
  handleToggleSync: (checked: boolean) => void
  handleToggleAutoSync: (checked: boolean) => void
  handleSync: () => void
  t: any
}

export function CloudSyncSection({
  isSyncEnabled,
  isAutoSyncEnabled,
  isSyncing,
  isRestoring,
  lastBackup,
  cloudBackup,
  isLoadingCloudBackup,
  syncProgress,
  restoreProgress,
  statusMessage,
  handleCancelSync,
  handleToggleSync,
  handleToggleAutoSync,
  handleSync,
  t
}: CloudSyncSectionProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      {/* Subtle decorative background gradient */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

      <div className="flex items-start gap-4 mb-4">
        <div
          className={`p-3 rounded-xl ${isSyncEnabled ? "bg-blue-50 text-blue-600 border border-blue-100" : "bg-slate-50 text-slate-400 border border-slate-100"}`}>
          <Cloud className="w-6 h-6" />
        </div>
        <div className="space-y-1 flex-1">
          <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
            {t.gdriveSyncLabel}
            <HelpTooltip content={t.gdriveSyncDesc} position="top-left" />
            {isSyncEnabled && (
              <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-medium bg-green-100 text-green-700">
                <ShieldCheck className="w-3 h-3 mr-0.5" /> {t.activeStatus}
              </span>
            )}
          </h3>
        </div>
      </div>

      {/* Sync Toggle Switch */}
      <div className="flex items-center justify-between bg-slate-50/80 border border-slate-100/80 rounded-xl px-4 py-3 mb-4 transition-all hover:bg-slate-50">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-bold text-slate-700">
            {t.googleDriveToggleLabel}
          </span>
          <HelpTooltip content={t.googleDriveToggleSub} position="top-left" />
        </div>
        <button
          type="button"
          id="google-drive-toggle-btn"
          onClick={() => handleToggleSync(!isSyncEnabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
            isSyncEnabled ? "bg-blue-600" : "bg-slate-200"
          }`}>
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
              isSyncEnabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {/* Auto-Sync Toggle Switch */}
      {isSyncEnabled && (
        <div className="flex items-center justify-between bg-slate-50/80 border border-slate-100/80 rounded-xl px-4 py-3 mb-4 transition-all hover:bg-slate-50">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700">
              {t.autoBackupLabel}
            </span>
            <HelpTooltip content={t.autoBackupDesc} position="top-left" />
          </div>
          <button
            type="button"
            id="google-drive-auto-sync-btn"
            onClick={() => handleToggleAutoSync(!isAutoSyncEnabled)}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              isAutoSyncEnabled ? "bg-blue-600" : "bg-slate-200"
            }`}>
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                isAutoSyncEnabled ? "translate-x-5" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      )}

      {/* Status / Message Display */}
      {statusMessage.text && (
        <div
          className={`mt-3 mb-4 px-3 py-2.5 rounded-xl text-xs flex items-center justify-between border animate-in fade-in duration-200 ${
            statusMessage.type === "success"
              ? "bg-green-50 text-green-800 border-green-200"
              : statusMessage.type === "error"
                ? "bg-red-50 text-red-800 border-red-200"
                : "bg-blue-50 text-blue-800 border-blue-200"
          }`}>
          <div className="flex items-center gap-2">
            {statusMessage.type === "success" && (
              <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
            )}
            {statusMessage.type === "error" && (
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
            )}
            {statusMessage.type === "info" && (
              <RefreshCw className="w-4 h-4 text-blue-600 animate-spin shrink-0" />
            )}
            <span className="font-medium">{statusMessage.text}</span>
          </div>
          {statusMessage.type === "info" && (isSyncing || isRestoring) && (
            <button
              type="button"
              onClick={handleCancelSync}
              className="ml-2 px-2.5 py-1 bg-red-100 hover:bg-red-200 text-red-700 text-[10px] font-bold rounded-lg transition-colors border border-red-200/50">
              {t.cancelBtnText}
            </button>
          )}
        </div>
      )}

      {/* Progress Bar (Only during Sync or Force Recovering) */}
      {(isSyncing || isRestoring) && (
        <div className="mt-2 mb-4 w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
          <div
            className="h-full transition-all duration-300 rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 animate-pulse"
            style={{
              width: `${isSyncing ? (syncProgress ?? 0) : (restoreProgress ?? 0)}%`
            }}
          />
        </div>
      )}

      {/* Action Buttons */}
      <div className="mt-4 space-y-4">
        <button
          onClick={handleSync}
          disabled={!isSyncEnabled || isSyncing || isRestoring}
          className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-30 disabled:hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-sm transition-all duration-200 flex items-center justify-center gap-2"
          id="google-drive-sync-btn">
          {isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              {t.syncingText} {syncProgress !== null ? `${syncProgress}%` : ""}
            </>
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" />
              {t.syncButtonText}
            </>
          )}
        </button>

        {/* Last Backup Time & Cloud Backup Preview */}
        {(lastBackup || cloudBackup || isLoadingCloudBackup) && (
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
        )}
        {/* Security note */}
        <div className="flex items-center gap-1.5 bg-blue-50/40 rounded-xl px-3 py-2 border border-blue-100/50 justify-between">
          <div className="flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span className="text-[10px] text-blue-700 font-bold">
              {t.securityNoteTitle}
            </span>
          </div>
          <HelpTooltip content={t.securityNote} position="top-left" />
        </div>
      </div>
    </div>
  )
}
