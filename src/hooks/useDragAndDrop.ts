import { useState } from "react"
import { db } from "../lib/db"
import type { HistoryItem } from "../lib/db-schema"

export function useDragAndDrop(addLog: (msg: string) => void) {
  const [isDragging, setIsDragging] = useState(false)
  const [droppedItem, setDroppedItem] = useState<{ id: string; name?: string; isMerged?: boolean } | null>(null)

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
      return null
    }
    try {
      const item = JSON.parse(jsonData) as HistoryItem
      if (item && item.id && item.imageUrl) {
        // Query to check if a style card with this jobId already exists
        const existingCard = await db.styleCards.where("jobId").equals(item.id).first()
        
        if (existingCard) {
          const currentImages = existingCard.images || []
          if (!currentImages.includes(item.imageUrl)) {
            const updatedImages = [...currentImages, item.imageUrl]
            await db.styleCards.update(existingCard.id, {
              images: updatedImages,
              updatedAt: Date.now()
            })
            addLog(`Image added to existing Style Card "${existingCard.name}".`)
          } else {
            addLog(`Image already associated with Style Card "${existingCard.name}".`)
          }
          
          setDroppedItem({ id: existingCard.id, name: existingCard.name, isMerged: true })
          setTimeout(() => setDroppedItem(null), 3000)
          return item
        } else {
          await db.historyItems.put(item)
          addLog(`History item ${item.id} saved.`)
          setDroppedItem({ id: item.id, isMerged: false })
          setTimeout(() => setDroppedItem(null), 3000)
          return item
        }
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