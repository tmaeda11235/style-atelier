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

interface BadgeConfig {
  badgeText: string
  badgeClass: string
  Icon: LucideIcon
  isSpinning: boolean
  tooltipText: string
}

function getReadyConfig(isJa: boolean): BadgeConfig {
  return {
    badgeText: isJa ? "AI準備完了" : "AI Ready",
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
        ? "AI軽量フォールバック動作中 (WebGPU非対応)"
        : "AI Fallback (WebGPU Unsupported)",
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
      ? "AI軽量フォールバック動作中 (モデル未ロード)"
      : "AI Fallback (Model Not Loaded)",
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
  if (status === "ready") {
    return getReadyConfig(isJa)
  }

  if (
    status === "checking" ||
    status === "downloading" ||
    status === "verifying"
  ) {
    return getDownloadingConfig(progress, isJa)
  }

  return getFallbackConfig(hasWebGpu, isJa)
}

export function AiStatusBadge() {
  const { language } = useLanguage()
  const { hasWebGpu } = useWebGpuCheck()
  const { status, progress } = useWebLlm()

  const isJa = language?.startsWith("ja")
  const { badgeText, badgeClass, Icon, isSpinning, tooltipText } =
    getBadgeConfig(status, progress, hasWebGpu, isJa)

  return (
    <div
      className={`group relative flex items-center gap-1.5 px-2 py-0.5 text-[10px] font-semibold rounded-full border transition-all duration-200 cursor-help ${badgeClass}`}
      title={tooltipText}>
      <Icon className={`w-3.5 h-3.5 ${isSpinning ? "animate-spin" : ""}`} />
      <span>{badgeText}</span>

      {/* Tooltip */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 p-2 bg-slate-900 text-white text-[9px] font-normal rounded-lg shadow-lg z-50 text-center leading-normal">
        {tooltipText}
        <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1 border-4 border-transparent border-t-slate-900"></div>
      </div>
    </div>
  )
}
