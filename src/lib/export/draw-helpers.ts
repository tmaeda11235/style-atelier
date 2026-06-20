/* eslint-disable max-lines-per-function, sonarjs/cognitive-complexity */
import type { StyleCard } from "../../shared/lib/db-schema"
import { compressCardData, generateQRCodeUrl } from "../../shared/lib/qr-utils"
import { drawRoundedRect, loadImage, resolveLocalImageSource } from "./helpers"

export function selectImageSources(card: StyleCard): string[] {
  const isLocalThumb =
    card.thumbnailData &&
    (card.thumbnailData.startsWith("data:") ||
      card.thumbnailData.startsWith("blob:") ||
      card.thumbnailData.includes("assets/icon.png") ||
      card.thumbnailData.startsWith("url:"))

  if (
    isLocalThumb &&
    (!card.selectedThumbnails || card.selectedThumbnails.length <= 1)
  ) {
    return [card.thumbnailData]
  }
  if (card.selectedThumbnails && card.selectedThumbnails.length > 0) {
    return card.selectedThumbnails.slice(0, 4)
  }
  if (card.images && card.images.length > 0) {
    return card.images.slice(0, 4)
  }
  if (card.thumbnailData) {
    return [card.thumbnailData]
  }
  return []
}

export async function resolveAndLoadImages(
  card: StyleCard,
  imageSources: string[],
  iconUrl: string,
  objectUrlsToRevoke: string[]
): Promise<HTMLImageElement[]> {
  const loadedImages: HTMLImageElement[] = []
  for (let i = 0; i < imageSources.length; i++) {
    const src = imageSources[i]
    const originalSrc = imageSources[i]
    try {
      const resolved = await resolveLocalImageSource(src, card)
      if (resolved.startsWith("blob:") && resolved !== src) {
        objectUrlsToRevoke.push(resolved)
      }
      const img = await loadImage(resolved)
      loadedImages.push(img)
    } catch (err) {
      console.warn(`Failed to load image: ${src}, falling back.`, err)
      await handleImageLoadFallback(
        card,
        originalSrc,
        iconUrl,
        loadedImages,
        objectUrlsToRevoke
      )
    }
  }

  if (imageSources.length > 0 && loadedImages.length < imageSources.length) {
    throw new Error(
      `Failed to load all images for card. Loaded ${loadedImages.length} of ${imageSources.length}.`
    )
  }
  return loadedImages
}

export async function handleImageLoadFallback(
  card: StyleCard,
  originalSrc: string,
  iconUrl: string,
  loadedImages: HTMLImageElement[],
  objectUrlsToRevoke: string[]
): Promise<void> {
  if (originalSrc !== card.thumbnailData && card.thumbnailData) {
    try {
      const fallbackSrc =
        card.thumbnailData === "assets/icon.png" ? iconUrl : card.thumbnailData
      const resolvedFallback = await resolveLocalImageSource(fallbackSrc, card)
      if (
        resolvedFallback.startsWith("blob:") &&
        resolvedFallback !== fallbackSrc
      ) {
        objectUrlsToRevoke.push(resolvedFallback)
      }
      const fallbackImg = await loadImage(resolvedFallback)
      loadedImages.push(fallbackImg)
    } catch (fallbackErr) {
      console.error("Fallback image failed to load as well.", fallbackErr)
    }
  }
}

export function drawArtworkGrid(
  ctx: CanvasRenderingContext2D,
  loadedImages: HTMLImageElement[],
  artX: number,
  artY: number,
  artW: number,
  artH: number,
  card?: StyleCard
) {
  if (loadedImages.length === 4) {
    const halfW = artW / 2
    const halfH = artH / 2
    ctx.drawImage(loadedImages[0], artX, artY, halfW, halfH)
    ctx.drawImage(loadedImages[1], artX + halfW, artY, halfW, halfH)
    ctx.drawImage(loadedImages[2], artX, artY + halfH, halfW, halfH)
    ctx.drawImage(loadedImages[3], artX + halfW, artY + halfH, halfW, halfH)
  } else if (loadedImages.length === 3) {
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
    const halfW = artW / 2
    ctx.drawImage(loadedImages[0], artX, artY, halfW, artH)
    ctx.drawImage(loadedImages[1], artX + halfW, artY, halfW, artH)
  } else if (loadedImages.length === 1) {
    const img = loadedImages[0]
    const clip = card?.clipSettings

    let zoom = clip?.zoom !== undefined ? clip.zoom : 1.0
    if (zoom < 1.0) zoom = 1.0
    if (zoom > 3.0) zoom = 3.0

    let xOffset = clip?.xOffset !== undefined ? clip.xOffset : 0.0
    if (xOffset < -0.5) xOffset = -0.5
    if (xOffset > 0.5) xOffset = 0.5

    let yOffset = clip?.yOffset !== undefined ? clip.yOffset : 0.0
    if (yOffset < -0.5) yOffset = -0.5
    if (yOffset > 0.5) yOffset = 0.5

    const targetRatio = artW / artH
    const imgRatio = img.width / img.height

    let sw = img.width
    let sh = img.height

    if (imgRatio > targetRatio) {
      sw = img.height * targetRatio
      sh = img.height
    } else {
      sw = img.width
      sh = img.width / targetRatio
    }

    const swZoomed = sw / zoom
    const shZoomed = sh / zoom

    const dx = img.width * xOffset
    const dy = img.height * yOffset

    const cx = img.width / 2 + dx
    const cy = img.height / 2 + dy

    let sxNew = cx - swZoomed / 2
    let syNew = cy - shZoomed / 2

    if (sxNew < 0) sxNew = 0
    if (sxNew > img.width - swZoomed) sxNew = img.width - swZoomed

    if (syNew < 0) syNew = 0
    if (syNew > img.height - shZoomed) syNew = img.height - shZoomed

    ctx.drawImage(img, sxNew, syNew, swZoomed, shZoomed, artX, artY, artW, artH)
  } else {
    ctx.fillStyle = "#475569"
    ctx.font = "24px sans-serif"
    ctx.textAlign = "center"
    ctx.fillText("No Art Loaded", artX + artW / 2, artY + artH / 2)
  }
}

export function drawCardParams(
  ctx: CanvasRenderingContext2D,
  infoX: number,
  y: number,
  card: StyleCard
) {
  ctx.fillStyle = "#94a3b8"
  ctx.font = '13px "Courier New", monospace'
  ctx.textAlign = "left"
  ctx.textBaseline = "top"

  let currentParamY = y

  const firstTextSegment = card.promptSegments?.find((s) => s.type === "text")
  if (firstTextSegment && firstTextSegment.value) {
    const textPreview =
      firstTextSegment.value.length > 35
        ? firstTextSegment.value.substring(0, 35) + "..."
        : firstTextSegment.value
    ctx.fillText(`"${textPreview}"`, infoX, currentParamY)
    currentParamY += 20
  }

  const paramList = selectParameters(card)
  if (paramList.length > 0) {
    const line1 = paramList.slice(0, 3).join(" ")
    const line2 = paramList.slice(3, 6).join(" ")
    ctx.fillText(line1, infoX, currentParamY)
    if (line2) {
      currentParamY += 18
      ctx.fillText(line2, infoX, currentParamY)
    }
  }
}

export function selectParameters(card: StyleCard): string[] {
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
  return paramList
}

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
    const qrPayload = `https://style-atelier.github.io/app/?p=${compressed}`
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
