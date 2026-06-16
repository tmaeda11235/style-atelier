import { AlertCircle, Download, RefreshCw, Sparkles } from "lucide-react"
import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useAiPromptDeclutter } from "../../hooks/useAiPromptDeclutter"
import type { PromptSegment } from "../../lib/db-schema"
import { AiStatusBadge } from "../atoms/AiStatusBadge"

export interface AiDeclutterProps {
  segments: PromptSegment[]
  setSegments: (segs: PromptSegment[]) => void
  inputValue: string
  setInputValue: (val: string) => void
  onChange?: (segments: PromptSegment[]) => void
}

interface ActionAreaProps {
  status: string
  progress: number
  loading: boolean
  onDeclutter: () => void
  onDownload: () => void
  t: Record<string, any>
}

function DeclutterStatusLabel({ status }: { status: string }) {
  return (
    <div className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5 font-medium">
      <Sparkles className="w-3.5 h-3.5 text-indigo-500 animate-pulse" />
      <span>AI Prompt Organizer</span>
      <AiStatusBadge status={status} className="shrink-0" />
    </div>
  )
}

function ActionProgress({
  progress,
  label
}: {
  progress: number
  label: string
}) {
  return (
    <div className="flex flex-col items-end gap-1 w-[140px]">
      <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">
        {label.replace("{{progress}}", String(Math.round(progress)))}
      </span>
      <div className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden">
        <div
          className="bg-indigo-600 dark:bg-indigo-500 h-1 rounded-full transition-all duration-300"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  )
}

function ActionDownloadButton({
  onClick,
  label
}: {
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg font-bold transition-all duration-150 flex items-center gap-1 cursor-pointer">
      <Download className="w-3 h-3 text-slate-500 dark:text-slate-400" />
      {label}
    </button>
  )
}

function ActionErrorButton({
  onClick,
  label
}: {
  onClick: () => void
  label: string
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg font-bold transition-all duration-150 flex items-center gap-1 cursor-pointer">
      <AlertCircle className="w-3 h-3 text-red-500" />
      {label}
    </button>
  )
}

function ActionReadyButton({
  loading,
  onClick,
  t
}: {
  loading: boolean
  onClick: () => void
  t: Record<string, any>
}) {
  return (
    <button
      type="button"
      disabled={loading}
      onClick={onClick}
      className="px-2.5 py-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-lg shadow-sm font-bold transition-all duration-150 flex items-center gap-1 cursor-pointer disabled:opacity-50">
      {loading ? (
        <>
          <RefreshCw className="w-3 h-3 animate-spin" />
          {t.minting.aiDecluttering}
        </>
      ) : (
        <>
          <Sparkles className="w-3 h-3" />
          {t.minting.aiDeclutter}
        </>
      )}
    </button>
  )
}

function DeclutterActionArea({
  status,
  progress,
  loading,
  onDeclutter,
  onDownload,
  t
}: ActionAreaProps) {
  if (status === "ready") {
    return <ActionReadyButton loading={loading} onClick={onDeclutter} t={t} />
  }
  if (status === "idle") {
    return (
      <ActionDownloadButton
        onClick={onDownload}
        label={t.minting.aiDeclutterDownload}
      />
    )
  }
  if (
    status === "checking" ||
    status === "downloading" ||
    status === "verifying"
  ) {
    return (
      <ActionProgress
        progress={progress}
        label={t.minting.aiDeclutterDownloading}
      />
    )
  }
  if (status === "error") {
    return (
      <ActionErrorButton
        onClick={onDownload}
        label={t.minting.aiDeclutterError}
      />
    )
  }
  if (status === "insufficient-quota") {
    return (
      <span className="text-red-500 font-bold flex items-center gap-1">
        <AlertCircle className="w-3.5 h-3.5" />
        Insufficient Space (1.5GB required)
      </span>
    )
  }
  return null
}

function getCombinedText(
  segments: PromptSegment[],
  inputValue: string
): string {
  const textVals = segments
    .map((s) =>
      s.type === "text" ? s.value : s.type === "slot" ? s.label : ""
    )
    .filter(Boolean)
  if (inputValue.trim()) {
    textVals.push(inputValue.trim())
  }
  return textVals.join(", ")
}

export function AiDeclutterControl({
  segments,
  setSegments,
  inputValue,
  setInputValue,
  onChange
}: AiDeclutterProps) {
  const { t } = useLanguage()
  const { status, progress, startDownload, loading, error, declutterPrompt } =
    useAiPromptDeclutter()

  const handleDeclutter = async () => {
    const combinedText = getCombinedText(segments, inputValue)
    if (!combinedText) return

    const decluttered = await declutterPrompt(combinedText)
    if (decluttered) {
      setSegments(decluttered)
      setInputValue("")
      if (onChange) onChange(decluttered)
    }
  }

  return (
    <div className="mt-2.5 flex flex-col gap-1 text-[11px] border-t border-slate-100 dark:border-slate-800 pt-2 font-sans select-none">
      <div className="flex items-center justify-between min-h-[28px]">
        <DeclutterStatusLabel status={status} />
        <DeclutterActionArea
          status={status}
          progress={progress}
          loading={loading}
          onDeclutter={handleDeclutter}
          onDownload={startDownload}
          t={t}
        />
      </div>
      {error && (
        <span className="text-[10px] text-red-500 font-semibold mt-1">
          Error: {error}
        </span>
      )}
    </div>
  )
}
