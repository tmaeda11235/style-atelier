import type { StyleCard } from "../db-schema"
import { loadImage, resolveLocalImageSource } from "./helpers"

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
  artH: number
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
    ctx.drawImage(loadedImages[0], artX, artY, artW, artH)
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
