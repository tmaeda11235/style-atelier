import {
  AlertTriangle,
  CheckCircle,
  Cpu,
  Download,
  RefreshCw,
  Trash2
} from "lucide-react"
import React from "react"

import { useWebGpu } from "../../hooks/useWebGpu"
import { HelpTooltip } from "../atoms/HelpTooltip"
import { WebGpuWarning } from "../molecules/WebGpuWarning"

export function WebLlmStatusRow({
  status,
  statusColorClass,
  statusText,
  label
}: {
  status: string
  statusColorClass: string
  statusText: string
  label: string
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-600 dark:text-slate-400 font-medium">
        {label}
      </span>
      <span className={`flex items-center gap-1.5 ${statusColorClass}`}>
        {status === "checking" && (
          <RefreshCw className="w-3.5 h-3.5 animate-spin" />
        )}
        {status === "retrying" && (
          <RefreshCw className="w-3.5 h-3.5 animate-spin text-amber-600" />
        )}
        {status === "ready" && <CheckCircle className="w-3.5 h-3.5" />}
        {status === "insufficient-quota" && (
          <AlertTriangle className="w-3.5 h-3.5" />
        )}
        {statusText}
      </span>
    </div>
  )
}

const formatEta = (seconds: number) => {
  if (seconds <= 0) return "--"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

interface WebLlmProgressProps {
  progress: number
  speed: number
  eta: number
  t: Record<string, string>
}

export function WebLlmProgress({
  progress,
  speed,
  eta,
  t
}: WebLlmProgressProps) {
  const { isSupported } = useWebGpu()
  const speedText = speed > 0 ? `${speed.toFixed(1)} MB/s` : ""
  const remainingText =
    eta > 0 ? `${t.webLlmRemaining || "Remaining"}: ${formatEta(eta)}` : ""
  const valueText = `${progress}%${speedText ? `, ${speedText}` : ""}${remainingText ? `, ${remainingText}` : ""}`

  return (
    <div className="space-y-1.5 animate-in fade-in duration-200">
      <div
        className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t.webLlmStatusLabel || "Download Progress"}
        aria-valuetext={valueText}>
        <div
          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div
        className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono"
        aria-live="polite"
        aria-atomic="true">
        <span>{progress}%</span>
        {speed > 0 && <span>{speed.toFixed(1)} MB/s</span>}
        {eta > 0 && (
          <span>
            {t.webLlmRemaining || "Remaining"}: {formatEta(eta)}
          </span>
        )}
        <span>1.0 GB total</span>
      </div>
      {isSupported === false && (
        <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <WebGpuWarning t={t} />
        </div>
      )}
    </div>
  )
}

export function WebLlmRetryingInfo({
  retryCount,
  maxRetries,
  error,
  t
}: {
  retryCount: number
  maxRetries: number
  error: string | null
  t: Record<string, string>
}) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="text-[11px] text-amber-600 dark:text-amber-500 bg-amber-500/5 border border-amber-500/10 rounded-lg p-2.5 space-y-1.5 animate-in shake duration-300">
      <div className="flex items-center gap-1.5 font-bold">
        <RefreshCw className="w-4 h-4 animate-spin shrink-0 text-amber-600 dark:text-amber-500" />
        <span>
          {(t.webLlmRetryingTitle || "Reconnecting... ({{count}}/{{max}})")
            .replace("{{count}}", String(retryCount))
            .replace("{{max}}", String(maxRetries))}
        </span>
      </div>
      {error && (
        <p className="leading-relaxed text-[10px] opacity-90">{error}</p>
      )}
    </div>
  )
}

export function WebLlmError({ error }: { error: string }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="text-[11px] text-rose-500 dark:text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-lg p-2.5 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{error}</span>
    </div>
  )
}

export function WebLlmQuotaWarning({ t }: { t: Record<string, string> }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="text-[11px] text-rose-500 dark:text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-lg p-2.5 space-y-1">
      <div className="flex items-center gap-1.5 font-bold">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{t.webLlmQuotaWarningTitle || "Insufficient Space"}</span>
      </div>
      <p className="leading-relaxed">
        {t.webLlmQuotaWarningDesc ||
          "Insufficient storage space. WebLLM requires at least 1.5 GB of free space."}
      </p>
    </div>
  )
}

export function WebLlmActionButtons({
  status,
  startDownload,
  handlePurge,
  t
}: {
  status: string
  startDownload: () => void
  handlePurge: () => void
  t: Record<string, string>
}) {
  return (
    <div className="flex items-center gap-2 pt-1">
      {status !== "ready" &&
        status !== "downloading" &&
        status !== "retrying" && (
          <button
            type="button"
            onClick={startDownload}
            disabled={status === "checking"}
            className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg text-xs transition-all duration-200 shadow-sm shadow-blue-500/10 hover:shadow-blue-500/20 active:scale-95 disabled:opacity-50 cursor-pointer">
            <Download className="w-3.5 h-3.5" />
            {t.webLlmDownloadBtn || "Download Model"}
          </button>
        )}

      {status === "ready" && (
        <button
          type="button"
          onClick={handlePurge}
          className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 font-medium rounded-lg text-xs transition-all duration-200 active:scale-95 cursor-pointer">
          <Trash2 className="w-3.5 h-3.5 text-rose-500" />
          {t.webLlmPurgeBtn || "Delete Cache"}
        </button>
      )}
    </div>
  )
}

export function WebLlmHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-xl text-blue-600 dark:text-blue-400">
        <Cpu className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          {title}
          <HelpTooltip content={desc} position="top-left" />
        </h4>
      </div>
    </div>
  )
}
