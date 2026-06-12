import {
  AlertCircle,
  AlertTriangle,
  Download,
  Loader2,
  RefreshCw
} from "lucide-react"
import React from "react"

import { Button } from "../atoms/Button"

interface AiDownloadStatusProps {
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

function StatusChecking({ t }: { t: any }) {
  return (
    <div className="flex flex-col items-center gap-2 py-3">
      <RefreshCw className="w-5 h-5 text-indigo-500 animate-spin" />
      <p className="text-xs text-slate-500 text-center">
        {t.settings?.webLlmStatusChecking ||
          "Checking storage & cache status..."}
      </p>
    </div>
  )
}

function StatusQuotaWarning({ t }: { t: any }) {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-red-50 dark:bg-red-950/10 rounded-xl border border-red-200">
      <AlertTriangle className="w-6 h-6 text-red-500 mb-2" />
      <p className="text-xs font-bold text-red-600 mb-1">
        {t.settings?.webLlmQuotaWarningTitle || "Insufficient Space"}
      </p>
      <p className="text-[10px] text-slate-500 text-center leading-relaxed">
        {t.settings?.webLlmQuotaWarningDesc ||
          "At least 1.5 GB of free space is required."}
      </p>
    </div>
  )
}

function StatusError({
  webLlmError,
  startDownload,
  t
}: {
  webLlmError: string | null
  startDownload: () => void
  t: any
}) {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-red-50/50 rounded-xl border border-red-200 space-y-2.5">
      <div className="flex items-start gap-2 text-red-600">
        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
        <div className="space-y-0.5">
          <p className="text-xs font-bold">
            {t.settings?.webLlmStatusError || "Failed to load model"}
          </p>
          <p className="text-[10px] text-slate-500 max-w-xs leading-normal">
            {webLlmError || "An error occurred during model setup."}
          </p>
        </div>
      </div>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={startDownload}
        className="flex items-center gap-1.5 hover:scale-[1.02] transition-transform">
        <RefreshCw className="w-3.5 h-3.5" />
        {t.settings?.webLlmRetryBtn || "Try Again"}
      </Button>
    </div>
  )
}

function StatusRetrying({
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
    <div className="flex flex-col items-center justify-center p-4 bg-amber-50 rounded-xl border border-amber-200 space-y-2">
      <div className="flex items-center gap-1.5 font-bold text-amber-700 text-xs">
        <RefreshCw className="w-4 h-4 animate-spin text-amber-600" />
        <span>
          {(
            t.settings?.webLlmRetryingTitle ||
            "Reconnecting... ({{count}}/{{max}})"
          )
            .replace("{{count}}", String(retryCount))
            .replace("{{max}}", String(maxRetries))}
        </span>
      </div>
      {webLlmError && (
        <p className="text-[10px] text-slate-500 text-center leading-normal max-w-xs">
          {webLlmError}
        </p>
      )}
    </div>
  )
}

function formatEta(seconds: number) {
  if (seconds <= 0) return "--"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

function StatusDownloading({
  status,
  progress,
  speed,
  eta,
  text,
  t
}: {
  status: string
  progress: number
  speed: number
  eta: number
  text: string
  t: any
}) {
  const statusLabel =
    status === "verifying"
      ? t.settings?.webLlmStatusVerifying || "Verifying model..."
      : t.settings?.webLlmStatusDownloading?.replace(
          "{{progress}}",
          progress.toString()
        ) || `Downloading ${progress}%`

  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs text-slate-500">
        <span className="font-medium flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
          {statusLabel}
        </span>
        <span className="font-bold text-blue-600">{progress}%</span>
      </div>
      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border">
        <div
          className="bg-gradient-to-r from-blue-500 to-indigo-600 h-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 font-mono">
        {speed > 0 && <span>{speed.toFixed(1)} MB/s</span>}
        {eta > 0 && <span>Remaining: {formatEta(eta)}</span>}
        <span>1.0 GB total</span>
      </div>
      {text && (
        <p className="text-[9px] text-slate-400 mt-1 italic leading-normal border-t border-slate-100 pt-1.5">
          {text}
        </p>
      )}
    </div>
  )
}

function StatusIdle({
  startDownload,
  t
}: {
  startDownload: () => void
  t: any
}) {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
      <p className="text-xs text-slate-500 mb-3 text-center">
        {t.minting?.aiModelNotDownloaded ||
          "Download AI Model to Enable Recommendations"}
      </p>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={startDownload}
        className="flex items-center gap-2 hover:scale-[1.02] transition-transform">
        <Download className="w-4 h-4 text-blue-500" />
        {t.settings?.webLlmDownloadBtn || "Download Model"}
      </Button>
    </div>
  )
}

export function AiDownloadStatus({
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
}: AiDownloadStatusProps) {
  if (status === "checking") return <StatusChecking t={t} />
  if (status === "insufficient-quota") return <StatusQuotaWarning t={t} />
  if (status === "error" || webLlmError) {
    return (
      <StatusError
        webLlmError={webLlmError}
        startDownload={startDownload}
        t={t}
      />
    )
  }
  if (status === "retrying") {
    return (
      <StatusRetrying
        retryCount={retryCount}
        maxRetries={maxRetries}
        webLlmError={webLlmError}
        t={t}
      />
    )
  }
  if (status === "downloading" || status === "verifying") {
    return (
      <StatusDownloading
        status={status}
        progress={progress}
        speed={speed}
        eta={eta}
        text={text}
        t={t}
      />
    )
  }
  return <StatusIdle startDownload={startDownload} t={t} />
}
