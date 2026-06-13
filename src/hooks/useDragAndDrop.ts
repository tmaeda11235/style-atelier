import { useState } from "react"

import { useLanguage } from "../contexts/LanguageContext"
import { dispatchDrop, type DroppedItem } from "./dragAndDropHandlers"

export function useDragAndDrop(addLog: (msg: string) => void) {
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [droppedItem, setDroppedItem] = useState<DroppedItem | null>(null)

  const { t: i18n } = useLanguage()
  const t = i18n.dragAndDrop

  const triggerNotification = (item: DroppedItem | null) => {
    setDroppedItem(item)
    if (item && !item.isError) setTimeout(() => setDroppedItem(null), 3000)
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    const types = Array.from(e.dataTransfer?.types || [])
    const isFile =
      types.includes("Files") && !types.includes("application/json")
    if (isFile) setIsDraggingFile(true)
    else setIsDragging(true)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setIsDraggingFile(false)
    addLog("Drop event received.")
    return dispatchDrop(e, {
      addLog,
      triggerNotification,
      setIsImporting,
      setDroppedItem,
      t
    })
  }

  return {
    isDragging,
    isDraggingFile,
    isImporting,
    droppedItem,
    clearDroppedItem: () => setDroppedItem(null),
    handleDragOver,
    handleDragLeave: () => {
      setIsDragging(false)
      setIsDraggingFile(false)
    },
    handleDrop
  }
}
