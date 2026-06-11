import {
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles
} from "lucide-react"
import React, { useState } from "react"

import { useAiRecipeAdvice } from "../../hooks/useAiRecipeAdvice"
import { useWebLlm } from "../../hooks/useWebLlm"

export interface AiRecipeAdviceSectionProps {
  cards: any[]
  t: any
}

interface ModelStatusOverlayProps {
  status: string
  progress: number
  startDownload: () => void
  t: any
}

interface ModelDownloadingOverlayProps {
  status: string
  progress: number
  t: any
}

const ModelDownloadingOverlay: React.FC<ModelDownloadingOverlayProps> = ({
  status,
  progress,
  t
}) => {
  const pText =
    status === "downloading"
      ? `${t.webLlmStatusDownloading?.replace("{{progress}}", progress.toString()) || `Downloading ${progress}%`}`
      : `${t.webLlmStatusVerifying || "Verifying model..."}`
  return (
    <div className="flex flex-col items-center gap-2">
      <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
      <p className="font-semibold text-slate-600 dark:text-slate-400">
        {pText}
      </p>
      {status === "downloading" && (
        <div className="w-32 bg-slate-200 dark:bg-slate-800 rounded-full h-1 overflow-hidden mt-1">
          <div
            className="bg-indigo-500 h-1 rounded-full transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  )
}

interface ModelQuotaWarningOverlayProps {
  t: any
}

const ModelQuotaWarningOverlay: React.FC<ModelQuotaWarningOverlayProps> = ({
  t
}) => {
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

const ModelStatusOverlay: React.FC<ModelStatusOverlayProps> = ({
  status,
  progress,
  startDownload,
  t
}) => {
  const isDownloading =
    status === "checking" || status === "downloading" || status === "verifying"

  if (isDownloading) {
    return <ModelDownloadingOverlay status={status} progress={progress} t={t} />
  }

  if (status === "insufficient-quota") {
    return <ModelQuotaWarningOverlay t={t} />
  }

  return (
    <div className="flex flex-col items-center gap-2">
      <AlertTriangle className="w-5 h-5 text-slate-400" />
      <p className="text-slate-500 dark:text-slate-400 text-center">
        {t.aiAdviceModelNotReady ||
          "Local AI model is not loaded. Download it to activate recipe advice."}
      </p>
      <button
        onClick={startDownload}
        type="button"
        className="px-3 py-1 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white font-bold rounded-md shadow-xs active:scale-95 transition-all duration-200 cursor-pointer text-[9px]">
        {t.webLlmDownloadBtn || "Download Model"}
      </button>
    </div>
  )
}

interface AdviceViewerProps {
  advice: string
}

const AdviceViewer: React.FC<AdviceViewerProps> = ({ advice }) => {
  return (
    <div className="prose prose-invert max-w-none text-slate-700 dark:text-slate-300 space-y-2 font-sans">
      {advice.split("\n").map((line, idx) => {
        if (line.startsWith("###")) {
          return (
            <h4
              key={idx}
              className="font-bold text-slate-800 dark:text-indigo-300 text-[11px] pt-1.5 border-b border-slate-200/50 dark:border-indigo-950/30 pb-0.5 mb-1.5 first:pt-0">
              {line.replace("###", "").trim()}
            </h4>
          )
        }
        if (line.startsWith("-")) {
          const cleanLine = line.substring(1).trim()
          const boldMatch = cleanLine.match(/^\*\*(.*?)\*\*(.*)$/)
          if (boldMatch) {
            return (
              <div key={idx} className="pl-3.5 relative mb-1">
                <span className="absolute left-1 top-1.5 w-1 h-1 rounded-full bg-indigo-500" />
                <strong className="text-slate-800 dark:text-slate-200">
                  {boldMatch[1]}
                </strong>
                <span>{boldMatch[2]}</span>
              </div>
            )
          }
          return (
            <div key={idx} className="pl-3.5 relative mb-1">
              <span className="absolute left-1 top-1.5 w-1 h-1 rounded-full bg-indigo-500" />
              <span>{cleanLine}</span>
            </div>
          )
        }
        return (
          <p key={idx} className="mb-1">
            {line}
          </p>
        )
      })}
    </div>
  )
}

interface AdviceSectionContentProps {
  isModelReady: boolean
  status: string
  progress: number
  startDownload: () => void
  loading: boolean
  error: string | null
  advice: string | null
  t: any
}

const AdviceSectionContent: React.FC<AdviceSectionContentProps> = ({
  isModelReady,
  status,
  progress,
  startDownload,
  loading,
  error,
  advice,
  t
}) => {
  if (!isModelReady) {
    return (
      <div className="flex flex-col items-center justify-center p-4 text-center rounded-lg bg-slate-100/50 dark:bg-slate-900/40 border border-slate-200/50 dark:border-indigo-950/30">
        <ModelStatusOverlay
          status={status}
          progress={progress}
          startDownload={startDownload}
          t={t}
        />
      </div>
    )
  }
  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 gap-2 text-slate-500 dark:text-slate-400">
        <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
        <span>
          {t.aiAdviceLoading || "Consulting the local AI cauldron..."}
        </span>
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

export const AiRecipeAdviceSection: React.FC<AiRecipeAdviceSectionProps> = ({
  cards,
  t
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const { advice, loading, error, isModelReady, status } =
    useAiRecipeAdvice(cards)
  const { progress, startDownload } = useWebLlm()

  if (cards.length < 2) return null

  return (
    <div
      className="border border-slate-200 dark:border-indigo-950 bg-slate-50/50 dark:bg-slate-950/20 rounded-xl overflow-hidden transition-all duration-300"
      id="ai-recipe-advice-section"
      data-testid="ai-recipe-advice-section">
      <button
        id="ai-recipe-advice-toggle"
        data-testid="ai-recipe-advice-toggle"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-2.5 text-[10px] font-bold tracking-wider uppercase text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-950/40 transition-colors duration-200 cursor-pointer"
        type="button">
        <span className="flex items-center gap-1.5 font-sans">
          <Sparkles className="w-3 h-3 text-indigo-500 animate-pulse" />
          {t.aiAdviceTitle || "🔮 AI Recipe Advice"}
        </span>
        {isOpen ? (
          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
        )}
      </button>

      {isOpen && (
        <div className="p-3 border-t border-slate-200 dark:border-indigo-950 bg-white/40 dark:bg-slate-950/40 text-[11px] leading-relaxed font-sans text-slate-700 dark:text-slate-300">
          <AdviceSectionContent
            isModelReady={isModelReady}
            status={status}
            progress={progress}
            startDownload={startDownload}
            loading={loading}
            error={error}
            advice={advice}
            t={t}
          />
        </div>
      )}
    </div>
  )
}
