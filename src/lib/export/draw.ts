import type { StyleCard } from "../db-schema"
import { compressCardData, generateQRCodeUrl } from "../qr-utils"
import {
  drawArtworkGrid,
  drawCardParams,
  resolveAndLoadImages,
  selectImageSources
} from "./draw-helpers"
import { drawRoundedRect, loadImage } from "./helpers"

export function drawCardBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  primaryBgColor: string,
  accentColor: string
) {
  ctx.fillStyle = "#0f172a" // Deep dark base
  ctx.fillRect(0, 0, width, height)

  const bgGrad = ctx.createRadialGradient(
    width / 2,
    height / 2,
    50,
    width / 2,
    height / 2,
    width
  )
  bgGrad.addColorStop(0, primaryBgColor + "55")
  bgGrad.addColorStop(1, "#0f172a")
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  ctx.strokeStyle = accentColor
  ctx.lineWidth = 6
  drawRoundedRect(ctx, 10, 10, width - 20, height - 20, 24)
  ctx.stroke()
}

export async function drawArtwork(
  ctx: CanvasRenderingContext2D,
  artX: number,
  artY: number,
  artW: number,
  artH: number,
  card: StyleCard,
  iconUrl: string
) {
  ctx.save()
  drawRoundedRect(ctx, artX, artY, artW, artH, 16)
  ctx.clip()

  ctx.fillStyle = "#1e293b"
  ctx.fillRect(artX, artY, artW, artH)

  const imageSources = selectImageSources(card).map((src) =>
    src === "assets/icon.png" ? iconUrl : src
  )

  const objectUrlsToRevoke: string[] = []
  try {
    const loadedImages = await resolveAndLoadImages(
      card,
      imageSources,
      iconUrl,
      objectUrlsToRevoke
    )
    drawArtworkGrid(ctx, loadedImages, artX, artY, artW, artH)
  } catch (err: any) {
    throw new Error(`Failed to draw artwork to canvas: ${err.message || err}`, {
      cause: err
    })
  } finally {
    objectUrlsToRevoke.forEach((url) => URL.revokeObjectURL(url))
  }
  ctx.restore()
}

export function drawCardInfo(
  ctx: CanvasRenderingContext2D,
  infoX: number,
  infoY: number,
  card: StyleCard
) {
  ctx.fillStyle = "#f8fafc"
  ctx.font = 'bold 26px "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = "left"
  ctx.textBaseline = "top"
  ctx.fillText(card.name, infoX, infoY)

  const tierColors: Record<string, string> = {
    Common: "#94a3b8",
    Rare: "#3b82f6",
    Epic: "#a855f7",
    Legendary: "#eab308"
  }
  const tierColor = tierColors[card.tier] || "#94a3b8"

  ctx.fillStyle = tierColor
  const badgeY = infoY + 40
  const badgeW = 90
  const badgeH = 22
  drawRoundedRect(ctx, infoX, badgeY, badgeW, badgeH, 6)
  ctx.fill()

  ctx.fillStyle = "#0f172a"
  ctx.font = "bold 12px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(card.tier.toUpperCase(), infoX + badgeW / 2, badgeY + badgeH / 2)

  drawCardParams(ctx, infoX, badgeY + 35, card)
}

export async function drawQRCode(
  ctx: CanvasRenderingContext2D,
  width: number,
  qrSize: number,
  qrX: number,
  qrY: number,
  card: StyleCard
) {
  try {
    const compressed = compressCardData(card)
    const qrPayload = `web+styleatelier://import?data=${compressed}`
    const qrDataUrl = await generateQRCodeUrl(qrPayload, qrSize)
    const qrImg = await loadImage(qrDataUrl)

    ctx.fillStyle = "#ffffff"
    drawRoundedRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12)
    ctx.fill()

    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
    ctx.restore()

    ctx.fillStyle = "#94a3b8"
    ctx.font = "bold 9px sans-serif"
    ctx.textAlign = "center"
    ctx.textBaseline = "top"
    ctx.fillText("SCAN TO IMPORT", qrX + qrSize / 2, qrY + qrSize + 14)
  } catch (err: any) {
    throw new Error(`Failed to generate QR code: ${err.message || err}`, {
      cause: err
    })
  }
}

export function drawBrandLogo(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  text: string
) {
  ctx.save()

  ctx.font = 'bold 11px "Segoe UI", Roboto, sans-serif'
  const textWidth = ctx.measureText(text).width

  const badgeH = 22
  const badgeW = textWidth + 20

  const badgeX = 35
  const badgeY = height - 50 // 50px from the bottom

  // Capsule styling: semi-transparent slate border & background
  ctx.fillStyle = "rgba(30, 41, 59, 0.7)"
  ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
  ctx.lineWidth = 1
  drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 11)
  ctx.fill()
  ctx.stroke()

  ctx.fillStyle = "#ffffff"
  ctx.textAlign = "left"
  ctx.textBaseline = "middle"
  ctx.fillText(text, badgeX + 10, badgeY + badgeH / 2)

  ctx.restore()
}
