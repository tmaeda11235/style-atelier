import { AlertCircle, AlertTriangle, Download } from "lucide-react"
import React, { useState } from "react"

import { isMobileConnection } from "../../lib/network-utils"

interface ModelIdleOverlayProps {
  startDownload: () => void
  t: any
}

function ConfirmHeader({ t }: { t: any }) {
  return (
    <div className="flex items-start gap-1.5">
      <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="space-y-0.5">
        <h4 className="text-[10px] font-bold text-slate-800 dark:text-slate-200">
          {t.settings?.webLlmDownloadConfirmTitle || "Confirm Download"}
        </h4>
        <p className="text-[9px] text-slate-500 dark:text-slate-400 leading-normal">
          {t.settings?.webLlmDownloadConfirmDesc ||
            "This will download a ~2.0 GB model file. High data usage will occur."}
        </p>
      </div>
    </div>
  )
}

function MobileWarning({ t }: { t: any }) {
  return (
    <div className="p-1.5 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded flex items-start gap-1">
      <AlertCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-[8px] text-red-600 dark:text-red-400 leading-tight font-medium">
        {t.settings?.webLlmMobileWarning ||
          "Mobile connection or data saver detected. Wi-Fi is highly recommended."}
      </p>
    </div>
  )
}

function SizeDetails({ t }: { t: any }) {
  return (
    <div className="flex flex-col gap-0.5 text-[8px] text-slate-500 dark:text-slate-400 font-sans">
      <div className="flex items-center gap-1">
        <span className="w-1 h-1 rounded-full bg-slate-400 flex-shrink-0" />
        <span>
          {t.settings?.webLlmDownloadSize || "Download Size: ~2.0 GB"}
        </span>
      </div>
      <div className="flex items-center gap-1">
        <span className="w-1 h-1 rounded-full bg-slate-400 flex-shrink-0" />
        <span>
          {t.settings?.webLlmDiskSpaceWarning || "Required space: ~2.5 GB"}
        </span>
      </div>
    </div>
  )
}

function ActionButtons({
  startDownload,
  onCancel,
  t
}: {
  startDownload: () => void
  onCancel: () => void
  t: any
}) {
  return (
    <div className="flex gap-2 justify-end pt-0.5">
      <button
        type="button"
        onClick={onCancel}
        className="px-2 py-0.5 text-[9px] font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 cursor-pointer bg-transparent border-none">
        {t.settings?.webLlmCancelBtn || "Cancel"}
      </button>
      <button
        id="confirm-dialog-ok-btn"
        type="button"
        onClick={startDownload}
        className="px-2.5 py-0.5 text-[9px] font-bold text-white bg-blue-600 hover:bg-blue-700 rounded shadow-xs active:scale-95 transition-all duration-200 cursor-pointer flex items-center gap-1 border-none">
        <Download className="w-3.5 h-3.5 text-white/95" />
        {t.settings?.webLlmDownloadConfirmBtn || "Start Download"}
      </button>
    </div>
  )
}

function ModelIdleConfirmView({
  startDownload,
  onCancel,
  t,
  isMobile
}: {
  startDownload: () => void
  onCancel: () => void
  t: any
  isMobile: boolean
}) {
  return (
    <div className="flex flex-col p-3 bg-slate-50 dark:bg-slate-900/40 rounded-lg border border-slate-200 dark:border-slate-800 space-y-2.5 animate-in fade-in duration-200 max-w-xs text-left">
      <ConfirmHeader t={t} />
      {isMobile && <MobileWarning t={t} />}
      <SizeDetails t={t} />
      <ActionButtons startDownload={startDownload} onCancel={onCancel} t={t} />
    </div>
  )
}

function ModelIdleDefaultView({
  onConfirm,
  t
}: {
  onConfirm: () => void
  t: any
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <AlertTriangle className="w-5 h-5 text-slate-400" />
      <p className="text-slate-500 dark:text-slate-400 text-center text-[10px]">
        {t.aiAdviceModelNotReady ||
          "Local AI model is not loaded. Download it to activate recipe advice."}
      </p>

      <p className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1">
        <span className="font-semibold">
          {t.settings?.webLlmDownloadSize || "Download Size: ~2.0 GB"}
        </span>
        <span>•</span>
        <span>Wi-Fi Recommended</span>
      </p>

      <button
        onClick={onConfirm}
        type="button"
        className="px-3 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-md shadow-xs active:scale-95 transition-all duration-200 cursor-pointer text-[9px] flex items-center gap-1">
        <Download className="w-3.5 h-3.5 text-white/95" />
        {t.settings?.webLlmDownloadBtn || "Download Model"}
      </button>
    </div>
  )
}

export function ModelIdleOverlay({ startDownload, t }: ModelIdleOverlayProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const isMobile = isMobileConnection()

  if (showConfirm) {
    return (
      <ModelIdleConfirmView
        startDownload={startDownload}
        onCancel={() => setShowConfirm(false)}
        t={t}
        isMobile={isMobile}
      />
    )
  }

  return <ModelIdleDefaultView onConfirm={() => setShowConfirm(true)} t={t} />
}
