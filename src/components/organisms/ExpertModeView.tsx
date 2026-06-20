/* eslint-disable max-lines-per-function */
import React from "react"

import { InteractiveTutorial } from "../../features/tutorial/components/InteractiveTutorial"
import { useExpertModeView } from "../../hooks/useExpertModeView"
import { SidePanelLayout } from "../templates/SidePanelLayout"
import { ExpertModeOverlayManager } from "./ExpertModeView/ExpertModeOverlayManager"
import { ExpertModeTabContainer } from "./ExpertModeView/ExpertModeTabContainer"
import { WelcomeDialog } from "./ExpertModeView/WelcomeDialog"
import { HandBar } from "./HandBar"
import { TipsBar } from "./TipsBar"

interface ExpertModeViewProps {
  isEasyMode: boolean
  onToggleEasyMode: (enabled: boolean) => void
  isTargetSite: boolean
  onOpenMidjourney: () => void
}

/**
 * ExpertModeView component - acts as a fully featured user interface displaying all
 * tabs (history, library, workbench, settings) and supporting tutorials, history minting, and mixing.
 */
export function ExpertModeView({
  isEasyMode,
  onToggleEasyMode,
  isTargetSite,
  onOpenMidjourney
}: ExpertModeViewProps) {
  const expertView = useExpertModeView({ isEasyMode, onToggleEasyMode })

  React.useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>
      if (customEvent.detail) {
        expertView.setActiveTab(customEvent.detail as any)
        expertView.setActiveDetailCard(null)
      }
    }
    const handleOpenCardDetail = async (e: Event) => {
      const customEvent = e as CustomEvent<{ cardId: string }>
      if (customEvent.detail?.cardId) {
        const { getStyleCardById } = await import("../../lib/style-card-store")
        const card = await getStyleCardById(customEvent.detail.cardId)
        if (card) {
          expertView.setActiveTab("library")
          expertView.setActiveDetailCard(card)
        }
      }
    }
    window.addEventListener("change-expert-tab", handleTabChange)
    window.addEventListener("open-card-detail", handleOpenCardDetail)
    return () => {
      window.removeEventListener("change-expert-tab", handleTabChange)
      window.removeEventListener("open-card-detail", handleOpenCardDetail)
    }
  }, [expertView])

  return (
    <div
      onDragOver={expertView.handleDragOver}
      onDragLeave={expertView.handleDragLeave}
      onDrop={expertView.handleDrop}
      className="h-full relative overflow-hidden">
      <SidePanelLayout {...expertView.sidePanelLayoutProps}>
        <ExpertModeOverlayManager expertView={expertView} />

        <ExpertModeTabContainer
          expertView={expertView}
          isTargetSite={isTargetSite}
          onOpenMidjourney={onOpenMidjourney}
          isEasyMode={isEasyMode}
        />

        <HandBar
          onNavigateToWorkbench={() => expertView.setActiveTab("workbench")}
          onOpenDetailCard={expertView.setActiveDetailCard}
        />
        <TipsBar />
      </SidePanelLayout>

      {expertView.showWelcome && (
        <WelcomeDialog
          onStart={expertView.handleStartTutorial}
          onSkip={expertView.handleSkipTutorial}
        />
      )}

      <InteractiveTutorial />
    </div>
  )
}
