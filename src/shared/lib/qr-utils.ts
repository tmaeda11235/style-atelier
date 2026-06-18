import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate"
import jsQR from "jsqr"
import QRCode from "qrcode"

import { base64ToUint8Array, crc32, uint8ArrayToBase64 } from "./binary-utils"
import type { StyleCard } from "./db-schema"
import {
  extractMetadataFromPng,
  insertMetadataToPng
} from "./png-metadata-utils"

export { crc32 } // Re-export for any external consumers
export { insertMetadataToPng, extractMetadataFromPng }

/**
 * Compresses essential StyleCard fields into a Base64 string payload.
 * Strips heavy visual data like thumbnailData.
 */
export function compressCardData(card: StyleCard): string {
  const parameters = { ...card.parameters }
  if (card.masking?.isSrefHidden) {
    delete parameters.sref
  }
  if (card.masking?.isPHidden) {
    delete parameters.p
  }

  const cleanCard = {
    id: card.id,
    name: card.name,
    promptSegments: card.promptSegments,
    parameters: parameters,
    tier: card.tier,
    frameId: card.frameId,
    category: card.category,
    imageUrl: card.images?.[0] || card.selectedThumbnails?.[0] || "",
    accentColor: card.accentColor,
    dominantColor: card.dominantColor
  }

  const jsonStr = JSON.stringify(cleanCard)
  const bytes = strToU8(jsonStr)
  const compressed = deflateSync(bytes)
  return uint8ArrayToBase64(compressed)
}

/**
 * Decompresses a Base64 payload string back into a partial StyleCard.
 */
export function decompressCardData(payload: string): Partial<StyleCard> {
  try {
    let base64Data = payload
    if (payload.includes("?data=")) {
      const match = payload.match(/[?&]data=([^&]+)/)
      if (match && match[1]) {
        base64Data = decodeURIComponent(match[1])
      }
    }
    const compressedBytes = base64ToUint8Array(base64Data)
    const decompressedBytes = inflateSync(compressedBytes)
    const jsonStr = strFromU8(decompressedBytes)
    const data = JSON.parse(jsonStr)

    // Reconstruct the StyleCard object fields
    const card: Partial<StyleCard> = {
      id: data.id,
      name: data.name,
      promptSegments: data.promptSegments,
      parameters: data.parameters,
      tier: data.tier,
      frameId: data.frameId,
      category: data.category,
      accentColor: data.accentColor,
      dominantColor: data.dominantColor
    }

    if (data.imageUrl) {
      card.images = [data.imageUrl]
      card.selectedThumbnails = [data.imageUrl]
    }

    return card
  } catch (error) {
    console.error("Failed to decompress card data:", error)
    throw new Error("Invalid QR payload or compression error", { cause: error })
  }
}

/**
 * Generates a Data URL for a QR Code image containing the payload string.
 */
export function generateQRCodeUrl(
  payload: string,
  width?: number
): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: "M", // Medium error correction is a good balance for data capacity
    margin: 2,
    width: width || 200
  })
}

/**
 * Reads a QR code from a File object (Browser environment).
 * Attempts to extract from PNG metadata first, then scans the image,
 * and falls back to scanning a cropped/scaled bottom-right corner.
 */
export function readQRCodeFromImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    // 1. Try reading PNG metadata first, if readAsArrayBuffer is supported
    if (typeof FileReader.prototype.readAsArrayBuffer === "function") {
      const binaryReader = new FileReader()
      binaryReader.onload = (e) => {
        try {
          const arrayBuffer = e.target?.result as ArrayBuffer
          const bytes = new Uint8Array(arrayBuffer)
          const metadata = extractMetadataFromPng(bytes, "stylecard")
          if (metadata) {
            resolve(metadata)
            return
          }
        } catch (err) {
          console.warn("Failed to check PNG metadata:", err)
        }

        // If metadata not found or failed, proceed to QR code scanning
        scanQRCodeImage(file).then(resolve)
      }
      binaryReader.onerror = () => {
        // Fallback directly to image scanning if binary read fails
        scanQRCodeImage(file).then(resolve)
      }
      binaryReader.readAsArrayBuffer(file)
    } else {
      // Direct fallback to scan image
      scanQRCodeImage(file).then(resolve)
    }
  })
}

function tryFullScan(img: HTMLImageElement | HTMLCanvasElement): string | null {
  try {
    const canvas = document.createElement("canvas")
    canvas.width = img.width
    canvas.height = img.height
    const ctx = canvas.getContext("2d")
    if (!ctx) return null
    ctx.drawImage(img, 0, 0)
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    return code ? code.data : null
  } catch (err) {
    console.error("Error during tryFullScan:", err)
    return null
  }
}

function tryCropScan(
  img: HTMLImageElement | HTMLCanvasElement,
  scale: number
): string | null {
  try {
    const cropX = Math.floor(img.width * 0.5)
    const cropY = Math.floor(img.height * 0.55)
    const cropW = img.width - cropX
    const cropH = img.height - cropY

    const canvas = document.createElement("canvas")
    canvas.width = cropW * scale
    canvas.height = cropH * scale
    const ctx = canvas.getContext("2d")
    if (!ctx) return null

    if (scale > 1) {
      ctx.imageSmoothingEnabled = false
    }
    ctx.drawImage(
      img,
      cropX,
      cropY,
      cropW,
      cropH,
      0,
      0,
      cropW * scale,
      cropH * scale
    )
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
    const code = jsQR(imageData.data, imageData.width, imageData.height)
    return code ? code.data : null
  } catch (err) {
    console.error("Error during tryCropScan:", err)
    return null
  }
}

function resizeIfNeeded(
  img: HTMLImageElement,
  maxSize: number
): HTMLImageElement | HTMLCanvasElement {
  if (img.width <= maxSize && img.height <= maxSize) {
    return img
  }
  let width = img.width
  let height = img.height
  if (width > height) {
    height = Math.round((height * maxSize) / width)
    width = maxSize
  } else {
    width = Math.round((width * maxSize) / height)
    height = maxSize
  }

  const canvas = document.createElement("canvas")
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext("2d")
  if (ctx) {
    ctx.drawImage(img, 0, 0, width, height)
    return canvas
  }
  return img
}

function scanQRCodeImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    let objectUrl: string | null = null
    try {
      objectUrl = URL.createObjectURL(file)
      const img = new Image()

      const timeoutId = setTimeout(() => {
        console.warn("QR code scanning timed out (5s limit)")
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        resolve(null)
      }, 5000)

      img.onload = () => {
        clearTimeout(timeoutId)
        try {
          const source = resizeIfNeeded(img, 1024)
          const fullResult = tryFullScan(source)
          if (fullResult) {
            resolve(fullResult)
            return
          }
          const cropResult = tryCropScan(source, 1)
          if (cropResult) {
            resolve(cropResult)
            return
          }
          resolve(tryCropScan(source, 2))
        } catch (err) {
          console.error("Error extracting image data for QR scanning:", err)
          resolve(null)
        } finally {
          if (objectUrl) URL.revokeObjectURL(objectUrl)
        }
      }

      img.onerror = () => {
        clearTimeout(timeoutId)
        console.error("Failed to load image for QR scanning")
        if (objectUrl) URL.revokeObjectURL(objectUrl)
        resolve(null)
      }
      img.src = objectUrl
    } catch (err) {
      console.error("Failed to setup QR code scanning image:", err)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
      resolve(null)
    }
  })
}
