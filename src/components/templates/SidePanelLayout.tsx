import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import type { Tab } from "../../hooks/useTabs"
import { ConnectionAlert, type AlertType } from "../molecules/ConnectionAlert"
import { SidePanelDebugLogs } from "./SidePanelDebugLogs"
import { SidePanelHeader } from "./SidePanelHeader"
import { SidePanelOverlays } from "./SidePanelOverlays"

interface SidePanelLayoutProps {
  activeTab: Tab
  onTabChange: (tab: Tab) => void
  children: React.ReactNode
  isDragging: boolean
  logs: string[]
  onClearLogs: () => void
  onResetDb: () => void
  droppedItem: any
  onClearDroppedItem?: () => void
  alertType?: AlertType
  onRetryConnection?: () => void
  onDismissAlert?: () => void
  onOpenGuide: () => void
  isDraggingFile?: boolean
  isImporting?: boolean
  isEasyMode?: boolean
}

export function SidePanelLayout(props: SidePanelLayoutProps) {
  const { t } = useLanguage()
  const {
    activeTab,
    onTabChange,
    children,
    isDragging,
    logs,
    onClearLogs,
    onResetDb,
    droppedItem,
    onClearDroppedItem,
    alertType,
    onRetryConnection,
    onDismissAlert,
    onOpenGuide,
    isDraggingFile,
    isImporting,
    isEasyMode
  } = props

  return (
    <div
      className={`w-full h-screen flex flex-col font-sans text-slate-800 dark:text-slate-100 transition-colors ${
        isDraggingFile
          ? "bg-blue-50 dark:bg-blue-950"
          : isDragging
            ? "bg-indigo-50 dark:bg-indigo-950"
            : "bg-slate-50 dark:bg-slate-950"
      }`}>
      <ConnectionAlert
        type={alertType || null}
        onRetry={onRetryConnection}
        onDismiss={onDismissAlert}
      />

      <SidePanelHeader
        activeTab={activeTab}
        onTabChange={onTabChange}
        isEasyMode={isEasyMode}
        onOpenGuide={onOpenGuide}
        t={t}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-24 relative">
        <SidePanelOverlays
          isDraggingFile={isDraggingFile}
          isDragging={isDragging}
          isImporting={isImporting}
          droppedItem={droppedItem}
          onClearDroppedItem={onClearDroppedItem}
          t={t}
        />
        {children}
        <SidePanelDebugLogs
          logs={logs}
          onClearLogs={onClearLogs}
          onResetDb={onResetDb}
        />
      </div>
    </div>
  )
}
