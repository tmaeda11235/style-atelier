import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useExpertModeView } from "../../hooks/useExpertModeView"
import { getStyleCardById } from "../../lib/style-card-store"
import { SidePanelLayout } from "../templates/SidePanelLayout"
import { CardDetailView } from "./CardDetailView"
import { HandBar } from "./HandBar"
import { HistoryTab } from "./HistoryTab"
import { InteractiveTutorial } from "./InteractiveTutorial"
import { LibraryTab } from "./LibraryTab"
import { MintingView } from "./MintingView"
import { SettingsTab } from "./SettingsTab"
import { TipsBar } from "./TipsBar"
import { Workbench } from "./Workbench"

interface ExpertModeViewProps {
  isEasyMode: boolean
  onToggleEasyMode: (enabled: boolean) => void
}

function WelcomeDialog({
  onStart,
  onSkip
}: {
  onStart: () => void
  onSkip: () => void
}) {
  const { t } = useLanguage()
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200">
      <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-200 animate-in zoom-in-95 duration-200">
        <div className="p-5 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-blue-600/10 border border-blue-500/30 flex items-center justify-center">
            <span className="text-3xl">🎴</span>
          </div>
          <h2 className="text-base font-black text-white text-center">
            {t.welcome.title}
          </h2>
          <p className="text-xs text-slate-400 leading-relaxed text-center whitespace-pre-line">
            {t.welcome.description}
          </p>
        </div>
        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            onClick={onStart}
            id="welcome-start-btn"
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow transition-all">
            {t.welcome.start}
          </button>
          <button
            onClick={onSkip}
            id="welcome-skip-btn"
            className="w-full py-2 text-slate-500 hover:text-slate-300 text-xs font-semibold transition-all">
            {t.welcome.skip}
          </button>
        </div>
      </div>
    </div>
  )
}

/**
 * ExpertModeView component - acts as a fully featured user interface displaying all
 * tabs (history, library, workbench, settings) and supporting tutorials, history minting, and mixing.
 */
export function ExpertModeView({
  isEasyMode,
  onToggleEasyMode
}: ExpertModeViewProps) {
  const {
    activeTab,
    setActiveTab,
    logs,
    alertType,
    setAlertType,
    activeDetailCard,
    setActiveDetailCard,
    showWelcome,
    isDragging,
    isDraggingFile,
    isImporting,
    droppedItem,
    handleDragOver,
    handleDragLeave,
    handleDrop,
    minting,
    addLog,
    handleStartMinting,
    handleSaveCardDetails,
    handleDeleteCard,
    handleInjectPrompt,
    handleResetDb,
    handleClearLogs,
    handleRetryConnection,
    handleDismissAlert,
    handleOpenGuide,
    handleStartTutorial,
    handleSkipTutorial,
    handleToggleEasyMode
  } = useExpertModeView({ isEasyMode, onToggleEasyMode })

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className="h-full relative overflow-hidden">
      <SidePanelLayout
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab)
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
        onOpenGuide={handleOpenGuide}
        isEasyMode={isEasyMode}>
        {(minting.mintingItem || minting.variationBase) && (
          <MintingView
            mintingItem={minting.mintingItem}
            editedSegments={minting.editedSegments}
            setEditedSegments={minting.setEditedSegments}
            isSrefHidden={minting.isSrefHidden}
            setIsSrefHidden={minting.setIsSrefHidden}
            isPHidden={minting.isPHidden}
            setIsPHidden={minting.setIsPHidden}
            onCancelMinting={() => {
              minting.setMintingItem(null)
              minting.setVariationBase(null)
            }}
            onSaveMintedCard={minting.handleSaveMintedCard}
            selectedRarity={minting.selectedRarity}
            setSelectedRarity={minting.setSelectedRarity}
            suggestedKeywords={minting.suggestedKeywords}
            selectedKeywords={minting.selectedKeywords}
            setSelectedKeywords={minting.setSelectedKeywords}
            customName={minting.customName}
            setCustomName={minting.setCustomName}
            selectedCategory={minting.selectedCategory}
            setSelectedCategory={minting.setSelectedCategory}
            customTags={minting.customTags}
            setCustomTags={minting.setCustomTags}
            detectedDominantColor={minting.detectedDominantColor}
            detectedAccentColor={minting.detectedAccentColor}
            detectedColorTags={minting.detectedColorTags}
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
              const targetCard = await getStyleCardById(cardId)
              if (targetCard) {
                setActiveDetailCard(targetCard)
              } else {
                addLog("Warning: Selected parent card could not be found.")
              }
            }}
            onDelete={handleDeleteCard}
          />
        )}

        {activeTab === "history" && (
          <HistoryTab onStartMinting={handleStartMinting} />
        )}
        {activeTab === "library" && (
          <LibraryTab
            addLog={addLog}
            setAlertType={setAlertType}
            onOpenDetailCard={setActiveDetailCard}
            onNavigateToWorkbench={() => setActiveTab("workbench")}
          />
        )}
        {activeTab === "workbench" && (
          <Workbench
            onStartVariationMinting={minting.handleStartVariationMinting}
            addLog={addLog}
            setAlertType={setAlertType}
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

        <HandBar
          onNavigateToWorkbench={() => setActiveTab("workbench")}
          onOpenDetailCard={setActiveDetailCard}
        />
        <TipsBar />
      </SidePanelLayout>

      {showWelcome && (
        <WelcomeDialog
          onStart={handleStartTutorial}
          onSkip={handleSkipTutorial}
        />
      )}

      <InteractiveTutorial />
    </div>
  )
}
