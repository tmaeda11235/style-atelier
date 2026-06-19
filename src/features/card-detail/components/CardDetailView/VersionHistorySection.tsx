import { History, RotateCcw } from "lucide-react"
import React from "react"

import { Button } from "~components/atoms/Button"
import type { CardVersion } from "~shared/lib/db-schema"

interface VersionHistorySectionProps {
  t: any
  expertFeatures: any
  versionHistory?: CardVersion[]
  triggerRollback: (version: CardVersion) => void
}

export function VersionHistorySection({
  t,
  expertFeatures,
  versionHistory,
  triggerRollback
}: VersionHistorySectionProps) {
  if (
    !expertFeatures.cardEditing ||
    !versionHistory ||
    versionHistory.length === 0
  ) {
    return null
  }

  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm space-y-3">
      <h3 className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-500">
        <History className="w-3.5 h-3.5" />
        {t.cardDetail.versionHistory}
      </h3>
      <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
        {versionHistory.map((version) => (
          <div
            key={version.id}
            className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/80 rounded-lg border border-slate-100 transition-colors text-xs">
            <div className="flex flex-col gap-0.5">
              <span className="font-semibold text-slate-700">
                {version.name}
              </span>
              <span className="text-[10px] text-slate-400">
                {new Date(version.timestamp).toLocaleString()}
              </span>
            </div>
            <Button
              variant="secondary"
              size="xs"
              onClick={() => triggerRollback(version)}
              className="flex items-center gap-1 text-[11px] px-2 py-1 border-slate-200 hover:border-slate-300 text-slate-600 bg-white">
              <RotateCcw className="w-3.5 h-3.5" />
              {t.cardDetail.rollback}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
