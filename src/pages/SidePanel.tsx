import { useState } from "react"
import { db } from "../lib/db"
import { SidePanelLayout } from "../components/templates/SidePanelLayout"
import { HistoryTab } from "../components/organisms/HistoryTab"
import { LibraryTab } from "../components/organisms/LibraryTab"
import { DecksTab } from "../components/organisms/DecksTab"
import { MintingView } from "../components/organisms/MintingView"
import { useTabs } from "../hooks/useTabs"
import { useDragAndDrop } from "../hooks/useDragAndDrop"
import { useMinting } from "../hooks/useMinting"

function SidePanelPage() {
  const [logs, setLogs] = useState<string[]>([])
  const addLog = (msg: string) => setLogs((prev) => [msg, ...prev].slice(0, 20))

  const { activeTab, setActiveTab } = useTabs()
  const { isDragging, droppedItem, handleDragOver, handleDragLeave, handleDrop } = useDragAndDrop(addLog)
  const {
    mintingItem,
    editedSegments,
    setEditedSegments,
    isSrefHidden,
    setIsSrefHidden,
    isPHidden,
    setIsPHidden,
    handleStartMinting,
    handleSaveMintedCard,
    setMintingItem,
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
      await Promise.all([db.historyItems.clear(), db.styleCards.clear(), db.decks.clear(), db.userSettings.clear()])
      addLog("All data cleared.")
    }
  }

  const handleClearLogs = () => {
    setLogs([])
  }

  return (
    <div onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop} className="h-full">
      <SidePanelLayout
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab)
          setMintingItem(null)
        }}
        isDragging={isDragging}
        logs={logs}
        onClearLogs={handleClearLogs}
        onResetDb={handleResetDb}
        droppedItem={droppedItem}
      >
        {mintingItem && (
      <MintingView
        mintingItem={mintingItem}
        editedSegments={editedSegments}
        setEditedSegments={setEditedSegments}
        isSrefHidden={isSrefHidden}
        setIsSrefHidden={setIsSrefHidden}
        isPHidden={isPHidden}
        setIsPHidden={setIsPHidden}
        onCancelMinting={() => setMintingItem(null)}
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
        {activeTab === "history" && <HistoryTab onStartMinting={handleStartMinting} />}
        {activeTab === "library" && <LibraryTab addLog={addLog} />}
        {activeTab === "decks" && <DecksTab addLog={addLog} />}
      </SidePanelLayout>
    </div>
  )
}

export default SidePanelPage