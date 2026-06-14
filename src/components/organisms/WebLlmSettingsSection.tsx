import React from "react"

import { useConfirm } from "../../contexts/ConfirmContext"
import { useLanguage } from "../../contexts/LanguageContext"
import { useWebGpu } from "../../hooks/useWebGpu"
import { useWebLlm } from "../../hooks/useWebLlm"
import { isMobileConnection } from "../../lib/network-utils"
import { WebGpuWarning } from "../molecules/WebGpuWarning"
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
  const { isSupported } = useWebGpu()
  return (
    <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-xl p-4 space-y-4">
      {isSupported === false && <WebGpuWarning t={t} />}
      <WebLlmStatusRow
        status={status}
        statusColorClass={disp.colorClass}
        statusText={disp.text}
        label={t.webLlmStatusLabel}
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
        isSupported={isSupported}
      />
    </div>
  )
}

function useWebLlmSettingsHandlers(
  t: Record<string, string>,
  confirm: any,
  startDownload: () => void,
  purgeCache: () => Promise<void>
) {
  const handleDownload = async () => {
    const isMobile = isMobileConnection()
    const warningText = isMobile
      ? `\n\n⚠️ ${t.webLlmMobileWarning || "Mobile connection or data saver detected. Wi-Fi connection is strongly recommended."}`
      : ""

    const ok = await confirm({
      title: t.webLlmDownloadConfirmTitle || "Confirm Large Download",
      message: `${t.webLlmDownloadConfirmDesc || "You are about to download the local AI model (~2.0 GB). If you are using a mobile hotspot or metered connection, please be aware of potential data charges. Do you want to proceed?"}\n\n• ${t.webLlmDownloadSize || "Download Size: ~2.0 GB"}\n• ${t.webLlmDiskSpaceWarning || "Required space: ~2.5 GB"}${warningText}`,
      confirmText: t.webLlmDownloadConfirmBtn || "Start Download",
      cancelText: t.webLlmCancelBtn || "Cancel",
      variant: "default"
    })
    if (ok) startDownload()
  }

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

  return { handleDownload, handlePurge }
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

  const { handleDownload, handlePurge } = useWebLlmSettingsHandlers(
    t,
    confirm,
    startDownload,
    purgeCache
  )

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
        startDownload={handleDownload}
        handlePurge={handlePurge}
        t={t}
        disp={disp}
      />
    </div>
  )
}
