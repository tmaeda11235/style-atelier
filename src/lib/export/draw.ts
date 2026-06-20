import type { StyleCard } from "../../shared/lib/db-schema"
import { generateQRCodeUrl } from "../../shared/lib/qr-utils"
import {
  drawArtworkGrid,
  drawCardParams,
  resolveAndLoadImages,
  selectImageSources
} from "./draw-helpers"
import { drawRoundedRect, loadImage } from "./helpers"

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
    drawArtworkGrid(ctx, loadedImages, artX, artY, artW, artH, card)
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

export interface BrandLogoOptions {
  text: string
  brandingEnabled?: boolean
  customLogo?: string // Base64
  customLogoPath?: string // OPFS path
  twitter?: string
  etsy?: string
  socialDisplayType?: "text" | "qr" | "none"
}

async function getLogoImage(
  options: BrandLogoOptions
): Promise<{ img: HTMLImageElement | null; objectUrl: string | null }> {
  if (options.customLogoPath) {
    try {
      const { readBlobFromOpfs } =
        await import("../../shared/lib/db/migration-helpers")
      const blob = await readBlobFromOpfs(options.customLogoPath)
      const url = URL.createObjectURL(blob)
      return { img: await loadImage(url), objectUrl: url }
    } catch (e) {
      console.error("Failed to load custom logo from OPFS in canvas:", e)
    }
  } else if (options.customLogo) {
    try {
      return { img: await loadImage(options.customLogo), objectUrl: null }
    } catch (e) {
      console.error("Failed to load custom logo image in canvas:", e)
    }
  }
  return { img: null, objectUrl: null }
}

// Draw brand badge capsule (logo image or text) and return its width
async function drawBrandLogoCapsule(
  ctx: CanvasRenderingContext2D,
  badgeX: number,
  badgeY: number,
  badgeH: number,
  options: BrandLogoOptions
): Promise<number> {
  const { img: logoImg, objectUrl } = await getLogoImage(options)
  const padding = 2
  const imgH = badgeH - padding * 2 // 18px
  let badgeW = 0

  if (logoImg) {
    const imgW = (logoImg.width / logoImg.height) * imgH
    badgeW = imgW + 20
    ctx.fillStyle = "rgba(30, 41, 59, 0.7)"
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
    ctx.lineWidth = 1
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 11)
    ctx.fill()
    ctx.stroke()
    ctx.drawImage(logoImg, badgeX + 10, badgeY + padding, imgW, imgH)
  } else if (
    !options.brandingEnabled ||
    options.customLogo ||
    options.customLogoPath
  ) {
    ctx.font = 'bold 11px "Segoe UI", Roboto, sans-serif'
    const textWidth = ctx.measureText(options.text).width
    badgeW = textWidth + 20
    ctx.fillStyle = "rgba(30, 41, 59, 0.7)"
    ctx.strokeStyle = "rgba(255, 255, 255, 0.1)"
    ctx.lineWidth = 1
    drawRoundedRect(ctx, badgeX, badgeY, badgeW, badgeH, 11)
    ctx.fill()
    ctx.stroke()
    ctx.fillStyle = "#ffffff"
    ctx.textAlign = "left"
    ctx.textBaseline = "middle"
    ctx.fillText(options.text, badgeX + 10, badgeY + badgeH / 2)
  }

  if (objectUrl) {
    URL.revokeObjectURL(objectUrl)
  }
  return badgeW
}

// Draw social links as plain text
function drawSocialText(
  ctx: CanvasRenderingContext2D,
  startX: number,
  badgeY: number,
  badgeH: number,
  options: BrandLogoOptions
) {
  const parts = [
    options.twitter && `X: ${options.twitter}`,
    options.etsy && `Etsy: ${options.etsy}`
  ].filter(Boolean) as string[]

  ctx.font = 'normal 11px "Segoe UI", Roboto, sans-serif'
  ctx.fillStyle = "rgba(255, 255, 255, 0.6)"
  ctx.textAlign = "left"
  ctx.textBaseline = "middle"
  ctx.fillText(parts.join("  |  "), startX, badgeY + badgeH / 2)
}

// Draw a single social link QR code
async function drawSingleSocialQR(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  label: string,
  url: string
) {
  try {
    const qrDataUrl = await generateQRCodeUrl(url, 80)
    const qrImg = await loadImage(qrDataUrl)
    ctx.fillStyle = "#ffffff"
    drawRoundedRect(ctx, x, y, size, size, 4)
    ctx.fill()
    ctx.drawImage(qrImg, x + 2, y + 2, size - 4, size - 4)
    ctx.font = "bold 8px sans-serif"
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)"
    ctx.textAlign = "center"
    ctx.fillText(label, x + size / 2, y + size + 10)
  } catch (e) {
    console.error(`Failed to draw ${label} QR code:`, e)
  }
}

// Draw social links as QR codes
async function drawSocialQRs(
  ctx: CanvasRenderingContext2D,
  startX: number,
  badgeY: number,
  badgeH: number,
  options: BrandLogoOptions
) {
  const qrSize = 40
  const qrY = badgeY + (badgeH - qrSize) / 2
  let currentX = startX

  if (options.twitter) {
    const url = options.twitter.startsWith("http")
      ? options.twitter
      : `https://x.com/${options.twitter}`
    await drawSingleSocialQR(ctx, currentX, qrY, qrSize, "X", url)
    currentX += qrSize + 25
  }

  if (options.etsy) {
    const url = options.etsy.startsWith("http")
      ? options.etsy
      : `https://www.etsy.com/shop/${options.etsy}`
    await drawSingleSocialQR(ctx, currentX, qrY, qrSize, "Etsy", url)
  }
}

export async function drawBrandLogo(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  options: BrandLogoOptions
) {
  ctx.save()
  const badgeH = 22
  const badgeY = height - 50 // 50px from the bottom
  const badgeX = 35

  const badgeW = await drawBrandLogoCapsule(
    ctx,
    badgeX,
    badgeY,
    badgeH,
    options
  )

  const displayType = options.socialDisplayType || "none"
  if (displayType !== "none" && (options.twitter || options.etsy)) {
    const startX = badgeX + badgeW + (badgeW > 0 ? 15 : 0)
    if (displayType === "text") {
      drawSocialText(ctx, startX, badgeY, badgeH, options)
    } else if (displayType === "qr") {
      await drawSocialQRs(ctx, startX, badgeY, badgeH, options)
    }
  }
  ctx.restore()
}
