import iconUrl from "url:../../assets/icon.png"

import type { StyleCard } from "./db-schema"
import {
  drawArtwork,
  drawCardBackground,
  drawCardInfo,
  drawQRCode
} from "./export/draw"

/**
 * Renders the card content onto a canvas.
 */
export async function renderCardToCanvas(
  card: StyleCard
): Promise<HTMLCanvasElement> {
  const width = 600
  const height = 850

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (!ctx) {
    throw new Error("Could not get 2D context for canvas")
  }

  const primaryBgColor = card.dominantColor || "#1e293b"
  const accentColor = card.accentColor || "#3b82f6"

  // 1. Draw Card Background
  drawCardBackground(ctx, width, height, primaryBgColor, accentColor)

  // 2. Draw Art Image(s)
  await drawArtwork(ctx, 30, 30, 540, 540, card, iconUrl)

  // 3. Draw Bottom Panel (Card Info)
  drawCardInfo(ctx, 35, 595, card)

  // 4. Generate and Draw QR Code
  const qrSize = 180
  const qrX = width - qrSize - 35
  const qrY = 600
  await drawQRCode(ctx, width, qrSize, qrX, qrY, card)

  return canvas
}

/**
 * Renders the card content onto a canvas and triggers a PNG download.
 */
export async function exportCardAsImage(card: StyleCard): Promise<void> {
  const canvas = await renderCardToCanvas(card)
  const dataUrl = canvas.toDataURL("image/png")
  const downloadLink = document.createElement("a")
  const safeName = card.name.replace(/[\s/\\?%*:|"<>]/g, "_") || "style_card"
  const timestamp = Date.now()
  downloadLink.download = `${safeName}_${timestamp}.png`
  downloadLink.href = dataUrl
  downloadLink.click()
}
