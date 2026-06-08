import { db } from "../db"
import type { StyleCard } from "../db-schema"

/**
 * Resolves a given image source URL to a local cache URL (Object URL of local blob)
 * if it exists in db.historyItems. Otherwise, returns the original URL.
 */
export async function resolveLocalImageSource(
  src: string,
  card: StyleCard
): Promise<string> {
  if (
    !src ||
    src.startsWith("data:") ||
    src.startsWith("blob:") ||
    src.includes("assets/icon.png") ||
    src.startsWith("url:")
  ) {
    return src
  }

  try {
    const jobIds = card.associatedJobIds || (card.jobId ? [card.jobId] : [])
    for (const jobId of jobIds) {
      const historyItem = await db.historyItems.get(jobId)
      if (
        historyItem &&
        historyItem.imageUrl === src &&
        historyItem.localImageBlob
      ) {
        return URL.createObjectURL(historyItem.localImageBlob)
      }
    }

    const matchedItem = await db.historyItems
      .filter((item) => item.imageUrl === src && !!item.localImageBlob)
      .first()
    if (matchedItem && matchedItem.localImageBlob) {
      return URL.createObjectURL(matchedItem.localImageBlob)
    }
  } catch (err) {
    console.warn("Failed to resolve local image from database:", err)
  }

  return src
}

/**
 * Loads an image from a URL or Base64 string, handling CORS.
 */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => resolve(img)
    img.onerror = (err) => reject(err)
    img.src = src
  })
}

/**
 * Draws a rounded rectangle path on the canvas context.
 */
export function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number
) {
  ctx.beginPath()
  ctx.moveTo(x + radius, y)
  ctx.lineTo(x + width - radius, y)
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
  ctx.lineTo(x + width, y + height - radius)
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
  ctx.lineTo(x + radius, y + height)
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
  ctx.lineTo(x, y + radius)
  ctx.quadraticCurveTo(x, y, x + radius, y)
  ctx.closePath()
}
