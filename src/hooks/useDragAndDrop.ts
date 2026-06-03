import { useState } from "react"
import { db } from "../lib/db"
import type { HistoryItem, StyleCard } from "../lib/db-schema"
import iconUrl from "url:../../assets/icon.png"

export function useDragAndDrop(addLog: (msg: string) => void) {
  const [isDragging, setIsDragging] = useState(false)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const [isImporting, setIsImporting] = useState(false)
  const [droppedItem, setDroppedItem] = useState<{ id: string; name?: string; isMerged?: boolean } | null>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    const types = Array.from(e.dataTransfer?.types || [])
    if (types.includes("Files") && !types.includes("application/json")) {
      setIsDraggingFile(true)
    } else {
      setIsDragging(true)
    }
  }

  const handleDragLeave = () => {
    setIsDragging(false)
    setIsDraggingFile(false)
  }

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    setIsDraggingFile(false)
    addLog("Drop event received.")

    const types = Array.from(e.dataTransfer?.types || [])
    const hasJsonData = types.includes("application/json")

    // 1. Check if files are dropped (QR Card Image Import) - only if it is not a local JSON drag
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && !hasJsonData) {
      const files = Array.from(e.dataTransfer.files)
      const imageFile = files.find((f) => f.type.startsWith("image/"))
      if (!imageFile) {
        addLog("No valid image file dropped.")
        return null
      }

      setIsImporting(true)
      addLog("Processing dropped card image...")

      try {
        const { readQRCodeFromImage, decompressCardData } = await import("../lib/qr-utils")
        const payload = await readQRCodeFromImage(imageFile)
        
        if (!payload) {
          addLog("No QR code found in the image.")
          setIsImporting(false)
          return null
        }

        const partialCard = decompressCardData(payload)
        if (!partialCard.name || !partialCard.promptSegments) {
          addLog("Invalid card data in QR code.")
          setIsImporting(false)
          return null
        }

        const cdnUrl = partialCard.images?.[0]
        let finalThumbnailData = "assets/icon.png"
        
        if (cdnUrl) {
          addLog("Fetching clean artwork from Midjourney...")
          try {
            const response = await fetch(cdnUrl)
            if (response.ok) {
              const blob = await response.blob()
              finalThumbnailData = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader()
                reader.onloadend = () => resolve(reader.result as string)
                reader.onerror = reject
                reader.readAsDataURL(blob)
              })
              addLog("Artwork downloaded successfully.")
            } else {
              addLog("Could not fetch artwork from Midjourney CDN. Using placeholder.")
            }
          } catch (fetchErr) {
            console.error("CORS or network error fetching artwork:", fetchErr)
            addLog("Failed to download artwork. Using placeholder.")
          }
        } else {
          addLog("No artwork URL found in card. Using placeholder.")
        }

        const existingCard = partialCard.id ? await db.styleCards.get(partialCard.id) : null
        
        const importedCard: StyleCard = {
          id: partialCard.id || crypto.randomUUID(),
          name: partialCard.name,
          createdAt: existingCard?.createdAt || Date.now(),
          updatedAt: Date.now(),
          promptSegments: partialCard.promptSegments,
          parameters: partialCard.parameters || {},
          masking: partialCard.masking || { isSrefHidden: false, isPHidden: false },
          tier: partialCard.tier || "Common",
          isFavorite: existingCard?.isFavorite || false,
          usageCount: existingCard?.usageCount || 0,
          tags: partialCard.tags || [],
          category: partialCard.category,
          dominantColor: partialCard.dominantColor || "#1e293b",
          accentColor: partialCard.accentColor || "#3b82f6",
          thumbnailData: finalThumbnailData,
          frameId: partialCard.frameId || "default",
          genealogy: partialCard.genealogy || { generation: 1, parentIds: [] },
          images: cdnUrl ? [cdnUrl] : [],
          selectedThumbnails: cdnUrl ? [cdnUrl] : [],
          associatedJobIds: [],
        }

        await db.styleCards.put(importedCard)
        addLog(`Imported card "${importedCard.name}" successfully!`)
        return { id: importedCard.id, isImport: true }
      } catch (err) {
        console.error("Failed to import card:", err)
        addLog("Error occurred while importing card.")
      } finally {
        setIsImporting(false)
      }
      return null
    }

    // 2. Existing JSON Dropping Logic (Midjourney History Drag & Drop)
    const jsonData = e.dataTransfer.getData("application/json")
    if (!jsonData) {
      addLog("No JSON data in drop event.")
      return null
    }
    try {
      const item = JSON.parse(jsonData) as HistoryItem
      if (item && item.id && item.imageUrl) {
        // Query to check if a style card with this jobId already exists
        let existingCard = await db.styleCards.where("jobId").equals(item.id).first()
        if (!existingCard) {
          existingCard = await db.styleCards.where("associatedJobIds").equals(item.id).first()
        }
        
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
    isDraggingFile,
    isImporting,
    droppedItem,
    handleDragOver,
    handleDragLeave,
    handleDrop,
  }
}