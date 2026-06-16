import {
  AlertCircle,
  HelpCircle,
  Loader2,
  Sparkles,
  type LucideIcon
} from "lucide-react"
import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useWebGpuCheck } from "../../hooks/useWebGpuCheck"
import { useWebLlm } from "../../hooks/useWebLlm"
import { cn } from "../../lib/utils"

interface AiStatusBadgeProps {
  status?: string
  className?: string
}

interface BadgeConfig {
  badgeText: string
  badgeClass: string
  Icon: LucideIcon
  isSpinning: boolean
  tooltipText: string
}

function getReadyConfig(isJa: boolean): BadgeConfig {
  return {
    badgeText: isJa ? "AI: 利用可能" : "AI: Available",
    badgeClass:
      "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-400",
    Icon: Sparkles,
    isSpinning: false,
    tooltipText: isJa
      ? "ローカルAIモデルが読み込まれ、すべてのAI機能がオンデバイスで高速に動作しています。"
      : "The local AI model is loaded. All AI features run fast and secure on-device."
  }
}

function getDownloadingConfig(progress: number, isJa: boolean): BadgeConfig {
  const percent = progress > 0 ? ` (${Math.round(progress)}%)` : ""
  return {
    badgeText: isJa ? `AIダウンロード中${percent}` : `Downloading AI${percent}`,
    badgeClass:
      "bg-blue-50 dark:bg-blue-950/30 border-blue-200 dark:border-blue-900/40 text-blue-700 dark:text-blue-400",
    Icon: Loader2,
    isSpinning: true,
    tooltipText: isJa
      ? "AIモデルデータをダウンロードしています。完了するまで軽量フォールバックモードで動作します。"
      : "Downloading AI model files. Features will run in lightweight fallback mode until finished."
  }
}

function getFallbackConfig(
  hasWebGpu: boolean | null,
  isJa: boolean
): BadgeConfig {
  if (hasWebGpu === false) {
    return {
      badgeText: isJa
        ? "AI: 軽量モード (WebGPU非対応)"
        : "AI: Light Mode (WebGPU Unsupported)",
      badgeClass:
        "bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/40 text-amber-700 dark:text-amber-400 animate-pulse",
      Icon: AlertCircle,
      isSpinning: false,
      tooltipText: isJa
        ? "お使いのブラウザまたはデバイスはWebGPUをサポートしていません。自動的に正規表現とルールベースの軽量フォールバックモードで動作しています。"
        : "WebGPU is not supported by your browser or device. Operating automatically in lightweight regex/rule-based fallback mode."
    }
  }

  return {
    badgeText: isJa
      ? "AI: 軽量モード (モデル未ロード)"
      : "AI: Light Mode (Model Not Loaded)",
    badgeClass:
      "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400",
    Icon: HelpCircle,
    isSpinning: false,
    tooltipText: isJa
      ? "ローカルAIモデルがダウンロードされていません。設定タブからダウンロードできます。現在は軽量フォールバックモードで動作しています。"
      : "The local AI model is not downloaded. You can download it in the Settings tab. Currently operating in lightweight fallback mode."
  }
}

function getBadgeConfig(
  status: string,
  progress: number,
  hasWebGpu: boolean | null,
  isJa: boolean
): BadgeConfig {
  const isReady = status === "ready" || status === "engine-ready"
  const isPreparing = [
    "downloading",
    "checking",
    "verifying",
    "retrying",
    "engine-initializing"
  ].includes(status)

  if (isReady) {
    return getReadyConfig(isJa)
  }

  if (isPreparing) {
    return getDownloadingConfig(progress, isJa)
  }

  return getFallbackConfig(hasWebGpu, isJa)
}

export function AiStatusBadge({
  status: propStatus,
  className
}: AiStatusBadgeProps) {
  const { language } = useLanguage()
  const { hasWebGpu } = useWebGpuCheck()
  const { status: webLlmStatus, progress } = useWebLlm()

  const activeStatus = propStatus || webLlmStatus
  const isJa = language?.startsWith("ja")
  const config = getBadgeConfig(activeStatus, progress, hasWebGpu, isJa)

  return (
    <div
      className={cn("group relative inline-block select-none", className)}
      data-testid="ai-status-badge">
      <div
        className={cn(
          "flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-full border transition-all duration-200 cursor-help",
          config.badgeClass
        )}
        data-testid="ai-status-badge-container">
        <config.Icon
          className={cn("w-3.5 h-3.5", config.isSpinning ? "animate-spin" : "")}
        />
        <span>{config.badgeText}</span>
      </div>
      <div
        className="absolute hidden group-hover:block group-focus-within:block bg-slate-900 dark:bg-slate-950 text-white text-[10px] font-normal rounded-lg p-2.5 shadow-xl w-56 z-[9999] pointer-events-none leading-relaxed transition-all animate-in fade-in duration-150 bottom-full left-1/2 -translate-x-1/2 mb-2 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-slate-900 dark:after:border-t-slate-950"
        data-testid="ai-status-badge-tooltip">
        {config.tooltipText}
      </div>
    </div>
  )
}
