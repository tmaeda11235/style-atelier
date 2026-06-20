/* eslint-disable max-lines */
import React from "react"

import { CardDetailView } from "../../features/card-detail/components/CardDetailView"
import { useEasyModeView } from "../../hooks/useEasyModeView"
import { getStyleCardById } from "../../lib/style-card-store"
import { SidePanelLayout } from "../templates/SidePanelLayout"
import { LibraryTab } from "./LibraryTab"
import { NonTargetSiteView } from "./NonTargetSiteView"
import { SettingsTab } from "./SettingsTab"
import { SimpleMintingView } from "./SimpleMintingView"
import { SimpleWorkbenchModal } from "./SimpleWorkbenchModal"

interface EasyModeViewProps {
  isEasyMode: boolean
  onToggleEasyMode: (enabled: boolean) => void
  isTargetSite: boolean
  onOpenMidjourney: () => void
}

/**
 * EasyModeView component - acts as a simplified user interface displaying only
 * the library and settings, optimized for basic operations.
 */
export function EasyModeView({
  isEasyMode,
  onToggleEasyMode,
  isTargetSite,
  onOpenMidjourney
}: EasyModeViewProps) {
  const state = useEasyModeView({ isEasyMode, onToggleEasyMode })

  React.useEffect(() => {
    const handleTabChange = (e: Event) => {
      const customEvent = e as CustomEvent<string>
      if (
        customEvent.detail === "settings" ||
        customEvent.detail === "library"
      ) {
        state.setActiveTab(customEvent.detail)
        state.minting.setMintingItem(null)
        state.minting.setVariationBase(null)
        state.setActiveDetailCard(null)
        state.setActiveSimpleWorkbenchCard(null)
      }
    }
    const handleOpenCardDetail = async (e: Event) => {
      const customEvent = e as CustomEvent<{ cardId: string }>
      if (customEvent.detail?.cardId) {
        const { getStyleCardById } = await import("../../lib/style-card-store")
        const card = await getStyleCardById(customEvent.detail.cardId)
        if (card) {
          state.setActiveTab("library")
          state.setActiveDetailCard(card)
        }
      }
    }

    window.addEventListener("change-easy-tab", handleTabChange)
    window.addEventListener("open-card-detail", handleOpenCardDetail)
    return () => {
      window.removeEventListener("change-easy-tab", handleTabChange)
      window.removeEventListener("open-card-detail", handleOpenCardDetail)
    }
  }, [state])
  return (
    <EasyModeLayoutWrapper
      state={state}
      isEasyMode={isEasyMode}
      isTargetSite={isTargetSite}
      onOpenMidjourney={onOpenMidjourney}
    />
  )
}

interface EasyModeLayoutWrapperProps {
  state: any
  isEasyMode: boolean
  isTargetSite: boolean
  onOpenMidjourney: () => void
}

function handleEasyModeTabChange(tab: any, state: any) {
  state.setActiveTab(tab)
  state.minting.setMintingItem(null)
  state.minting.setVariationBase(null)
  state.setActiveDetailCard(null)
  state.setActiveSimpleWorkbenchCard(null)
}

interface EasyModeChildrenProps {
  state: any
  isEasyMode: boolean
  isTargetSite: boolean
  onOpenMidjourney: () => void
}

function EasyModeChildren({
  state,
  isEasyMode,
  isTargetSite,
  onOpenMidjourney
}: EasyModeChildrenProps) {
  const handleReplayTutorial = () => {
    localStorage.removeItem("style-atelier-onboarding-seen")
    localStorage.setItem("style-atelier-onboarding-replay-trigger", "true")
    state.handleToggleEasyMode(false)
  }

  return (
    <>
      <EasyModeMintingWrapper minting={state.minting} />
      <EasyModeDetailWrapper
        activeDetailCard={state.activeDetailCard}
        setActiveDetailCard={state.setActiveDetailCard}
        handleInjectPrompt={state.handleInjectPrompt}
        handleSaveCardDetails={state.handleSaveCardDetails}
        handleDeleteCard={state.handleDeleteCard}
        setAlertType={state.setAlertType}
        addLog={state.addLog}
      />
      <EasyModeWorkbenchWrapper
        activeSimpleWorkbenchCard={state.activeSimpleWorkbenchCard}
        setActiveSimpleWorkbenchCard={state.setActiveSimpleWorkbenchCard}
        addLog={state.addLog}
        setAlertType={state.setAlertType}
      />
      <EasyModeTabContent
        activeTab={state.activeTab}
        isTargetSite={isTargetSite}
        onOpenMidjourney={onOpenMidjourney}
        addLog={state.addLog}
        setAlertType={state.setAlertType}
        setActiveDetailCard={state.setActiveDetailCard}
        setActiveSimpleWorkbenchCard={state.setActiveSimpleWorkbenchCard}
        isEasyMode={isEasyMode}
        handleToggleEasyMode={state.handleToggleEasyMode}
        setActiveTab={state.setActiveTab}
        handleResetDb={state.handleResetDb}
        onReplayTutorial={handleReplayTutorial}
      />
    </>
  )
}

function EasyModeLayoutWrapper({
  state,
  isEasyMode,
  isTargetSite,
  onOpenMidjourney
}: EasyModeLayoutWrapperProps) {
  return (
    <div
      onDragOver={state.handleDragOver}
      onDragLeave={state.handleDragLeave}
      onDrop={state.handleDrop}
      className="h-full relative overflow-hidden">
      <SidePanelLayout
        activeTab={state.activeTab}
        onTabChange={(tab) => handleEasyModeTabChange(tab, state)}
        isDragging={state.isDragging}
        isDraggingFile={state.isDraggingFile}
        isImporting={state.isImporting}
        logs={state.logs}
        onClearLogs={state.handleClearLogs}
        onResetDb={state.handleResetDb}
        droppedItem={state.droppedItem}
        onClearDroppedItem={state.clearDroppedItem}
        alertType={state.alertType}
        onRetryConnection={state.handleRetryConnection}
        onDismissAlert={state.handleDismissAlert}
        onOpenGuide={() => {}}
        isEasyMode={isEasyMode}>
        <EasyModeChildren
          state={state}
          isEasyMode={isEasyMode}
          isTargetSite={isTargetSite}
          onOpenMidjourney={onOpenMidjourney}
        />
      </SidePanelLayout>
    </div>
  )
}

interface EasyModeMintingWrapperProps {
  minting: any
}

function EasyModeMintingWrapper({ minting }: EasyModeMintingWrapperProps) {
  if (!minting.mintingItem && !minting.variationBase) return null
  return (
    <SimpleMintingView
      mintingItem={minting.mintingItem}
      editedSegments={minting.editedSegments}
      setEditedSegments={minting.setEditedSegments}
      onCancelMinting={() => {
        minting.setMintingItem(null)
        minting.setVariationBase(null)
      }}
      onSaveMintedCard={minting.handleSaveMintedCard}
      suggestedKeywords={minting.suggestedKeywords}
      selectedKeywords={minting.selectedKeywords}
      setSelectedKeywords={minting.setSelectedKeywords}
      customName={minting.customName}
      setCustomName={minting.setCustomName}
      selectedCategory={minting.selectedCategory}
      setSelectedCategory={minting.setSelectedCategory}
    />
  )
}

interface EasyModeDetailWrapperProps {
  activeDetailCard: any
  setActiveDetailCard: (card: any | null) => void
  handleInjectPrompt: any
  handleSaveCardDetails: any
  handleDeleteCard: any
  setAlertType: (type: any) => void
  addLog: (log: string) => void
}

function EasyModeDetailWrapper({
  activeDetailCard,
  setActiveDetailCard,
  handleInjectPrompt,
  handleSaveCardDetails,
  handleDeleteCard,
  setAlertType,
  addLog
}: EasyModeDetailWrapperProps) {
  if (!activeDetailCard) return null
  return (
    <CardDetailView
      card={activeDetailCard}
      onClose={() => setActiveDetailCard(null)}
      onInject={handleInjectPrompt}
      onSave={handleSaveCardDetails}
      setAlertType={setAlertType}
      onCardSelect={async (cardId) => {
        const targetCard = await getStyleCardById(cardId)
        if (targetCard) {
          setActiveDetailCard(targetCard)
        } else {
          addLog("Warning: Selected parent card could not be found.")
        }
      }}
      onDelete={handleDeleteCard}
    />
  )
}

interface EasyModeWorkbenchWrapperProps {
  activeSimpleWorkbenchCard: any
  setActiveSimpleWorkbenchCard: (card: any | null) => void
  addLog: (log: string) => void
  setAlertType: (type: any) => void
}

function EasyModeWorkbenchWrapper({
  activeSimpleWorkbenchCard,
  setActiveSimpleWorkbenchCard,
  addLog,
  setAlertType
}: EasyModeWorkbenchWrapperProps) {
  if (!activeSimpleWorkbenchCard) return null
  return (
    <SimpleWorkbenchModal
      card={activeSimpleWorkbenchCard}
      onClose={() => setActiveSimpleWorkbenchCard(null)}
      addLog={addLog}
      setAlertType={setAlertType}
    />
  )
}

interface EasyModeTabContentProps {
  activeTab: string
  isTargetSite: boolean
  onOpenMidjourney: () => void
  addLog: (log: string) => void
  setAlertType: (type: any) => void
  setActiveDetailCard: (card: any | null) => void
  setActiveSimpleWorkbenchCard: (card: any | null) => void
  isEasyMode: boolean
  handleToggleEasyMode: (enabled: boolean) => void
  setActiveTab: (tab: any) => void
  handleResetDb: () => void
  onReplayTutorial?: () => void
}

function EasyModeTabContent({
  activeTab,
  isTargetSite,
  onOpenMidjourney,
  addLog,
  setAlertType,
  setActiveDetailCard,
  setActiveSimpleWorkbenchCard,
  isEasyMode,
  handleToggleEasyMode,
  setActiveTab,
  handleResetDb,
  onReplayTutorial
}: EasyModeTabContentProps) {
  if (activeTab === "library") {
    if (!isTargetSite) {
      return (
        <NonTargetSiteView onOpenMidjourney={onOpenMidjourney} isEmbedded />
      )
    }
    return (
      <LibraryTab
        addLog={addLog}
        setAlertType={setAlertType}
        onOpenDetailCard={setActiveDetailCard}
        onNavigateToWorkbench={() => {}} // Workbench navigation is disabled in Easy Mode
        isEasyMode={isEasyMode}
        onOpenSimpleWorkbench={setActiveSimpleWorkbenchCard}
      />
    )
  }
  if (activeTab === "settings") {
    return (
      <SettingsTab
        addLog={addLog}
        onResetDb={handleResetDb}
        isEasyMode={isEasyMode}
        onToggleEasyMode={handleToggleEasyMode}
        onNavigateToLibrary={() => setActiveTab("library")}
        onReplayTutorial={onReplayTutorial}
      />
    )
  }
  return null
}
