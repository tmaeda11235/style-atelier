import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useDbError } from "../../hooks/useDbError"
import type { Tab } from "../../hooks/useTabs"
import { ConnectionAlert, type AlertType } from "../molecules/ConnectionAlert"
import { GlobalDownloadIndicator } from "../molecules/GlobalDownloadIndicator"
import { DbErrorOverlay } from "../organisms/DbErrorOverlay"
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
  const dbError = useDbError()

  if (dbError) {
    return <DbErrorOverlay error={dbError} />
  }

  return (
    <div
      className={`w-full h-screen flex flex-col relative overflow-hidden font-sans text-slate-800 dark:text-slate-100 transition-colors ${
        props.isDraggingFile
          ? "bg-blue-50 dark:bg-blue-950"
          : props.isDragging
            ? "bg-indigo-50 dark:bg-indigo-950"
            : "bg-slate-50 dark:bg-slate-950"
      }`}>
      <ConnectionAlert
        type={props.alertType || null}
        onRetry={props.onRetryConnection}
        onDismiss={props.onDismissAlert}
      />

      <SidePanelHeader
        activeTab={props.activeTab}
        onTabChange={props.onTabChange}
        isEasyMode={props.isEasyMode}
        onOpenGuide={props.onOpenGuide}
        t={t}
      />

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-48 relative">
        <SidePanelOverlays
          isDraggingFile={props.isDraggingFile}
          isDragging={props.isDragging}
          isImporting={props.isImporting}
          droppedItem={props.droppedItem}
          onClearDroppedItem={props.onClearDroppedItem}
          t={t}
        />
        {props.children}
        <SidePanelDebugLogs
          logs={props.logs}
          onClearLogs={props.onClearLogs}
          onResetDb={props.onResetDb}
        />
      </div>
      <GlobalDownloadIndicator onTabChange={props.onTabChange} />
    </div>
  )
}
