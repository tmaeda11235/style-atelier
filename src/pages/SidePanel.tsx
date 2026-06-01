import React, { useState, useEffect } from "react"
import { db } from "../lib/db"
import { SidePanelLayout } from "../components/templates/SidePanelLayout"
import { HistoryTab } from "../components/organisms/HistoryTab"
import { LibraryTab } from "../components/organisms/LibraryTab"
import { Workbench } from "../components/organisms/Workbench"
import { MintingView } from "../components/organisms/MintingView"
import { CardDetailView } from "../components/organisms/CardDetailView"
import { HandBar } from "../components/organisms/HandBar"
import { InteractiveTutorial } from "../components/organisms/InteractiveTutorial"
import { useTabs } from "../hooks/useTabs"
import { SettingsTab } from "../components/organisms/SettingsTab"
import { useDragAndDrop } from "../hooks/useDragAndDrop"
import { useMinting } from "../hooks/useMinting"
import { useActiveTabUrl } from "../hooks/useActiveTabUrl"
import { NonTargetSiteView } from "../components/organisms/NonTargetSiteView"
import { WorkbenchProvider } from "../contexts/WorkbenchContext"
import { TutorialProvider, useTutorial } from "../contexts/TutorialContext"
import type { AlertType } from "../components/molecules/ConnectionAlert"
import type { StyleCard } from "../lib/db-schema"

/**
 * First-launch welcome dialog (non-interactive) triggering the tutorial.
 */
function WelcomeDialog({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200">
      <div className="w-full max-w-xs bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden text-slate-200 animate-in zoom-in-95 duration-200">
        <div className="p-5 flex flex-col items-center gap-3">
          <div className="w-14 h-14 rounded-full bg-blue-600/10 border border-blue-500/30 flex items-center justify-center">
            <span className="text-3xl">🎴</span>
          </div>
          <h2 className="text-base font-black text-white text-center">Style Atelierへようこそ！</h2>
          <p className="text-xs text-slate-400 leading-relaxed text-center">
            実際に操作しながら使い方を覚える<br />インタラクティブなガイドを開始しますか？
          </p>
        </div>
        <div className="px-5 pb-5 flex flex-col gap-2">
          <button
            onClick={onStart}
            className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-bold rounded-xl shadow transition-all"
          >
            ガイドを開始する
          </button>
          <button
            onClick={onSkip}
            className="w-full py-2 text-slate-500 hover:text-slate-300 text-xs font-semibold transition-all"
          >
            スキップ（あとでGuideボタンから開始できます）
          </button>
        </div>
      </div>
    </div>
  )
}

function SidePanelInner() {
  const { isTargetSite, isLoading } = useActiveTabUrl()
  const { startTutorial, advanceIfStep } = useTutorial()
  const [logs, setLogs] = useState<string[]>([])
  // New global state for connection alerts
  const [alertType, setAlertType] = useState<AlertType>(null)
  const [activeDetailCard, setActiveDetailCard] = useState<StyleCard | null>(null)
  const [showWelcome, setShowWelcome] = useState(false)

  useEffect(() => {
    const seen = localStorage.getItem("style-atelier-onboarding-seen")
    if (!seen) {
      setShowWelcome(true)
    }
  }, [])

  const handleStartTutorial = () => {
    localStorage.setItem("style-atelier-onboarding-seen", "true")
    setShowWelcome(false)
    setActiveTab("history")
    startTutorial()
  }

  const handleSkipTutorial = () => {
    localStorage.setItem("style-atelier-onboarding-seen", "true")
    setShowWelcome(false)
  }

  const addLog = (log: string) => {
    setLogs((prev) => [log, ...prev].slice(0, 20))
  }

  const handleSaveCardDetails = async (updatedCard: StyleCard) => {
    try {
      await db.styleCards.put(updatedCard)
      addLog(`StyleCard "${updatedCard.name}" updated successfully!`)
      setActiveDetailCard(null)
    } catch (err) {
      console.error("Failed to save style card updates:", err)
      addLog("Error: Failed to save style card updates.")
    }
  }

  const handleInjectPrompt = async (prompt: string) => {
    setAlertType(null);
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const activeTab = tabs[0];
      if (!activeTab?.id) {
        throw new Error("No active tab found");
      }
      const response = await chrome.tabs.sendMessage(activeTab.id, {
        type: "INJECT_PROMPT",
        prompt: prompt,
      });
      if (response && response.status === "error") {
        if (response.message && response.message.includes("Could not find chat input")) {
          setAlertType("no_input");
        } else {
          setAlertType("disconnected");
        }
      } else {
        addLog(`Sent prompt: ${prompt.substring(0, 30)}...`)
        if (activeDetailCard) {
          db.styleCards.update(activeDetailCard.id, {
            usageCount: (activeDetailCard.usageCount || 0) + 1
          }).catch(err => console.error("Failed to update usage count on details inject:", err));
        }
      }
    } catch (err: any) {
      console.error("Injection failed:", err);
      setAlertType("disconnected");
      addLog(`Note: ${err.message || "Could not send to tab"}`)
    }
  }

  const { activeTab, setActiveTab } = useTabs()
  const { 
    isDragging, 
    isDraggingFile, 
    isImporting, 
    droppedItem, 
    handleDragOver, 
    handleDragLeave, 
    handleDrop: rawHandleDrop 
  } = useDragAndDrop(addLog)
 
  const handleDrop = async (e: React.DragEvent) => {
    const result = (await rawHandleDrop(e)) as any
    if (result) {
      if (result.isImport) {
        setActiveTab("library")
      } else {
        advanceIfStep("drop-history")
      }
    }
  }

  const {
    mintingItem,
    variationBase,
    editedSegments,
    setEditedSegments,
    isSrefHidden,
    setIsSrefHidden,
    isPHidden,
    setIsPHidden,
    handleStartMinting: rawStartMinting,
    handleStartVariationMinting,
    handleSaveMintedCard,
    setMintingItem,
    setVariationBase,
    selectedRarity,
    setSelectedRarity,
    suggestedKeywords,
    selectedKeywords,
    setSelectedKeywords,
    customName,
    setCustomName,
    selectedCategory,
    setSelectedCategory,
    customTags,
    setCustomTags,
    detectedDominantColor,
    detectedAccentColor,
    detectedColorTags,
  } = useMinting(addLog, setActiveTab)

  const handleStartMinting = (historyItem: any) => {
    rawStartMinting(historyItem)
    advanceIfStep("mint-button")
  }

  const handleResetDb = async () => {
    if (window.confirm("Are you sure you want to delete ALL DATA?")) {
      await Promise.all([db.historyItems.clear(), db.styleCards.clear(), db.userSettings.clear(), db.categories.clear()])
      localStorage.removeItem("style-atelier-onboarding-seen")
      addLog("All data cleared.")
    }
  }

  const handleClearLogs = () => {
    setLogs([])
  }

  // Global retry handler - usually just reload
  const handleRetryConnection = () => {
    chrome.tabs.reload();
    setAlertType(null);
  }

  const handleDismissAlert = () => {
    setAlertType(null);
  }

  const handleOpenMidjourney = () => {
    if (typeof chrome !== "undefined" && chrome.tabs && chrome.tabs.update) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.update(tabs[0].id, { url: "https://www.midjourney.com/imagine" })
        }
      })
    } else {
      window.open("https://www.midjourney.com/imagine", "_blank")
    }
  }

  if (isLoading) {
    return <div className="w-full h-screen bg-slate-950" />
  }

  if (!isTargetSite) {
    return (
      <NonTargetSiteView
        onOpenMidjourney={handleOpenMidjourney}
      />
    )
  }

  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className="h-full relative overflow-hidden">
      <WorkbenchProvider>
        <SidePanelLayout
          activeTab={activeTab}
          onTabChange={(tab) => {
            setActiveTab(tab)
            setMintingItem(null)
            setVariationBase(null)
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
          onOpenGuide={() => {
            setActiveTab("history")
            startTutorial()
          }}
        >
          {(mintingItem || variationBase) && (
            <MintingView
              mintingItem={mintingItem}
              editedSegments={editedSegments}
              setEditedSegments={setEditedSegments}
              isSrefHidden={isSrefHidden}
              setIsSrefHidden={setIsSrefHidden}
              isPHidden={isPHidden}
              setIsPHidden={setIsPHidden}
              onCancelMinting={() => {
                setMintingItem(null)
                setVariationBase(null)
              }}
              onSaveMintedCard={handleSaveMintedCard}
              selectedRarity={selectedRarity}
              setSelectedRarity={setSelectedRarity}
              suggestedKeywords={suggestedKeywords}
              selectedKeywords={selectedKeywords}
              setSelectedKeywords={setSelectedKeywords}
              customName={customName}
              setCustomName={setCustomName}
              selectedCategory={selectedCategory}
              setSelectedCategory={setSelectedCategory}
              customTags={customTags}
              setCustomTags={setCustomTags}
              detectedDominantColor={detectedDominantColor}
              detectedAccentColor={detectedAccentColor}
              detectedColorTags={detectedColorTags}
            />
          )}
          {activeDetailCard && (
            <CardDetailView
              card={activeDetailCard}
              onClose={() => setActiveDetailCard(null)}
              onInject={handleInjectPrompt}
              onSave={handleSaveCardDetails}
              setAlertType={setAlertType}
            />
          )}
          {activeTab === "history" && <HistoryTab onStartMinting={handleStartMinting} />}
          {activeTab === "library" && <LibraryTab addLog={addLog} setAlertType={setAlertType} onOpenDetailCard={setActiveDetailCard} />}
          {activeTab === "workbench" && <Workbench onStartVariationMinting={handleStartVariationMinting} addLog={addLog} setAlertType={setAlertType} />}
          {activeTab === "settings" && <SettingsTab addLog={addLog} onResetDb={handleResetDb} />}

          {/* HandBar is now inside SidePanelLayout children to ensure it stays in same context */}
          <HandBar />
        </SidePanelLayout>
      </WorkbenchProvider>

      {/* Welcome dialog on first launch */}
      {showWelcome && (
        <WelcomeDialog onStart={handleStartTutorial} onSkip={handleSkipTutorial} />
      )}

      {/* Interactive tutorial overlay */}
      <InteractiveTutorial />
    </div>
  )
}

/**
 * Root page component – wraps everything in TutorialProvider so useTutorial
 * is available both in SidePanelInner and InteractiveTutorial.
 */
function SidePanelPage() {
  return (
    <TutorialProvider>
      <SidePanelInner />
    </TutorialProvider>
  )
}

export default SidePanelPage