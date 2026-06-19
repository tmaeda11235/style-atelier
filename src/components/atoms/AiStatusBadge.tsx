import { type VariantProps } from "class-variance-authority"
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
import { cn, extractLayoutClasses } from "../../lib/utils"
import {
  aiStatusBadgeTooltipVariants,
  aiStatusBadgeVariants
} from "./AiStatusBadge.variants"

export interface AiStatusBadgeProps
  extends
    React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof aiStatusBadgeVariants> {
  status?: string
}

interface BadgeConfig {
  badgeText: string
  statusType: "ready" | "downloading" | "fallbackWebGpu" | "fallbackModel"
  Icon: LucideIcon
  isSpinning: boolean
  tooltipText: string
}

function getReadyConfig(isJa: boolean): BadgeConfig {
  return {
    badgeText: isJa ? "AI: 利用可能" : "AI: Available",
    statusType: "ready",
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
    statusType: "downloading",
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
      statusType: "fallbackWebGpu",
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
    statusType: "fallbackModel",
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
  className,
  ...props
}: AiStatusBadgeProps) {
  const { language } = useLanguage()
  const { hasWebGpu } = useWebGpuCheck()
  const { status: webLlmStatus, progress } = useWebLlm()

  const activeStatus = propStatus || webLlmStatus
  const isJa = language?.startsWith("ja")
  const config = getBadgeConfig(activeStatus, progress, hasWebGpu, isJa)

  const layoutClassName = extractLayoutClasses(className)

  return (
    <div
      className={cn("group relative inline-block select-none", layoutClassName)}
      data-testid="ai-status-badge"
      {...props}>
      <div
        className={cn(aiStatusBadgeVariants({ statusType: config.statusType }))}
        data-testid="ai-status-badge-container">
        <config.Icon
          className={cn("w-3.5 h-3.5", config.isSpinning ? "animate-spin" : "")}
        />
        <span>{config.badgeText}</span>
      </div>
      <div
        className={cn(aiStatusBadgeTooltipVariants())}
        data-testid="ai-status-badge-tooltip">
        {config.tooltipText}
      </div>
    </div>
  )
}
