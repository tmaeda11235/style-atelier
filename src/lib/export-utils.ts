import iconUrl from "url:../../assets/icon.png"

import { db } from "./db"
import type { StyleCard } from "./db-schema"
import { compressCardData, generateQRCodeUrl } from "./qr-utils"

/**
 * Resolves a given image source URL to a local cache URL (Object URL of local blob)
 * if it exists in db.historyItems. Otherwise, returns the original URL.
 */
async function resolveLocalImageSource(
  src: string,
  card: StyleCard
): Promise<string> {
  // If it's already a local data/blob URL or placeholder asset, return as is
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
    // Look for a matching history item in associatedJobIds first
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

    // Fallback: search all history items matching this imageUrl (if not too many)
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
function loadImage(src: string): Promise<HTMLImageElement> {
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
function drawRoundedRect(
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

  // 1. Draw Card Background
  // Use dominant color as background theme, fallback to dark slate if missing
  const primaryBgColor = card.dominantColor || "#1e293b"
  const accentColor = card.accentColor || "#3b82f6"

  // Draw main card body with slight rounding and dark aesthetic
  ctx.fillStyle = "#0f172a" // Deep dark base
  ctx.fillRect(0, 0, width, height)

  // Gradient highlight on the background
  const bgGrad = ctx.createRadialGradient(
    width / 2,
    height / 2,
    50,
    width / 2,
    height / 2,
    width
  )
  bgGrad.addColorStop(0, primaryBgColor + "55") // Transparent version of dominant color
  bgGrad.addColorStop(1, "#0f172a")
  ctx.fillStyle = bgGrad
  ctx.fillRect(0, 0, width, height)

  // Card Outer Border
  ctx.strokeStyle = accentColor
  ctx.lineWidth = 6
  drawRoundedRect(ctx, 10, 10, width - 20, height - 20, 24)
  ctx.stroke()

  // 2. Load and Draw Art Image(s)
  // Determine if card.thumbnailData is already a local base64/blob URL or placeholder asset
  const isLocalThumb =
    card.thumbnailData &&
    (card.thumbnailData.startsWith("data:") ||
      card.thumbnailData.startsWith("blob:") ||
      card.thumbnailData.includes("assets/icon.png") ||
      card.thumbnailData.startsWith("url:"))

  let rawImageSources: string[] = []
  if (
    isLocalThumb &&
    (!card.selectedThumbnails || card.selectedThumbnails.length <= 1)
  ) {
    // If thumbnailData is already a local cache and we don't need a grid (0 or 1 thumbnails),
    // prioritize it to avoid CORS issues and redundant CDN network traffic entirely.
    rawImageSources = [card.thumbnailData]
  } else if (card.selectedThumbnails && card.selectedThumbnails.length > 0) {
    rawImageSources = card.selectedThumbnails.slice(0, 4)
  } else if (card.images && card.images.length > 0) {
    rawImageSources = card.images.slice(0, 4)
  } else if (card.thumbnailData) {
    rawImageSources = [card.thumbnailData]
  }

  const imageSources = rawImageSources.map((src) =>
    src === "assets/icon.png" ? iconUrl : src
  )

  const artX = 30
  const artY = 30
  const artW = 540
  const artH = 540

  // Clip the artwork container
  ctx.save()
  drawRoundedRect(ctx, artX, artY, artW, artH, 16)
  ctx.clip()

  // Draw background fallback for the image frame
  ctx.fillStyle = "#1e293b"
  ctx.fillRect(artX, artY, artW, artH)

  // Keep track of dynamically generated object URLs so we can revoke them and prevent memory leaks
  const objectUrlsToRevoke: string[] = []

  try {
    // Resolve all image sources to local cached blobs if available
    const resolvedSources: string[] = []
    for (const src of imageSources) {
      const resolved = await resolveLocalImageSource(src, card)
      resolvedSources.push(resolved)
      if (resolved.startsWith("blob:") && resolved !== src) {
        objectUrlsToRevoke.push(resolved)
      }
    }

    const loadedImages: HTMLImageElement[] = []
    for (let i = 0; i < resolvedSources.length; i++) {
      const src = resolvedSources[i]
      const originalSrc = imageSources[i]
      try {
        const img = await loadImage(src)
        loadedImages.push(img)
      } catch (err) {
        console.warn(`Failed to load image: ${src}, falling back.`, err)
        // Fallback to card's base64 thumbnailData if CDN/blob fetch fails
        if (originalSrc !== card.thumbnailData && card.thumbnailData) {
          try {
            const fallbackSrc =
              card.thumbnailData === "assets/icon.png"
                ? iconUrl
                : card.thumbnailData
            const resolvedFallback = await resolveLocalImageSource(
              fallbackSrc,
              card
            )
            const fallbackImg = await loadImage(resolvedFallback)
            loadedImages.push(fallbackImg)
            if (
              resolvedFallback.startsWith("blob:") &&
              resolvedFallback !== fallbackSrc
            ) {
              objectUrlsToRevoke.push(resolvedFallback)
            }
          } catch (fallbackErr) {
            console.error("Fallback image failed to load as well.", fallbackErr)
          }
        }
      }
    }

    if (imageSources.length > 0 && loadedImages.length < imageSources.length) {
      throw new Error(
        `Failed to load all images for card. Loaded ${loadedImages.length} of ${imageSources.length}.`
      )
    }

    if (loadedImages.length === 4) {
      // 2x2 Grid Layout
      const halfW = artW / 2
      const halfH = artH / 2
      ctx.drawImage(loadedImages[0], artX, artY, halfW, halfH)
      ctx.drawImage(loadedImages[1], artX + halfW, artY, halfW, halfH)
      ctx.drawImage(loadedImages[2], artX, artY + halfH, halfW, halfH)
      ctx.drawImage(loadedImages[3], artX + halfW, artY + halfH, halfW, halfH)
    } else if (loadedImages.length === 3) {
      // 3-split grid layout (1 large left, 2 stacked right)
      const twoThirdsW = (artW * 2) / 3
      const oneThirdW = artW / 3
      const halfH = artH / 2
      ctx.drawImage(loadedImages[0], artX, artY, twoThirdsW, artH)
      ctx.drawImage(loadedImages[1], artX + twoThirdsW, artY, oneThirdW, halfH)
      ctx.drawImage(
        loadedImages[2],
        artX + twoThirdsW,
        artY + halfH,
        oneThirdW,
        halfH
      )
    } else if (loadedImages.length === 2) {
      // 2-split vertical layout
      const halfW = artW / 2
      ctx.drawImage(loadedImages[0], artX, artY, halfW, artH)
      ctx.drawImage(loadedImages[1], artX + halfW, artY, halfW, artH)
    } else if (loadedImages.length === 1) {
      // Single main image
      ctx.drawImage(loadedImages[0], artX, artY, artW, artH)
    } else {
      // If no images could be loaded, draw a placeholder icon text
      ctx.fillStyle = "#475569"
      ctx.font = "24px sans-serif"
      ctx.textAlign = "center"
      ctx.fillText("No Art Loaded", artX + artW / 2, artY + artH / 2)
    }
  } catch (err: any) {
    throw new Error(`Failed to draw artwork to canvas: ${err.message || err}`, {
      cause: err
    })
  } finally {
    // Revoke object URLs to prevent memory leaks
    for (const url of objectUrlsToRevoke) {
      URL.revokeObjectURL(url)
    }
  }
  ctx.restore()

  // 3. Draw Bottom Panel (Card Info)
  const infoY = 595
  const infoX = 35

  // Title
  ctx.fillStyle = "#f8fafc"
  ctx.font = 'bold 26px "Segoe UI", Roboto, sans-serif'
  ctx.textAlign = "left"
  ctx.textBaseline = "top"
  ctx.fillText(card.name, infoX, infoY)

  // Rarity Badge Config
  const tierColors: Record<string, string> = {
    Common: "#94a3b8",
    Rare: "#3b82f6",
    Epic: "#a855f7",
    Legendary: "#eab308"
  }
  const tierColor = tierColors[card.tier] || "#94a3b8"

  // Draw Rarity Badge Background Capsule
  ctx.fillStyle = tierColor
  const badgeY = infoY + 40
  const badgeW = 90
  const badgeH = 22
  drawRoundedRect(ctx, infoX, badgeY, badgeW, badgeH, 6)
  ctx.fill()

  // Rarity Badge Text
  ctx.fillStyle = "#0f172a"
  ctx.font = "bold 12px sans-serif"
  ctx.textAlign = "center"
  ctx.textBaseline = "middle"
  ctx.fillText(card.tier.toUpperCase(), infoX + badgeW / 2, badgeY + badgeH / 2)

  // Prompt / Parameters Summary
  ctx.fillStyle = "#94a3b8"
  ctx.font = '13px "Courier New", monospace'
  ctx.textAlign = "left"
  ctx.textBaseline = "top"

  const paramsY = badgeY + 35
  let currentParamY = paramsY

  // Render Aspect Ratio and other options if set
  const paramList: string[] = []
  if (card.parameters?.ar) paramList.push(`--ar ${card.parameters.ar}`)
  if (card.parameters?.stylize !== undefined)
    paramList.push(`--s ${card.parameters.stylize}`)
  if (card.parameters?.chaos !== undefined)
    paramList.push(`--c ${card.parameters.chaos}`)
  if (card.parameters?.weird !== undefined)
    paramList.push(`--w ${card.parameters.weird}`)
  if (card.parameters?.raw) paramList.push(`--style raw`)
  if (card.parameters?.tile) paramList.push(`--tile`)

  // First lines of text prompt segments
  const firstTextSegment = card.promptSegments?.find((s) => s.type === "text")
  if (firstTextSegment && firstTextSegment.value) {
    const textPreview =
      firstTextSegment.value.length > 35
        ? firstTextSegment.value.substring(0, 35) + "..."
        : firstTextSegment.value
    ctx.fillText(`"${textPreview}"`, infoX, currentParamY)
    currentParamY += 20
  }

  // Draw parameter items (split into lines of 2 if too long)
  if (paramList.length > 0) {
    const line1 = paramList.slice(0, 3).join(" ")
    const line2 = paramList.slice(3, 6).join(" ")
    ctx.fillText(line1, infoX, currentParamY)
    if (line2) {
      currentParamY += 18
      ctx.fillText(line2, infoX, currentParamY)
    }
  }

  // 4. Generate and Draw QR Code
  try {
    const qrSize = 180
    const qrX = width - qrSize - 35
    const qrY = 600 // Adjusted from infoY - 20 (575) to prevent overlapping artwork and balance layout

    const compressed = compressCardData(card)
    const qrPayload = `web+styleatelier://import?data=${compressed}`
    const qrDataUrl = await generateQRCodeUrl(qrPayload, qrSize)
    const qrImg = await loadImage(qrDataUrl)

    // Draw White card frame behind QR code for high contrast scanning
    ctx.fillStyle = "#ffffff"
    drawRoundedRect(ctx, qrX - 8, qrY - 8, qrSize + 16, qrSize + 16, 12)
    ctx.fill()

    // Draw QR image (disable smoothing for pixel-perfect sharpness)
    ctx.save()
    ctx.imageSmoothingEnabled = false
    ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize)
    ctx.restore()

    // Label under QR Code (use higher contrast color and adjusted padding)
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
