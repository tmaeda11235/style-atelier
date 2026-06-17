import { db } from "../lib/db"
import { useDragAndDrop } from "./useDragAndDrop"

export function useEasyModeDragAndDrop(
  addLog: (log: string) => void,
  setActiveTab: (tab: "library" | "settings") => void,
  handleStartMinting: (item: any) => void
) {
  const {
    isDragging,
    isDraggingFile,
    isImporting,
    droppedItem,
    clearDroppedItem,
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
        const existingCard = await db.getCardByJobId(result.id)
        if (!existingCard) {
          handleStartMinting(result)
        }
      }
    }
  }

  return {
    isDragging,
    isDraggingFile,
    isImporting,
    droppedItem,
    clearDroppedItem,
    handleDragOver,
    handleDragLeave,
    handleDrop
  }
}
