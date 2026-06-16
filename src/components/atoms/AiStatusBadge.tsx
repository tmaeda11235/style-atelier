import React from "react"
import { useTranslation } from "react-i18next"

import { cn } from "../../lib/utils"

interface AiStatusBadgeProps {
  status: string
  className?: string
}

function getBadgeConfig(status: string, isJa: boolean) {
  const isReady = status === "ready" || status === "engine-ready"
  const isPreparing = [
    "downloading",
    "checking",
    "verifying",
    "retrying",
    "engine-initializing"
  ].includes(status)

  if (isReady) {
    return {
      dotClass: "bg-emerald-500 shadow-emerald-500/50 animate-pulse",
      bgClass:
        "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400",
      label: isJa ? "AI: 利用可能" : "AI: Available",
      tooltip: isJa
        ? "ローカルAIモデルが利用可能です。高速なセマンティック検索とレシピ提案が動作しています。"
        : "Local AI model is loaded. High-speed semantic search and recipe advice are active."
    }
  }

  if (isPreparing) {
    return {
      dotClass: "bg-amber-500 shadow-amber-500/50 animate-bounce",
      bgClass:
        "bg-amber-50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400",
      label: isJa ? "AI: 準備中" : "AI: Preparing",
      tooltip: isJa
        ? "ローカルAIモデルを準備または初期化しています。完了するまでお待ちください。"
        : "Preparing or initializing local AI model. Please wait until it finishes."
    }
  }

  return {
    dotClass: "bg-slate-400 dark:bg-slate-600 shadow-slate-400/50",
    bgClass:
      "bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400",
    label: isJa ? "AI: 軽量モード" : "AI: Light Mode",
    tooltip: isJa
      ? "WebGPU非対応、またはローカルAIモデルが未ロードのため、 FlexSearchによるキーワード検索と静的ルールによるレシピ提案で動作しています。"
      : "WebGPU is unsupported or local AI model is not loaded. Operating in Light Mode using FlexSearch keyword matching and static recipe advice."
  }
}

export function AiStatusBadge({ status, className }: AiStatusBadgeProps) {
  const { i18n } = useTranslation()
  const isJa = i18n.language?.startsWith("ja")
  const config = getBadgeConfig(status, isJa)

  return (
    <div className={cn("group relative inline-block select-none", className)}>
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-bold rounded-full border transition-all duration-200 cursor-help",
          config.bgClass
        )}
        data-testid="ai-status-badge-container">
        <span
          className={cn("w-1.5 h-1.5 rounded-full shadow-sm", config.dotClass)}
        />
        <span>{config.label}</span>
      </div>
      <div
        className="absolute hidden group-hover:block group-focus-within:block bg-slate-900 dark:bg-slate-950 text-white text-xs font-normal rounded-lg p-2.5 shadow-xl w-56 z-[9999] pointer-events-none leading-relaxed transition-all animate-in fade-in duration-150 bottom-full left-1/2 -translate-x-1/2 mb-2 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-slate-900 dark:after:border-t-slate-950"
        data-testid="ai-status-badge-tooltip">
        {config.tooltip}
      </div>
    </div>
  )
}
