import { AlertTriangle } from "lucide-react"
import React, { useEffect, useState } from "react"

interface GDriveSyncStrategyDialogProps {
  isOpen: boolean
  onConfirm: (strategy: "merge" | "local-overwrite" | "cloud-overwrite") => void
  onCancel: () => void
  t: any
}

type StrategyType = "merge" | "local-overwrite" | "cloud-overwrite"

interface StrategyOptionProps {
  id: string
  strategyValue: StrategyType
  currentStrategy: StrategyType
  onChange: (strategy: StrategyType) => void
  label: string
  desc: string
}

function StrategyOption({
  id,
  strategyValue,
  currentStrategy,
  onChange,
  label,
  desc
}: StrategyOptionProps) {
  const isSelected = currentStrategy === strategyValue
  return (
    <div
      onClick={() => onChange(strategyValue)}
      className={`p-3 rounded-xl border text-left cursor-pointer transition-all ${
        isSelected
          ? "bg-slate-800/80 border-blue-500 text-white shadow-[0_0_12px_rgba(59,130,246,0.1)]"
          : "bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300"
      }`}>
      <div className="flex items-center gap-2">
        <input
          type="radio"
          id={id}
          name="sync-strategy"
          checked={isSelected}
          onChange={() => onChange(strategyValue)}
          className="accent-blue-500 cursor-pointer"
        />
        <label htmlFor={id} className="text-xs font-black cursor-pointer">
          {label}
        </label>
      </div>
      <p className="text-[10px] text-slate-400 mt-1 pl-5 leading-normal">
        {desc}
      </p>
    </div>
  )
}

interface StrategyContentProps {
  t: any
  strategy: StrategyType
  setStrategy: (strategy: StrategyType) => void
}

function StrategyContent({ t, strategy, setStrategy }: StrategyContentProps) {
  return (
    <div className="p-6 flex flex-col gap-4">
      <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
        <div className="w-10 h-10 rounded-full flex items-center justify-center border bg-amber-500/10 border-amber-500/30 text-amber-500 shrink-0">
          <AlertTriangle className="w-5 h-5" />
        </div>
        <div>
          <h2 className="text-sm font-black text-white tracking-wide">
            {t.syncWarningTitle}
          </h2>
          <p className="text-[11px] text-slate-400 mt-0.5">
            {t.syncWarningMessage}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <label className="text-xs font-bold text-slate-300 block">
          {t.strategyLabel}
        </label>

        <div className="space-y-2.5">
          <StrategyOption
            id="strategy-merge"
            strategyValue="merge"
            currentStrategy={strategy}
            onChange={setStrategy}
            label={t.strategyMergeLabel}
            desc={t.strategyMergeDesc}
          />
          <StrategyOption
            id="strategy-local-overwrite"
            strategyValue="local-overwrite"
            currentStrategy={strategy}
            onChange={setStrategy}
            label={t.strategyLocalOverwriteLabel}
            desc={t.strategyLocalOverwriteDesc}
          />
          <StrategyOption
            id="strategy-cloud-overwrite"
            strategyValue="cloud-overwrite"
            currentStrategy={strategy}
            onChange={setStrategy}
            label={t.strategyCloudOverwriteLabel}
            desc={t.strategyCloudOverwriteDesc}
          />
        </div>
      </div>
    </div>
  )
}

export function GDriveSyncStrategyDialog({
  isOpen,
  onConfirm,
  onCancel,
  t
}: GDriveSyncStrategyDialogProps) {
  const [strategy, setStrategy] = useState<StrategyType>("merge")

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel()
    }
    if (isOpen) window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [isOpen, onCancel])

  if (!isOpen) return null

  return (
    <div
      id="sync-strategy-dialog-backdrop"
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/20 dark:bg-slate-950/80 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200"
      onClick={onCancel}>
      <div
        id="sync-strategy-dialog-container"
        className="w-full max-w-md bg-slate-900 border border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden text-slate-200 animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true">
        <StrategyContent t={t} strategy={strategy} setStrategy={setStrategy} />

        <div className="px-6 pb-6 flex flex-col gap-2 border-t border-slate-800 pt-4 bg-slate-950/20">
          <button
            onClick={() => onConfirm(strategy)}
            id="sync-strategy-dialog-ok-btn"
            className="w-full py-2.5 text-white text-xs font-bold rounded-xl shadow transition-all cursor-pointer bg-blue-600 hover:bg-blue-500 active:bg-blue-700 focus:ring-2 focus:ring-blue-500/50">
            {t.syncConfirmBtn}
          </button>
          <button
            onClick={onCancel}
            id="sync-strategy-dialog-cancel-btn"
            className="w-full py-2 text-slate-500 hover:text-slate-300 text-[11px] font-semibold transition-all cursor-pointer focus:outline-none">
            {t.cancelBtn}
          </button>
        </div>
      </div>
    </div>
  )
}
