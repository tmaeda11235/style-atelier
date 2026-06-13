import { AlertCircle, AlertTriangle, Download } from "lucide-react"
import React, { useState } from "react"

import { isMobileConnection } from "../../lib/network-utils"
import { Button } from "../atoms/Button"

interface StatusIdleProps {
  startDownload: () => void
  t: any
}

function ConfirmHeader({ t }: { t: any }) {
  return (
    <div className="flex items-start gap-2">
      <AlertTriangle className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
      <div className="space-y-1">
        <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
          {t.settings?.webLlmDownloadConfirmTitle || "Confirm Download"}
        </h4>
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-normal">
          {t.settings?.webLlmDownloadConfirmDesc ||
            "This will download a ~2.0 GB model file. High data usage will occur."}
        </p>
      </div>
    </div>
  )
}

function MobileConnectionWarning({ t }: { t: any }) {
  return (
    <div className="p-2 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/50 rounded-lg flex items-start gap-1.5">
      <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
      <p className="text-[9px] text-red-600 dark:text-red-400 leading-tight font-medium">
        {t.settings?.webLlmMobileWarning ||
          "Mobile connection or data saver detected. Wi-Fi is highly recommended."}
      </p>
    </div>
  )
}

function SizeDetails({ t }: { t: any }) {
  return (
    <div className="flex flex-col gap-1 text-[9px] text-slate-500 dark:text-slate-400 font-sans">
      <div className="flex items-center gap-1.5">
        <span className="w-1 h-1 rounded-full bg-slate-400 flex-shrink-0" />
        <span>
          {t.settings?.webLlmDownloadSize || "Download Size: ~2.0 GB"}
        </span>
      </div>
      <div className="flex items-center gap-1.5">
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
    <div className="flex gap-2 justify-end pt-1">
      <Button
        type="button"
        size="xs"
        variant="ghost"
        onClick={onCancel}
        className="text-[10px] cursor-pointer">
        {t.settings?.webLlmCancelBtn || "Cancel"}
      </Button>
      <Button
        id="confirm-dialog-ok-btn"
        type="button"
        size="xs"
        variant="secondary"
        onClick={startDownload}
        className="flex items-center gap-1 hover:scale-[1.02] transition-transform text-[10px] bg-blue-600 hover:bg-blue-700 text-white border-none cursor-pointer">
        <Download className="w-3.5 h-3.5" />
        {t.settings?.webLlmDownloadConfirmBtn || "Download"}
      </Button>
    </div>
  )
}

function StatusConfirmView({
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
    <div className="flex flex-col p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-in fade-in duration-200">
      <ConfirmHeader t={t} />
      {isMobile && <MobileConnectionWarning t={t} />}
      <SizeDetails t={t} />
      <ActionButtons startDownload={startDownload} onCancel={onCancel} t={t} />
    </div>
  )
}

function StatusDefaultView({
  onConfirm,
  t
}: {
  onConfirm: () => void
  t: any
}) {
  return (
    <div className="flex flex-col items-center justify-center p-4 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
      <p className="text-xs text-slate-500 dark:text-slate-400 mb-2 text-center leading-normal">
        {t.minting?.aiModelNotDownloaded ||
          "Download AI Model to Enable Recommendations"}
      </p>

      <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-3.5 flex items-center gap-1.5">
        <span className="font-semibold">
          {t.settings?.webLlmDownloadSize || "Download Size: ~2.0 GB"}
        </span>
        <span>•</span>
        <span>Wi-Fi Recommended</span>
      </p>

      <Button
        type="button"
        size="sm"
        variant="secondary"
        onClick={onConfirm}
        className="flex items-center gap-2 hover:scale-[1.02] transition-transform shadow-sm cursor-pointer">
        <Download className="w-4 h-4 text-blue-500" />
        {t.settings?.webLlmDownloadBtn || "Download Model"}
      </Button>
    </div>
  )
}

export function StatusIdle({ startDownload, t }: StatusIdleProps) {
  const [showConfirm, setShowConfirm] = useState(false)
  const isMobile = isMobileConnection()

  if (showConfirm) {
    return (
      <StatusConfirmView
        startDownload={startDownload}
        onCancel={() => setShowConfirm(false)}
        t={t}
        isMobile={isMobile}
      />
    )
  }

  return <StatusDefaultView onConfirm={() => setShowConfirm(true)} t={t} />
}
