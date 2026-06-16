import React from "react"

import { HistoryTab } from "../HistoryTab"
import { LibraryTab } from "../LibraryTab"
import { NonTargetSiteView } from "../NonTargetSiteView"
import { SettingsTab } from "../SettingsTab"
import { Workbench } from "../Workbench"

interface TabProps {
  expertView: any
  isTargetSite: boolean
  onOpenMidjourney: () => void
}

function HistoryTabWrapper({
  expertView,
  isTargetSite,
  onOpenMidjourney
}: TabProps) {
  if (!isTargetSite) {
    return <NonTargetSiteView onOpenMidjourney={onOpenMidjourney} isEmbedded />
  }
  return <HistoryTab onStartMinting={expertView.handleStartMinting} />
}

function LibraryTabWrapper({
  expertView,
  isTargetSite,
  onOpenMidjourney
}: TabProps) {
  if (!isTargetSite) {
    return <NonTargetSiteView onOpenMidjourney={onOpenMidjourney} isEmbedded />
  }
  return (
    <LibraryTab
      addLog={expertView.addLog}
      setAlertType={expertView.setAlertType}
      onOpenDetailCard={expertView.setActiveDetailCard}
      onNavigateToWorkbench={() => expertView.setActiveTab("workbench")}
      onSetActiveTab={expertView.setActiveTab}
    />
  )
}

function WorkbenchTabWrapper({
  expertView,
  isTargetSite,
  onOpenMidjourney
}: TabProps) {
  if (!isTargetSite) {
    return <NonTargetSiteView onOpenMidjourney={onOpenMidjourney} isEmbedded />
  }
  return (
    <Workbench
      onStartVariationMinting={expertView.minting.handleStartVariationMinting}
      addLog={expertView.addLog}
      setAlertType={expertView.setAlertType}
    />
  )
}

export function ExpertModeTabContainer({
  expertView,
  isTargetSite,
  onOpenMidjourney,
  isEasyMode
}: {
  expertView: any
  isTargetSite: boolean
  onOpenMidjourney: () => void
  isEasyMode: boolean
}) {
  const { activeTab } = expertView
  return (
    <>
      {activeTab === "history" && (
        <HistoryTabWrapper
          expertView={expertView}
          isTargetSite={isTargetSite}
          onOpenMidjourney={onOpenMidjourney}
        />
      )}
      {activeTab === "library" && (
        <LibraryTabWrapper
          expertView={expertView}
          isTargetSite={isTargetSite}
          onOpenMidjourney={onOpenMidjourney}
        />
      )}
      {activeTab === "workbench" && (
        <WorkbenchTabWrapper
          expertView={expertView}
          isTargetSite={isTargetSite}
          onOpenMidjourney={onOpenMidjourney}
        />
      )}
      {activeTab === "settings" && (
        <SettingsTab
          addLog={expertView.addLog}
          onResetDb={expertView.handleResetDb}
          isEasyMode={isEasyMode}
          onToggleEasyMode={expertView.handleToggleEasyMode}
          onNavigateToLibrary={() => expertView.setActiveTab("library")}
          onReplayTutorial={expertView.handleReplayTutorial}
        />
      )}
    </>
  )
}
