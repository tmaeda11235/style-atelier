import { useState } from "react"
import { db } from "../lib/db"
import { SidePanelLayout } from "../components/templates/SidePanelLayout"
import { HistoryTab } from "../components/organisms/HistoryTab"
import { LibraryTab } from "../components/organisms/LibraryTab"
import { Workbench } from "../components/organisms/Workbench"
import { MintingView } from "../components/organisms/MintingView"
import { CardDetailView } from "../components/organisms/CardDetailView"
import { HandBar } from "../components/organisms/HandBar"
import { useTabs } from "../hooks/useTabs"
import { useDragAndDrop } from "../hooks/useDragAndDrop"
import { useMinting } from "../hooks/useMinting"
import { WorkbenchProvider } from "../contexts/WorkbenchContext"
import type { AlertType } from "../components/molecules/ConnectionAlert"
import type { StyleCard } from "../lib/db-schema"

function SidePanelPage() {
  const [logs, setLogs] = useState<string[]>([])
  // New global state for connection alerts
  const [alertType, setAlertType] = useState<AlertType>(null)
  const [activeDetailCard, setActiveDetailCard] = useState<StyleCard | null>(null)

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
      }
    } catch (err: any) {
      console.error("Injection failed:", err);
      setAlertType("disconnected");
      addLog(`Note: ${err.message || "Could not send to tab"}`)
    }
  }

  const { activeTab, setActiveTab } = useTabs()
  const { isDragging, droppedItem, handleDragOver, handleDragLeave, handleDrop } = useDragAndDrop(addLog)
  const {
    mintingItem,
    variationBase,
    editedSegments,
    setEditedSegments,
    isSrefHidden,
    setIsSrefHidden,
    isPHidden,
    setIsPHidden,
    handleStartMinting,
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
  } = useMinting(addLog, setActiveTab)

  const handleResetDb = async () => {
    if (window.confirm("Are you sure you want to delete ALL DATA?")) {
      await Promise.all([db.historyItems.clear(), db.styleCards.clear(), db.userSettings.clear()])
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
          logs={logs}
          onClearLogs={handleClearLogs}
          onResetDb={handleResetDb}
          droppedItem={droppedItem}
          alertType={alertType}
          onRetryConnection={handleRetryConnection}
          onDismissAlert={handleDismissAlert}
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

          {/* HandBar is now inside SidePanelLayout children to ensure it stays in same context */}
          <HandBar />
        </SidePanelLayout>
      </WorkbenchProvider>
    </div>
  )
}

export default SidePanelPage