import { useState } from "react"
import { db } from "../lib/db"
import type { HistoryItem } from "../lib/db-schema"

export function useDragAndDrop(addLog: (msg: string) => void) {
  const [isDragging, setIsDragging] = useState(false)
  const [droppedItem, setDroppedItem] = useState<HistoryItem | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    addLog("Drop event received.")
    const jsonData = e.dataTransfer.getData("application/json")
    if (!jsonData) {
      addLog("No JSON data in drop event.")
      return
    }
    try {
      const item = JSON.parse(jsonData) as HistoryItem
      if (item && item.id && item.imageUrl) {
        await db.historyItems.put(item)
        addLog(`History item ${item.id} saved.`)
        setDroppedItem(item)
        setTimeout(() => setDroppedItem(null), 3000)
        return item
      } else {
        addLog("Invalid history item data.")
      }
    } catch (err) {
      console.error("Failed to handle drop:", err)
      if (err instanceof Error) {
        addLog(`Error handling drop event: ${err.message}`)
      }
    }
    return null
  }

  return {
    isDragging,
    droppedItem,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  }
}