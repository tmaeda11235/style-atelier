import {
  AlertTriangle,
  CheckCircle,
  Cpu,
  Download,
  RefreshCw,
  Trash2
} from "lucide-react"
import React from "react"

import { useConfirm } from "../../contexts/ConfirmContext"
import { useLanguage } from "../../contexts/LanguageContext"
import { useWebLlm } from "../../hooks/useWebLlm"
import { HelpTooltip } from "../atoms/HelpTooltip"

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

function WebLlmStatusRow({
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
        {status === "ready" && <CheckCircle className="w-3.5 h-3.5" />}
        {status === "insufficient-quota" && (
          <AlertTriangle className="w-3.5 h-3.5" />
        )}
        {statusText}
      </span>
    </div>
  )
}

function WebLlmProgress({ progress }: { progress: number }) {
  return (
    <div className="space-y-1.5">
      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500">
        <span>{progress}%</span>
        <span>1.0 GB total</span>
      </div>
    </div>
  )
}

function WebLlmError({ error }: { error: string }) {
  return (
    <div className="text-[11px] text-rose-500 dark:text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-lg p-2.5 flex items-start gap-2">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
      <span>{error}</span>
    </div>
  )
}

function WebLlmQuotaWarning({ t }: { t: Record<string, string> }) {
  return (
    <div className="text-[11px] text-rose-500 dark:text-rose-400 bg-rose-500/5 border border-rose-500/10 rounded-lg p-2.5 space-y-1">
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

function WebLlmActionButtons({
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
      {status !== "ready" && status !== "downloading" && (
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
function WebLlmHeader({ title, desc }: { title: string; desc: string }) {
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

export function WebLlmSettingsSection() {
  const { status, progress, error, startDownload, purgeCache } = useWebLlm()
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

      <div className="bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800/50 rounded-xl p-4 space-y-4">
        <WebLlmStatusRow
          status={status}
          statusColorClass={disp.colorClass}
          statusText={disp.text}
          label={t.webLlmStatusLabel || "Status"}
        />

        {status === "downloading" && <WebLlmProgress progress={progress} />}
        {error && <WebLlmError error={error} />}
        {status === "insufficient-quota" && <WebLlmQuotaWarning t={t} />}

        <WebLlmActionButtons
          status={status}
          startDownload={startDownload}
          handlePurge={handlePurge}
          t={t}
        />
      </div>
    </div>
  )
}
