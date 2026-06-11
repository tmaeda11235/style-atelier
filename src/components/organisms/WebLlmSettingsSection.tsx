import React from "react"

import { useConfirm } from "../../contexts/ConfirmContext"
import { useLanguage } from "../../contexts/LanguageContext"
import { useWebLlm } from "../../hooks/useWebLlm"
import {
  WebLlmActionButtons,
  WebLlmError,
  WebLlmHeader,
  WebLlmProgress,
  WebLlmQuotaWarning,
  WebLlmRetryingInfo,
  WebLlmStatusRow
} from "./WebLlmSettingsSubComponents"

interface StatusDisplay {
  colorClass: string
  text: string
}

function getStatusDisplay(
  status: string,
  progress: number,
  t: Record<string, string>
): StatusDisplay {
  switch (status) {
    case "checking":
      return {
        colorClass: "text-blue-500 animate-pulse",
        text: t.webLlmStatusChecking || "Checking..."
      }
    case "downloading":
      return {
        colorClass: "text-amber-500 font-semibold",
        text: (
          t.webLlmStatusDownloading || "Downloading ({{progress}}%)"
        ).replace("{{progress}}", String(progress))
      }
    case "retrying":
      return {
        colorClass: "text-amber-600 animate-pulse font-semibold",
        text: t.webLlmStatusRetrying || "Reconnecting..."
      }
    case "verifying":
      return {
        colorClass: "text-indigo-500 animate-pulse",
        text: t.webLlmStatusVerifying || "Verifying..."
      }
    case "ready":
      return {
        colorClass: "text-emerald-500 font-bold",
        text: t.webLlmStatusReady || "Loaded (Ready to Use)"
      }
    case "error":
      return {
        colorClass: "text-rose-500 font-semibold",
        text: t.webLlmStatusError || "Error occurred"
      }
    case "insufficient-quota":
      return {
        colorClass: "text-rose-600 font-semibold",
        text: t.webLlmStatusInsufficientQuota || "Insufficient Space"
      }
    default:
      return {
        colorClass: "text-slate-500",
        text: t.webLlmStatusIdle || "Not Downloaded"
      }
  }
}

interface WebLlmSettingsContentProps {
  status: string
  progress: number
  error: string | null
  speed: number
  eta: number
  retryCount: number
  maxRetries: number
  startDownload: () => void
  handlePurge: () => void
  t: any
  disp: { text: string; colorClass: string }
}

function WebLlmSettingsContent({
  status,
  progress,
  error,
  speed,
  eta,
  retryCount,
  maxRetries,
  startDownload,
  handlePurge,
  t,
  disp
}: WebLlmSettingsContentProps) {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-xl p-4 space-y-4">
      <WebLlmStatusRow
        status={status}
        statusColorClass={disp.colorClass}
        statusText={disp.text}
        label={t.webLlmStatusLabel || "Status"}
      />

      {status === "downloading" && (
        <WebLlmProgress progress={progress} speed={speed} eta={eta} t={t} />
      )}
      {status === "retrying" && (
        <WebLlmRetryingInfo
          retryCount={retryCount}
          maxRetries={maxRetries}
          error={error}
          t={t}
        />
      )}
      {error && status !== "retrying" && <WebLlmError error={error} />}
      {status === "insufficient-quota" && <WebLlmQuotaWarning t={t} />}

      <WebLlmActionButtons
        status={status}
        startDownload={startDownload}
        handlePurge={handlePurge}
        t={t}
      />
    </div>
  )
}

export function WebLlmSettingsSection() {
  const {
    status,
    progress,
    error,
    speed,
    eta,
    retryCount,
    maxRetries,
    startDownload,
    purgeCache
  } = useWebLlm()
  const { t: i18n } = useLanguage()
  const t = i18n.settings
  const confirm = useConfirm()

  const handlePurge = async () => {
    const ok = await confirm({
      title: t.confirmTitle || "Confirm Action",
      message: t.webLlmPurgeConfirm,
      confirmText: t.confirmBtn || "Confirm",
      cancelText: t.cancelBtn || "Cancel",
      variant: "danger"
    })
    if (ok) await purgeCache()
  }

  const disp = getStatusDisplay(status, progress, t)

  return (
    <div className="p-5 space-y-5 animate-in slide-in-from-top-2 duration-250">
      <WebLlmHeader title={t.webLlmGroupTitle} desc={t.webLlmDesc} />
      <WebLlmSettingsContent
        status={status}
        progress={progress}
        error={error}
        speed={speed}
        eta={eta}
        retryCount={retryCount}
        maxRetries={maxRetries}
        startDownload={startDownload}
        handlePurge={handlePurge}
        t={t}
        disp={disp}
      />
    </div>
  )
}
