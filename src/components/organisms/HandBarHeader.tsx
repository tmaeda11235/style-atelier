import { ChevronDown, ChevronUp, Layers, Trash2 } from "lucide-react"
import React from "react"

import { Button } from "../atoms/Button"
import { HelpTooltip } from "../atoms/HelpTooltip"

export interface HandBarHeaderProps {
  pinnedCardsCount: number
  isCollapsed: boolean
  toggleCollapse: () => void
  expertFeatures: { stack?: boolean }
  isMergeEnabled: boolean
  onMergeClick: () => void
  onClearClick: () => void
  t: any
}

function HandBarHeaderTitle({
  pinnedCardsCount,
  isCollapsed,
  toggleCollapse
}: {
  pinnedCardsCount: number
  isCollapsed: boolean
  toggleCollapse: () => void
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        Workbench ({pinnedCardsCount})
      </span>
      <Button
        variant="ghost"
        size="xs"
        onClick={(e) => {
          e.stopPropagation()
          toggleCollapse()
        }}
        className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-0.5 h-auto"
        title={isCollapsed ? "展開" : "最小化"}
        data-testid="handbar-toggle-collapse-btn">
        {isCollapsed ? (
          <ChevronUp className="w-3.5 h-3.5" />
        ) : (
          <ChevronDown className="w-3.5 h-3.5" />
        )}
      </Button>
    </div>
  )
}

function HandBarHeaderActions({
  expertFeatures,
  isMergeEnabled,
  onMergeClick,
  onClearClick,
  t
}: {
  expertFeatures: { stack?: boolean }
  isMergeEnabled: boolean
  onMergeClick: () => void
  onClearClick: () => void
  t: any
}) {
  return (
    <div className="flex gap-2">
      {isMergeEnabled && expertFeatures.stack && (
        <div className="flex items-center gap-1">
          <Button
            variant="secondary"
            size="xs"
            onClick={onMergeClick}
            className="flex items-center justify-center bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 font-bold p-1"
            data-testid="handbar-merge-btn"
            title={t.mergeStack.merge}>
            <Layers className="w-3.5 h-3.5" />
          </Button>
          <HelpTooltip content={t.helpTooltips.stack} position="top-right" />
        </div>
      )}
      <Button
        variant="ghost"
        size="xs"
        onClick={onClearClick}
        className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1 flex items-center justify-center"
        data-testid="handbar-clear-all-btn"
        title={t.workbench.clearAll}>
        <Trash2 className="w-3.5 h-3.5" />
      </Button>
    </div>
  )
}

export function HandBarHeader({
  pinnedCardsCount,
  isCollapsed,
  toggleCollapse,
  expertFeatures,
  isMergeEnabled,
  onMergeClick,
  onClearClick,
  t
}: HandBarHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-2 px-1">
      <HandBarHeaderTitle
        pinnedCardsCount={pinnedCardsCount}
        isCollapsed={isCollapsed}
        toggleCollapse={toggleCollapse}
      />
      {!isCollapsed && (
        <HandBarHeaderActions
          expertFeatures={expertFeatures}
          isMergeEnabled={isMergeEnabled}
          onMergeClick={onMergeClick}
          onClearClick={onClearClick}
          t={t}
        />
      )}
    </div>
  )
}
