import { Cloud, Lock, RefreshCw, ShieldCheck } from "lucide-react"
import React from "react"

import { HelpTooltip } from "../atoms/HelpTooltip"
import { CloudBackupInfo } from "./CloudBackupInfo"
import { SyncProgressBar } from "./SyncProgressBar"
import { SyncStatusMessage } from "./SyncStatusMessage"

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
    actionType?: "quota" | "rateLimit" | null
  }
  handleCancelSync: () => void
  handleToggleSync: (checked: boolean) => void
  handleToggleAutoSync: (checked: boolean) => void
  handleSync: () => void
  t: any
}

interface SyncHeaderProps {
  isSyncEnabled: boolean
  t: any
}

function SyncHeader({ isSyncEnabled, t }: SyncHeaderProps) {
  return (
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
  )
}

interface SyncToggleSwitchesProps {
  isSyncEnabled: boolean
  isAutoSyncEnabled: boolean
  handleToggleSync: (checked: boolean) => void
  handleToggleAutoSync: (checked: boolean) => void
  t: any
}

function SyncToggleSwitches({
  isSyncEnabled,
  isAutoSyncEnabled,
  handleToggleSync,
  handleToggleAutoSync,
  t
}: SyncToggleSwitchesProps) {
  return (
    <>
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
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isSyncEnabled ? "bg-blue-600" : "bg-slate-200"}`}>
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isSyncEnabled ? "translate-x-5" : "translate-x-0"}`}
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
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${isAutoSyncEnabled ? "bg-blue-600" : "bg-slate-200"}`}>
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${isAutoSyncEnabled ? "translate-x-5" : "translate-x-0"}`}
            />
          </button>
        </div>
      )}
    </>
  )
}

interface SyncActionsProps {
  isSyncEnabled: boolean
  isSyncing: boolean
  isRestoring: boolean
  syncProgress: number | null
  lastBackup: string | null
  cloudBackup: {
    modifiedTime: string
    size: string
  } | null
  isLoadingCloudBackup: boolean
  handleSync: () => void
  t: any
}

function SyncActions({
  isSyncEnabled,
  isSyncing,
  isRestoring,
  syncProgress,
  lastBackup,
  cloudBackup,
  isLoadingCloudBackup,
  handleSync,
  t
}: SyncActionsProps) {
  return (
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

      <CloudBackupInfo
        lastBackup={lastBackup}
        cloudBackup={cloudBackup}
        isLoadingCloudBackup={isLoadingCloudBackup}
        isSyncEnabled={isSyncEnabled}
        t={t}
      />

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
  )
}

export function CloudSyncSection(props: CloudSyncSectionProps) {
  return (
    <div className="bg-white border border-slate-200/80 rounded-2xl p-5 shadow-sm hover:shadow-md transition-shadow relative overflow-hidden">
      {/* Subtle decorative background gradient */}
      <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-blue-500/5 to-transparent rounded-full -mr-8 -mt-8 pointer-events-none" />

      <SyncHeader isSyncEnabled={props.isSyncEnabled} t={props.t} />

      <SyncToggleSwitches
        isSyncEnabled={props.isSyncEnabled}
        isAutoSyncEnabled={props.isAutoSyncEnabled}
        handleToggleSync={props.handleToggleSync}
        handleToggleAutoSync={props.handleToggleAutoSync}
        t={props.t}
      />

      {/* Status / Message Display */}
      <SyncStatusMessage
        statusMessage={props.statusMessage}
        isSyncing={props.isSyncing}
        isRestoring={props.isRestoring}
        handleCancelSync={props.handleCancelSync}
        t={props.t}
      />

      {/* Progress Bar (Only during Sync or Force Recovering) */}
      <SyncProgressBar
        isSyncing={props.isSyncing}
        isRestoring={props.isRestoring}
        syncProgress={props.syncProgress}
        restoreProgress={props.restoreProgress}
      />

      {/* Action Buttons & Backup Info */}
      <SyncActions
        isSyncEnabled={props.isSyncEnabled}
        isSyncing={props.isSyncing}
        isRestoring={props.isRestoring}
        syncProgress={props.syncProgress}
        lastBackup={props.lastBackup}
        cloudBackup={props.cloudBackup}
        isLoadingCloudBackup={props.isLoadingCloudBackup}
        handleSync={props.handleSync}
        t={props.t}
      />
    </div>
  )
}
