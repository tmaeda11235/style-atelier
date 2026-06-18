import {
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Laptop,
  Loader2,
  QrCode,
  RefreshCw,
  Smartphone
} from "lucide-react"
import React from "react"

interface P2PSyncIdleViewProps {
  t: any
  onStartHost: () => void
  onStartGuestScan: () => void
}

export function P2PSyncIdleView({
  t,
  onStartHost,
  onStartGuestScan
}: P2PSyncIdleViewProps) {
  return (
    <div className="flex flex-col items-center justify-center p-6 space-y-6 text-center animate-in fade-in duration-300">
      <div className="flex items-center gap-3">
        <QrCode className="w-8 h-8 text-blue-600 dark:text-blue-400 animate-pulse" />
        <h3 className="text-lg font-bold text-text-primary">
          {t?.title || "Local P2P Sync"}
        </h3>
      </div>
      <p className="max-w-md text-sm text-text-secondary leading-relaxed">
        {t?.description ||
          "Securely synchronize cards and custom categories directly between your devices (e.g. PC and Mobile) without uploading data to the cloud."}
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-lg">
        <button
          onClick={onStartHost}
          className="flex flex-col items-center justify-center p-5 border border-dashed border-border rounded-xl hover:border-blue-500 hover:bg-blue-50/10 dark:hover:bg-blue-950/20 transition-all group">
          <Laptop className="w-10 h-10 text-text-secondary group-hover:text-blue-500 mb-3" />
          <span className="font-semibold text-sm text-text-primary">
            {t?.receiveBtn || "Receive on PC"}
          </span>
          <span className="text-xs text-text-muted mt-1">
            {t?.receiveDesc || "Show QR to receive cards"}
          </span>
        </button>

        <button
          onClick={onStartGuestScan}
          className="flex flex-col items-center justify-center p-5 border border-dashed border-border rounded-xl hover:border-blue-500 hover:bg-blue-50/10 dark:hover:bg-blue-950/20 transition-all group">
          <Smartphone className="w-10 h-10 text-text-secondary group-hover:text-blue-500 mb-3" />
          <span className="font-semibold text-sm text-text-primary">
            {t?.sendBtn || "Send from Mobile"}
          </span>
          <span className="text-xs text-text-muted mt-1">
            {t?.sendDesc || "Scan QR to transmit data"}
          </span>
        </button>
      </div>
    </div>
  )
}

interface P2PSyncErrorViewProps {
  t: any
  errorMessage: string
  onReset: () => void
  onRetry: () => void
}

export function P2PSyncErrorView({
  t,
  errorMessage,
  onReset,
  onRetry
}: P2PSyncErrorViewProps) {
  return (
    <div className="flex flex-col items-center space-y-4 py-6 w-full max-w-sm">
      <AlertCircle className="w-14 h-14 text-red-500" />
      <h4 className="text-base font-bold text-text-primary">
        {t?.errorTitle || "Connection Error"}
      </h4>
      <p className="text-xs text-red-500 leading-relaxed font-medium bg-red-50/50 dark:bg-red-950/10 border border-red-200/50 dark:border-red-900/30 rounded-xl p-3 w-full">
        {errorMessage}
      </p>
      <div className="flex gap-3 w-full">
        <button
          onClick={onReset}
          className="flex-1 py-2 border border-border hover:bg-slate-50 dark:hover:bg-slate-900 text-text-primary rounded-lg text-xs font-semibold transition-colors">
          {t?.cancelBtn || "Cancel"}
        </button>
        <button
          onClick={onRetry}
          className="flex-1 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold transition-colors flex items-center justify-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5" />
          {t?.retryBtn || "Retry"}
        </button>
      </div>
    </div>
  )
}

interface P2PSyncProgressTrackerProps {
  t: any
  syncProgress?: {
    phase: 1 | 2 | 3
    currentImageIndex?: number
    totalImages?: number
  }
}

/* eslint-disable-next-line max-lines-per-function, sonarjs/cognitive-complexity */
export function P2PSyncProgressTracker({
  t,
  syncProgress
}: P2PSyncProgressTrackerProps) {
  const currentPhase = syncProgress?.phase || 1

  // Warn message
  const warningText =
    t?.closeWarning ||
    "Please do not close this panel until the synchronization is complete"

  // Phase texts
  const phase1Text = t?.phase1 || "Phase 1: Syncing database metadata"
  const phase2Text = t?.phase2 || "Phase 2: Verifying image differences"
  const phase3Text = t?.phase3 || "Phase 3: Transferring images"

  // Progress for phase 3
  const current =
    syncProgress?.currentImageIndex !== undefined
      ? syncProgress.currentImageIndex + 1
      : 1
  const total = syncProgress?.totalImages || 0
  const percentage = total > 0 ? Math.round((current / total) * 100) : 0

  let progressLabel = ""
  if (currentPhase === 3 && total > 0) {
    const formatStr =
      t?.syncProgress || "Syncing image files: {current}/{total} ({percent}%)"
    progressLabel = formatStr
      .replace("{current}", String(current))
      .replace("{total}", String(total))
      .replace("{percent}", String(percentage))
  }

  return (
    <div className="w-full space-y-4">
      {/* Close Warning Alert */}
      <div className="flex items-start gap-3 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/30 rounded-xl text-left text-xs text-amber-800 dark:text-amber-300 w-full animate-in fade-in duration-300">
        <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="font-semibold leading-relaxed">{warningText}</p>
        </div>
      </div>

      {/* Stepper Card */}
      <div className="border border-border bg-slate-50/50 dark:bg-slate-900/20 rounded-xl p-4 w-full text-left space-y-3.5">
        {/* Phase 1 */}
        <div className="flex items-center gap-3">
          {currentPhase > 1 ? (
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          ) : currentPhase === 1 ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-[10px] text-text-muted shrink-0 font-medium">
              1
            </div>
          )}
          <span
            className={`text-xs ${currentPhase === 1 ? "text-blue-600 dark:text-blue-400 font-bold" : currentPhase > 1 ? "text-text-secondary line-through opacity-70" : "text-text-muted"}`}>
            {phase1Text}
          </span>
        </div>

        {/* Phase 2 */}
        <div className="flex items-center gap-3">
          {currentPhase > 2 ? (
            <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
          ) : currentPhase === 2 ? (
            <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
          ) : (
            <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-[10px] text-text-muted shrink-0 font-medium">
              2
            </div>
          )}
          <span
            className={`text-xs ${currentPhase === 2 ? "text-blue-600 dark:text-blue-400 font-bold" : currentPhase > 2 ? "text-text-secondary line-through opacity-70" : "text-text-muted"}`}>
            {phase2Text}
          </span>
        </div>

        {/* Phase 3 */}
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {currentPhase > 3 ? (
              <CheckCircle2 className="w-5 h-5 text-green-500 shrink-0" />
            ) : currentPhase === 3 ? (
              <Loader2 className="w-5 h-5 text-blue-500 animate-spin shrink-0" />
            ) : (
              <div className="w-5 h-5 rounded-full border border-border flex items-center justify-center text-[10px] text-text-muted shrink-0 font-medium">
                3
              </div>
            )}
            <span
              className={`text-xs ${currentPhase === 3 ? "text-blue-600 dark:text-blue-400 font-bold" : "text-text-muted"}`}>
              {phase3Text}
            </span>
          </div>

          {/* Progress bar inside Phase 3 if it's active */}
          {currentPhase === 3 && total > 0 && (
            <div className="pl-8 space-y-2 animate-in slide-in-from-top-1 duration-250">
              <div className="flex justify-between items-center text-[10px] text-text-secondary font-medium">
                <span>{progressLabel}</span>
                <span>{percentage}%</span>
              </div>
              <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-1.5 overflow-hidden">
                <div
                  className="bg-blue-600 h-1.5 rounded-full transition-all duration-300 ease-out"
                  style={{ width: `${percentage}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
