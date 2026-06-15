import React from "react"

import { useEasyModeView } from "../../hooks/useEasyModeView"
import { getStyleCardById } from "../../lib/style-card-store"
import { SidePanelLayout } from "../templates/SidePanelLayout"
import { CardDetailView } from "./CardDetailView"
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
  const {
    activeTab,
    setActiveTab,
    logs,
    alertType,
    setAlertType,
    activeDetailCard,
    setActiveDetailCard,
    isDragging,
    isDraggingFile,
    isImporting,
    droppedItem,
    clearDroppedItem,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    minting,
    addLog,
    handleSaveCardDetails,
    handleDeleteCard,
    handleInjectPrompt,
    handleResetDb,
    handleClearLogs,
    handleRetryConnection,
    handleDismissAlert,
    handleToggleEasyMode,
    activeSimpleWorkbenchCard,
    setActiveSimpleWorkbenchCard
  } = useEasyModeView({ isEasyMode, onToggleEasyMode })

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-full relative overflow-hidden">
      <SidePanelLayout
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab as any)
          minting.setMintingItem(null)
          minting.setVariationBase(null)
          setActiveDetailCard(null)
          setActiveSimpleWorkbenchCard(null)
        }}
        isDragging={isDragging}
        isDraggingFile={isDraggingFile}
        isImporting={isImporting}
        logs={logs}
        onClearLogs={handleClearLogs}
        onResetDb={handleResetDb}
        droppedItem={droppedItem}
        onClearDroppedItem={clearDroppedItem}
        alertType={alertType}
        onRetryConnection={handleRetryConnection}
        onDismissAlert={handleDismissAlert}
        onOpenGuide={() => {}}
        isEasyMode={isEasyMode}>
        <EasyModeMintingWrapper minting={minting} />
        <EasyModeDetailWrapper
          activeDetailCard={activeDetailCard}
          setActiveDetailCard={setActiveDetailCard}
          handleInjectPrompt={handleInjectPrompt}
          handleSaveCardDetails={handleSaveCardDetails}
          handleDeleteCard={handleDeleteCard}
          setAlertType={setAlertType}
          addLog={addLog}
        />
        <EasyModeWorkbenchWrapper
          activeSimpleWorkbenchCard={activeSimpleWorkbenchCard}
          setActiveSimpleWorkbenchCard={setActiveSimpleWorkbenchCard}
          addLog={addLog}
          setAlertType={setAlertType}
        />
        <EasyModeTabContent
          activeTab={activeTab}
          isTargetSite={isTargetSite}
          onOpenMidjourney={onOpenMidjourney}
          addLog={addLog}
          setAlertType={setAlertType}
          setActiveDetailCard={setActiveDetailCard}
          setActiveSimpleWorkbenchCard={setActiveSimpleWorkbenchCard}
          isEasyMode={isEasyMode}
          handleToggleEasyMode={handleToggleEasyMode}
          setActiveTab={setActiveTab}
          handleResetDb={handleResetDb}
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
  handleResetDb
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
      />
    )
  }
  return null
}
