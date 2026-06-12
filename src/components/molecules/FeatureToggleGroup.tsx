import React from "react"

interface FeatureToggleGroupProps {
  title: string
  children: React.ReactNode
}

export function FeatureToggleGroup({
  title,
  children
}: FeatureToggleGroupProps) {
  return (
    <div className="space-y-3">
      <h4 className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
        {title}
      </h4>
      <div className="space-y-3">{children}</div>
    </div>
  )
}
