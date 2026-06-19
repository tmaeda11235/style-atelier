import React from "react"

import { useWebGpu } from "../../../hooks/useWebGpu"
import { WebGpuWarning } from "../../molecules/WebGpuWarning"

const formatEta = (seconds: number) => {
  if (seconds <= 0) return "--"
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return m > 0 ? `${m}m ${s}s` : `${s}s`
}

interface WebLlmProgressProps {
  progress: number
  speed: number
  eta: number
  t: Record<string, string>
}

const getProgressValueText = (
  progress: number,
  speed: number,
  eta: number,
  t: Record<string, string>
) => {
  const speedText = speed > 0 ? `${speed.toFixed(1)} MB/s` : ""
  const remainingText =
    eta > 0 ? `${t.webLlmRemaining || "Remaining"}: ${formatEta(eta)}` : ""
  return `${progress}%${speedText ? `, ${speedText}` : ""}${remainingText ? `, ${remainingText}` : ""}`
}

function ProgressBar({
  progress,
  valueText,
  label
}: {
  progress: number
  valueText: string
  label: string
}) {
  return (
    <div
      className="w-full bg-slate-200 dark:bg-slate-800 rounded-full h-2 overflow-hidden"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      aria-valuetext={valueText}>
      <div
        className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300 ease-out"
        style={{ width: `${progress}%` }}
      />
    </div>
  )
}

function ProgressMeta({
  progress,
  speed,
  eta,
  t
}: {
  progress: number
  speed: number
  eta: number
  t: Record<string, string>
}) {
  return (
    <div
      className="flex justify-between text-[10px] text-slate-400 dark:text-slate-500 font-mono"
      aria-live="polite"
      aria-atomic="true">
      <span>{progress}%</span>
      {speed > 0 && <span>{speed.toFixed(1)} MB/s</span>}
      {eta > 0 && (
        <span>
          {t.webLlmRemaining || "Remaining"}: {formatEta(eta)}
        </span>
      )}
      <span>1.0 GB total</span>
    </div>
  )
}

export function WebLlmProgress({
  progress,
  speed,
  eta,
  t
}: WebLlmProgressProps) {
  const { isSupported } = useWebGpu()
  const valueText = getProgressValueText(progress, speed, eta, t)

  return (
    <div className="space-y-1.5 animate-in fade-in duration-200">
      <ProgressBar
        progress={progress}
        valueText={valueText}
        label={t.webLlmStatusLabel || "Download Progress"}
      />
      <ProgressMeta progress={progress} speed={speed} eta={eta} t={t} />
      {isSupported === false && (
        <div className="mt-2 pt-1 border-t border-slate-100 dark:border-slate-800">
          <WebGpuWarning t={t} />
        </div>
      )}
    </div>
  )
}
