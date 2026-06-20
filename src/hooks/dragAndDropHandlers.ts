import iconUrl from "url:../../assets/icon.png"

import { db } from "../lib/db"
import type { HistoryItem, StyleCard } from "../shared/lib/db-schema"

export interface DroppedItem {
  id?: string
  name?: string
  isMerged?: boolean
  isImport?: boolean
  isError?: boolean
  errorMessage?: string
  errorType?: "no_image" | "no_metadata_or_qr" | "invalid_data" | "generic"
}

export interface DragAndDropContext {
  addLog: (msg: string) => void
  triggerNotification: (item: DroppedItem | null) => void
  setIsImporting: (val: boolean) => void
  setDroppedItem: (val: DroppedItem | null) => void
  t: {
    noValidImage: string
    noQrCode: string
    invalidCardData: string
    importFailed: string
  }
}

// 1-1. QRコード画像からStyleCardのメタデータを復元する
export async function parseCardFromImage(
  imageFile: File,
  t: any,
  addLog: (msg: string) => void
): Promise<any> {
  const { readQRCodeFromImage, decompressCardData } =
    await import("../shared/lib/qr-utils")
  const payload = await readQRCodeFromImage(imageFile)
  if (!payload) {
    addLog("No QR code found in the image.")
    throw new Error(t.noQrCode)
  }
  const partialCard = decompressCardData(payload)
  if (!partialCard.name || !partialCard.promptSegments) {
    addLog("Invalid card data in QR code.")
    throw new Error(t.invalidCardData)
  }
  return partialCard
}

// 1-2. CDN URLから画像をダウンロードしBase64に変換する
export async function downloadArtwork(
  cdnUrl: string | undefined,
  addLog: (msg: string) => void
): Promise<string> {
  if (!cdnUrl) {
    addLog("No artwork URL found in card. Using placeholder.")
    return iconUrl
  }
  addLog("Fetching clean artwork from Midjourney...")
  try {
    const response = await fetch(cdnUrl)
    if (response.ok) {
      const blob = await response.blob()
      const thumbnail = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader()
        reader.onloadend = () => resolve(reader.result as string)
        reader.onerror = reject
        reader.readAsDataURL(blob)
      })
      addLog("Artwork downloaded successfully.")
      return thumbnail
    }
    addLog("Could not fetch artwork from Midjourney CDN. Using placeholder.")
  } catch (fetchErr) {
    console.error("CORS or network error fetching artwork:", fetchErr)
    addLog("Failed to download artwork. Using placeholder.")
  }
  return iconUrl
}

export function buildStyleCard(
  partialCard: any,
  existingCard: StyleCard | null,
  thumbnailData: string
): StyleCard {
  const cdnUrl = partialCard.images?.[0]
  return {
    id: partialCard.id || crypto.randomUUID(),
    name: partialCard.name,
    promptSegments: partialCard.promptSegments,
    parameters: partialCard.parameters,
    createdAt: existingCard?.createdAt || Date.now(),
    updatedAt: Date.now(),
    masking: existingCard?.masking || {
      isSrefHidden: false,
      isPHidden: false
    },
    tier: partialCard.tier || "Common",
    isFavorite: existingCard?.isFavorite || false,
    usageCount: existingCard?.usageCount || 0,
    tags: partialCard.tags || [],
    category: partialCard.category,
    dominantColor: partialCard.dominantColor || "#1e293b",
    accentColor: partialCard.accentColor || "#3b82f6",
    thumbnailData,
    frameId: partialCard.frameId || "default",
    genealogy: partialCard.genealogy || { generation: 1, parentIds: [] },
    images: cdnUrl ? [cdnUrl] : [],
    selectedThumbnails: cdnUrl ? [cdnUrl] : [],
    associatedJobIds: []
  }
}

// 1-3. インポートしたStyleCardをDBに保存し通知するヘルパー
async function saveImportedCard(
  partialCard: any,
  finalThumbnailData: string,
  ctx: DragAndDropContext
) {
  const { addLog, triggerNotification } = ctx
  const existingCard = partialCard.id ? await db.getCard(partialCard.id) : null
  const importedCard = buildStyleCard(
    partialCard,
    existingCard,
    finalThumbnailData
  )

  await db.putCard(importedCard)
  addLog(`Imported card "${importedCard.name}" successfully!`)
  triggerNotification({
    id: importedCard.id,
    name: importedCard.name,
    isImport: true
  })
  return { id: importedCard.id, isImport: true }
}

// 1. QRコード画像ファイルのドロップ処理
export async function handleCardImageDrop(
  files: File[],
  ctx: DragAndDropContext
): Promise<{ id: string; isImport: boolean } | null> {
  const { addLog, triggerNotification, setIsImporting, t } = ctx
  const imageFile = files.find((f) => f.type.startsWith("image/"))
  if (!imageFile) {
    addLog("No valid image file dropped.")
    triggerNotification({
      isError: true,
      errorMessage: t.noValidImage,
      errorType: "no_image"
    })
    return null
  }

  setIsImporting(true)
  addLog("Processing dropped card image...")

  try {
    const partialCard = await parseCardFromImage(imageFile, t, addLog)
    const cdnUrl = partialCard.images?.[0]
    const finalThumbnailData = await downloadArtwork(cdnUrl, addLog)
    return await saveImportedCard(partialCard, finalThumbnailData, ctx)
  } catch (err: any) {
    console.error("Failed to import card:", err)
    addLog("Error occurred while importing card.")
    const isExpectedMsg =
      err.message === t.noQrCode || err.message === t.invalidCardData

    let errorType: "no_metadata_or_qr" | "invalid_data" | "generic" = "generic"
    if (err.message === t.noQrCode) {
      errorType = "no_metadata_or_qr"
    } else if (err.message === t.invalidCardData) {
      errorType = "invalid_data"
    }

    triggerNotification({
      isError: true,
      errorMessage: isExpectedMsg
        ? err.message
        : `${t.importFailed}${err.message || err}`,
      errorType
    })
  } finally {
    setIsImporting(false)
  }
  return null
}

// 2-1. 既存StyleCardへのマージ処理
export async function mergeImageToCard(
  existingCard: StyleCard,
  imageUrl: string,
  addLog: (msg: string) => void,
  setDroppedItem: (val: DroppedItem | null) => void
) {
  const currentImages = existingCard.images || []
  if (!currentImages.includes(imageUrl)) {
    const updatedImages = [...currentImages, imageUrl]
    await db.updateCard(existingCard.id, {
      images: updatedImages,
      updatedAt: Date.now()
    })
    addLog(`Image added to existing Style Card "${existingCard.name}".`)
  } else {
    addLog(`Image already associated with Style Card "${existingCard.name}".`)
  }

  setDroppedItem({
    id: existingCard.id,
    name: existingCard.name,
    isMerged: true
  })
  setTimeout(() => setDroppedItem(null), 3000)
}

// 2-2. 履歴アイテムの新規保存・キャッシュ処理
export async function cacheHistoryItem(
  item: HistoryItem,
  addLog: (msg: string) => void,
  setDroppedItem: (val: DroppedItem | null) => void
) {
  addLog("Fetching artwork for history item cache...")
  try {
    const response = await fetch(item.imageUrl)
    if (response.ok) {
      const blob = await response.blob()
      item.localImageBlob = blob
      addLog("History artwork cached locally.")
    } else {
      addLog("Failed to fetch history artwork from CDN.")
    }
  } catch (fetchErr) {
    console.error("CORS or network error fetching history artwork:", fetchErr)
    addLog("Failed to cache history artwork.")
  }

  await db.historyItems.put(item)
  addLog(`History item ${item.id} saved.`)
  setDroppedItem({ id: item.id, isMerged: false })
  setTimeout(() => setDroppedItem(null), 3000)
}

// 2. 履歴アイテムJSONドロップ処理
export async function handleHistoryItemDrop(
  jsonData: string,
  ctx: DragAndDropContext
): Promise<HistoryItem | null> {
  const { addLog, setDroppedItem } = ctx
  try {
    const item = JSON.parse(jsonData) as HistoryItem
    if (!item || !item.id || !item.imageUrl) {
      addLog("Invalid history item data.")
      return null
    }

    const existingCard = await db.getCardByJobId(item.id)
    if (existingCard) {
      await mergeImageToCard(
        existingCard,
        item.imageUrl,
        addLog,
        setDroppedItem
      )
    } else {
      await cacheHistoryItem(item, addLog, setDroppedItem)
    }
    return item
  } catch (err) {
    console.error("Failed to handle drop:", err)
    if (err instanceof Error) {
      addLog(`Error handling drop event: ${err.message}`)
    }
  }
  return null
}

// ドロップイベントのディスパッチ
export async function dispatchDrop(
  e: React.DragEvent,
  ctx: DragAndDropContext
): Promise<any> {
  const { addLog } = ctx
  const types = Array.from(e.dataTransfer?.types || [])
  const hasJsonData = types.includes("application/json")

  if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && !hasJsonData) {
    const files = Array.from(e.dataTransfer.files)
    return handleCardImageDrop(files, ctx)
  }

  const jsonData = e.dataTransfer.getData("application/json")
  if (!jsonData) {
    addLog("No JSON data in drop event.")
    return null
  }
  return handleHistoryItemDrop(jsonData, ctx)
}
