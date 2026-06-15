/* eslint-disable max-lines */
import { AlertTriangle, Loader2 } from "lucide-react"
import React from "react"

import { AdviceViewer } from "../atoms/AdviceViewer"
import { ModelIdleOverlay } from "./ModelIdleOverlay"

interface ModelStatusOverlayProps {
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

interface DownloadingBarProps {
  progress: number
  speed: number
  eta: number
  text: string
  valueText: string
  t: any
}

function DownloadingBar({
  progress,
  speed,
  eta,
  text,
  valueText,
  t
}: DownloadingBarProps) {
  return (
    <div className="w-full space-y-1">
      <div
        className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden"
        role="progressbar"
        aria-valuenow={progress}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={t.webLlmStatusLabel || "Download Progress"}
        aria-valuetext={valueText}>
        <div
          className="bg-indigo-500 h-1 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div
        className="flex justify-between text-[9px] text-slate-400 dark:text-slate-500 font-mono"
        aria-live="polite"
        aria-atomic="true">
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
  )
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

  const speedText = speed > 0 ? `${speed.toFixed(1)} MB/s` : ""
  const remainingText = eta > 0 ? `Remaining: ${formatEta(eta)}` : ""
  const valueText = `${progress}%${speedText ? `, ${speedText}` : ""}${remainingText ? `, ${remainingText}` : ""}`

  return (
    <div className="flex flex-col items-center gap-2 w-full max-w-[200px]">
      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
      <p className="font-semibold text-slate-600 dark:text-slate-400">
        {pText}
      </p>
      {status === "downloading" && (
        <DownloadingBar
          progress={progress}
          speed={speed}
          eta={eta}
          text={text}
          valueText={valueText}
          t={t}
        />
      )}
    </div>
  )
}

function ModelQuotaWarningOverlay({ t }: { t: any }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center gap-1.5">
      <AlertTriangle className="w-5 h-5 text-amber-500" />
      <p className="font-bold text-amber-600 dark:text-amber-500">
        {t.webLlmQuotaWarningTitle || "Insufficient Space"}
      </p>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-xs text-center font-sans">
        {t.webLlmQuotaExceededDesc ||
          "Storage space is insufficient. Please ensure at least 1.5 GB of free space."}
      </p>
    </div>
  )
}

function ModelUnsupportedOverlay({ t }: { t: any }) {
  return (
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center gap-1.5 text-center px-4">
      <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
      <p className="font-bold text-red-600 dark:text-red-500">
        {t.settings?.webLlmBothUnsupportedTitle || "AI Environment Unsupported"}
      </p>
      <p className="text-[10px] text-slate-500 dark:text-slate-400 max-w-xs font-sans leading-normal">
        {t.settings?.webLlmBothUnsupportedDesc ||
          "Both WebGPU and Wasm (CPU) are unavailable on your environment. Please update your browser or check your settings."}
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
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center gap-1.5 py-1 text-center">
      <Loader2 className="w-5 h-5 text-amber-500 animate-spin" />
      <p className="font-bold text-amber-600 dark:text-amber-500 text-xs">
        {(t.webLlmRetryingTitle || "Reconnecting... ({{count}}/{{max}})")
          .replace("{{count}}", String(retryCount))
          .replace("{{max}}", String(maxRetries))}
      </p>
      {webLlmError && (
        <p className="text-[9px] text-slate-500 max-w-xs leading-normal font-sans">
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
    <div
      role="alert"
      aria-live="assertive"
      className="flex flex-col items-center gap-2 py-1 text-center">
      <AlertTriangle className="w-5 h-5 text-rose-500" />
      <p className="font-bold text-rose-600 dark:text-rose-400 text-xs">
        {t.webLlmStatusError || "Failed to load model"}
      </p>
      <p className="text-[9px] text-slate-500 max-w-xs leading-normal font-sans">
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
  if (status === "insufficient-quota" || webLlmError === "QuotaExceededError")
    return <ModelQuotaWarningOverlay t={t} />
  if (status === "unsupported" || webLlmError === "both-unsupported")
    return <ModelUnsupportedOverlay t={t} />
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

interface AdviceSectionContentProps {
  isModelReady: boolean
  isEngineInitializing?: boolean
  status: string
  progress: number
  speed: number
  eta: number
  retryCount: number
  maxRetries: number
  text: string
  webLlmError: string | null
  startDownload: () => void
  loading: boolean
  error: string | null
  advice: string | null
  t: any
}

const NotReadyWrapper = ({ children }: { children: React.ReactNode }) => (
  <div className="flex flex-col items-center justify-center p-4 text-center rounded-lg bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-indigo-950/30">
    {children}
  </div>
)

export function AdviceSectionContent(props: AdviceSectionContentProps) {
  const { isModelReady, isEngineInitializing, loading, error, advice, t } =
    props
  if (!isModelReady) {
    return (
      <NotReadyWrapper>
        <ModelStatusOverlay
          status={props.status}
          progress={props.progress}
          speed={props.speed}
          eta={props.eta}
          retryCount={props.retryCount}
          maxRetries={props.maxRetries}
          text={props.text}
          webLlmError={props.webLlmError}
          startDownload={props.startDownload}
          t={t}
        />
      </NotReadyWrapper>
    )
  }
  if (loading) {
    const loadingText = isEngineInitializing
      ? t.aiEngineInitializing ||
        "Initializing AI engine (this may take a few seconds)..."
      : t.aiAdviceLoading || "Consulting the local AI cauldron..."
    return (
      <div className="flex items-center justify-center py-6 gap-2 text-slate-500 dark:text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
        <span>{loadingText}</span>
      </div>
    )
  }
  if (error) {
    return (
      <div className="flex items-center gap-1.5 p-2.5 rounded-lg bg-rose-50/50 dark:bg-rose-950/15 border border-rose-100/50 dark:border-rose-950/30 text-rose-600 dark:text-rose-400">
        <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        <span>
          {t.aiAdviceError || "Failed to concoct AI advice."}: {error}
        </span>
      </div>
    )
  }
  return advice ? <AdviceViewer advice={advice} /> : null
}
