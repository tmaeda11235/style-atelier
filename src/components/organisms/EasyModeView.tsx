import React from "react"
import { useEasyModeView } from "../../hooks/useEasyModeView"
import { SidePanelLayout } from "../templates/SidePanelLayout"
import { LibraryTab } from "./LibraryTab"
import { SettingsTab } from "./SettingsTab"
import { SimpleMintingView } from "./SimpleMintingView"
import { CardDetailView } from "./CardDetailView"
import { db } from "../../lib/db"

interface EasyModeViewProps {
  isEasyMode: boolean
  onToggleEasyMode: (enabled: boolean) => void
}

/**
 * EasyModeView component - acts as a simplified user interface displaying only
 * the library and settings, optimized for basic operations.
 */
export function EasyModeView({ isEasyMode, onToggleEasyMode }: EasyModeViewProps) {
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
  } = useEasyModeView({ isEasyMode, onToggleEasyMode })

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-full relative overflow-hidden"
    >
      <SidePanelLayout
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab as any)
          minting.setMintingItem(null)
          minting.setVariationBase(null)
          setActiveDetailCard(null)
        }}
        isDragging={isDragging}
        isDraggingFile={isDraggingFile}
        isImporting={isImporting}
        logs={logs}
        onClearLogs={handleClearLogs}
        onResetDb={handleResetDb}
        droppedItem={droppedItem}
        alertType={alertType}
        onRetryConnection={handleRetryConnection}
        onDismissAlert={handleDismissAlert}
        onOpenGuide={() => {}} // Guide is not supported in Easy Mode
        isEasyMode={isEasyMode}
      >
        {(minting.mintingItem || minting.variationBase) && (
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
        )}
        {activeDetailCard && (
          <CardDetailView
            card={activeDetailCard}
            onClose={() => setActiveDetailCard(null)}
            onInject={handleInjectPrompt}
            onSave={handleSaveCardDetails}
            setAlertType={setAlertType}
            onCardSelect={async (cardId) => {
              const targetCard = await db.styleCards.get(cardId)
              if (targetCard) {
                setActiveDetailCard(targetCard)
              } else {
                addLog("Warning: Selected parent card could not be found.")
              }
            }}
            onDelete={handleDeleteCard}
          />
        )}

        {activeTab === "library" && (
          <LibraryTab
            addLog={addLog}
            setAlertType={setAlertType}
            onOpenDetailCard={setActiveDetailCard}
            onNavigateToWorkbench={() => {}} // Workbench navigation is disabled in Easy Mode
          />
        )}
        {activeTab === "settings" && (
          <SettingsTab
            addLog={addLog}
            onResetDb={handleResetDb}
            isEasyMode={isEasyMode}
            onToggleEasyMode={handleToggleEasyMode}
          />
        )}
      </SidePanelLayout>
    </div>
  )
}
