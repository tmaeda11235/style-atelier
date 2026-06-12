import React from "react"

import { CauldronGraphic } from "../molecules/CauldronGraphic"

interface WorkbenchEmptyStateProps {
  t: any
  isDragOver?: boolean
  setIsDragOver?: (drag: boolean) => void
  onDrop?: (e: React.DragEvent) => void
}

interface StepProps {
  num: number
  title: string
  desc: string
  colorClass: string
}

const Step: React.FC<StepProps> = ({ num, title, desc, colorClass }) => (
  <div className="flex gap-3">
    <div
      className={`flex-shrink-0 w-5 h-5 rounded-full ${colorClass} flex items-center justify-center text-[10px] font-bold`}>
      {num}
    </div>
    <div>
      <h5 className="text-xs font-bold text-slate-700 dark:text-slate-300">
        {title}
      </h5>
      <p className="text-[10px] text-slate-500 dark:text-slate-400">{desc}</p>
    </div>
  </div>
)

const GuideSteps: React.FC<{ t: any }> = ({ t }) => (
  <div className="w-full max-w-xs space-y-4 text-left border-t border-slate-200/60 dark:border-slate-800/60 pt-6">
    <h4 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2">
      {t.guideTitle}
    </h4>
    <Step
      num={1}
      title={t.step1Title}
      desc={t.step1Desc}
      colorClass="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 text-blue-600 dark:text-blue-400"
    />
    <Step
      num={2}
      title={t.step2Title}
      desc={t.step2Desc}
      colorClass="bg-purple-50 dark:bg-purple-950/30 border border-purple-200 dark:border-purple-900 text-purple-600 dark:text-purple-400"
    />
    <Step
      num={3}
      title={t.step3Title}
      desc={t.step3Desc}
      colorClass="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-900 text-indigo-600 dark:text-indigo-400"
    />
  </div>
)

export const WorkbenchEmptyState: React.FC<WorkbenchEmptyStateProps> = ({
  t,
  isDragOver = false,
  setIsDragOver,
  onDrop
}) => {
  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setIsDragOver?.(true)
      }}
      onDragLeave={() => setIsDragOver?.(false)}
      onDrop={(e) => {
        e.preventDefault()
        setIsDragOver?.(false)
        onDrop?.(e)
      }}
      className={`flex flex-col items-center justify-center py-8 px-6 rounded-xl border border-dashed backdrop-blur-sm transition-all duration-500 ease-out animate-in fade-in duration-300 ${
        isDragOver
          ? "bg-blue-50/20 dark:bg-blue-950/20 border-blue-400 dark:border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.25)] scale-[1.01]"
          : "bg-slate-50/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800"
      }`}
      data-testid="workbench-empty-state">
      <div className="mb-4">
        <CauldronGraphic isDragOver={isDragOver} />
      </div>
      <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
        {t.emptyTitle}
      </h3>
      <p className="text-xs text-slate-500 dark:text-slate-400 max-w-[280px] leading-relaxed mb-6 text-center">
        {t.emptyDesc}
      </p>
      <GuideSteps t={t} />
    </div>
  )
}
