import { AlertTriangle, Loader2 } from "lucide-react"
import React from "react"

import { ModelIdleOverlay } from "./ModelIdleOverlay"

export interface ModelStatusOverlayProps {
  status: string
  progress: number
  speed: number
  eta: number
  retryCount: number
  maxRetries: number
  text: string
  webLlmError: string | null
  startDownload: () => void
  t: any
}

interface ModelDownloadingOverlayProps {
  status: string
  progress: number
  speed: number
  blur?: boolean
  eta: number
  text: string
  t: any
}

function formatEta(seconds: number) {
  if (seconds <= 0) return "--"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function ModelDownloadingOverlay({
  status,
  progress,
  speed,
  eta,
  text,
  t
}: ModelDownloadingOverlayProps) {
  const pText =
    status === "downloading"
      ? `${t.webLlmStatusDownloading?.replace("{{progress}}", progress.toString()) || `Downloading ${progress}%`}`
      : `${t.webLlmStatusVerifying || "Verifying model..."}`

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-[200px]">
      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
      <p className="font-semibold text-slate-600 dark:text-slate-400">
        {pText}
      </p>
      {status === "downloading" && (
        <div className="w-full space-y-1">
          <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
            <div
              className="bg-indigo-500 h-1 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-mono">
            <span>{progress}%</span>
            {speed > 0 && <span>{speed.toFixed(1)} MB/s</span>}
            {eta > 0 && <span>Remaining: {formatEta(eta)}</span>}
          </div>
          {text && (
            <p className="text-[8px] text-slate-400 dark:text-slate-500 text-center italic truncate max-w-full">
              {text}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function ModelQuotaWarningOverlay({ t }: { t: any }) {
  return (
    <div className="flex flex-col items-center gap-1.5">
      <AlertTriangle className="w-5 h-5 text-amber-500" />
      <p className="font-bold text-amber-600 dark:text-amber-500">
        {t.webLlmQuotaWarningTitle || "Insufficient Space"}
      </p>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-xs text-center">
        {t.webLlmQuotaWarningDesc ||
          "At least 1.5 GB of free space is required."}
      </p>
    </div>
  )
}

function ModelRetryingOverlay({
  retryCount,
  maxRetries,
  webLlmError,
  t
}: {
  retryCount: number
  maxRetries: number
  webLlmError: string | null
  t: any
}) {
  return (
    <div className="flex flex-col items-center gap-1.5 py-1 text-center">
      <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
      <p className="font-bold text-amber-600 dark:text-amber-500 text-xs">
        {(t.webLlmRetryingTitle || "Reconnecting... ({{count}}/{{max}})")
          .replace("{{count}}", String(retryCount))
          .replace("{{max}}", String(maxRetries))}
      </p>
      {webLlmError && (
        <p className="text-[9px] text-slate-500 max-w-xs leading-normal">
          {webLlmError}
        </p>
      )}
    </div>
  )
}

function ModelErrorOverlay({
  webLlmError,
  startDownload,
  t
}: {
  webLlmError: string | null
  startDownload: () => void
  t: any
}) {
  return (
    <div className="flex flex-col items-center gap-2 py-1 text-center">
      <AlertTriangle className="w-5 h-5 text-rose-500" />
      <p className="font-bold text-rose-600 dark:text-rose-400 text-xs">
        {t.webLlmStatusError || "Failed to load model"}
      </p>
      <p className="text-[9px] text-slate-500 max-w-xs leading-normal">
        {webLlmError || "An error occurred during model setup."}
      </p>
      <button
        onClick={startDownload}
        type="button"
        className="px-2.5 py-1 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-bold rounded-md active:scale-95 transition-all text-[9px] cursor-pointer">
        {t.webLlmRetryBtn || "Try Again"}
      </button>
    </div>
  )
}

export function ModelStatusOverlay({
  status,
  progress,
  speed,
  eta,
  retryCount,
  maxRetries,
  text,
  webLlmError,
  startDownload,
  t
}: ModelStatusOverlayProps) {
  const isDownloading =
    status === "checking" || status === "downloading" || status === "verifying"

  if (isDownloading) {
    return (
      <ModelDownloadingOverlay
        status={status}
        progress={progress}
        speed={speed}
        eta={eta}
        text={text}
        t={t}
      />
    )
  }
  if (status === "insufficient-quota") {
    return <ModelQuotaWarningOverlay t={t} />
  }
  if (status === "retrying") {
    return (
      <ModelRetryingOverlay
        retryCount={retryCount}
        maxRetries={maxRetries}
        webLlmError={webLlmError}
        t={t}
      />
    )
  }
  if (status === "error" || webLlmError) {
    return (
      <ModelErrorOverlay
        webLlmError={webLlmError}
        startDownload={startDownload}
        t={t}
      />
    )
  }
  return <ModelIdleOverlay startDownload={startDownload} t={t} />
}
