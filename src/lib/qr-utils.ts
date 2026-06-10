import { deflateSync, inflateSync, strFromU8, strToU8 } from "fflate"
import jsQR from "jsqr"
import QRCode from "qrcode"

import { base64ToUint8Array, crc32, uint8ArrayToBase64 } from "./binary-utils"
import type { StyleCard } from "./db-schema"

export { crc32 } // Re-export for any external consumers

/**
 * Inserts stylecard payload into PNG's tEXt chunk
 */
export function insertMetadataToPng(
  pngBytes: Uint8Array,
  key: string,
  value: string
): Uint8Array {
  if (
    pngBytes.length < 8 ||
    pngBytes[0] !== 0x89 ||
    pngBytes[1] !== 0x50 ||
    pngBytes[2] !== 0x4e ||
    pngBytes[3] !== 0x47
  ) {
    throw new Error("Invalid PNG signature")
  }

  const encoder = new TextEncoder()
  const keyBytes = encoder.encode(key)
  const valBytes = encoder.encode(value)

  const chunkData = new Uint8Array(keyBytes.length + 1 + valBytes.length)
  chunkData.set(keyBytes, 0)
  chunkData[keyBytes.length] = 0 // null separator
  chunkData.set(valBytes, keyBytes.length + 1)

  const chunkType = encoder.encode("tEXt")
  const length = chunkData.length

  const newChunk = new Uint8Array(4 + 4 + length + 4)
  const view = new DataView(newChunk.buffer)
  view.setUint32(0, length, false)
  newChunk.set(chunkType, 4)
  newChunk.set(chunkData, 8)

  const crcTarget = new Uint8Array(4 + length)
  crcTarget.set(chunkType, 0)
  crcTarget.set(chunkData, 4)
  const crcVal = crc32(crcTarget)
  view.setUint32(8 + length, crcVal, false)

  // Find the end of the IHDR chunk to insert our new chunk
  const ihdrLenView = new DataView(pngBytes.buffer, pngBytes.byteOffset + 8, 4)
  const ihdrLen = ihdrLenView.getUint32(0, false)
  const ihdrEndPos = 8 + 4 + 4 + ihdrLen + 4

  const result = new Uint8Array(pngBytes.length + newChunk.length)
  result.set(pngBytes.subarray(0, ihdrEndPos), 0)
  result.set(newChunk, ihdrEndPos)
  result.set(pngBytes.subarray(ihdrEndPos), ihdrEndPos + newChunk.length)

  return result
}

function isPngSignatureValid(pngBytes: Uint8Array): boolean {
  return (
    pngBytes.length >= 8 &&
    pngBytes[0] === 0x89 &&
    pngBytes[1] === 0x50 &&
    pngBytes[2] === 0x4e &&
    pngBytes[3] === 0x47
  )
}

function parseTextChunk(
  data: Uint8Array,
  key: string,
  decoder: TextDecoder
): string | null {
  const nullIdx = data.indexOf(0)
  if (nullIdx === -1) return null

  const chunkKey = decoder.decode(data.subarray(0, nullIdx))
  if (chunkKey === key) {
    return decoder.decode(data.subarray(nullIdx + 1))
  }
  return null
}

/**
 * Extracts stylecard payload from PNG's tEXt chunk
 */
export function extractMetadataFromPng(
  pngBytes: Uint8Array,
  key: string
): string | null {
  if (!isPngSignatureValid(pngBytes)) {
    return null
  }

  let offset = 8
  const decoder = new TextDecoder()

  while (offset < pngBytes.length) {
    if (offset + 8 > pngBytes.length) break
    const view = new DataView(pngBytes.buffer, pngBytes.byteOffset + offset, 8)
    const length = view.getUint32(0, false)
    const typeBytes = pngBytes.subarray(offset + 4, offset + 8)
    const type = String.fromCharCode(...typeBytes)

    if (type === "IEND") {
      break
    }

    if (type === "tEXt" && offset + 8 + length <= pngBytes.length) {
      const data = pngBytes.subarray(offset + 8, offset + 8 + length)
      const value = parseTextChunk(data, key, decoder)
      if (value !== null) {
        return value
      }
    }

    offset += 8 + length + 4
  }

  return null
}

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

function tryFullScan(img: HTMLImageElement): string | null {
  const canvas = document.createElement("canvas")
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext("2d")
  if (!ctx) return null
  ctx.drawImage(img, 0, 0)
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const code = jsQR(imageData.data, imageData.width, imageData.height)
  return code ? code.data : null
}

function tryCropScan(img: HTMLImageElement, scale: number): string | null {
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
}

function scanQRCodeImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const img = new Image()
      img.onload = () => {
        try {
          const fullResult = tryFullScan(img)
          if (fullResult) {
            resolve(fullResult)
            return
          }
          const cropResult = tryCropScan(img, 1)
          if (cropResult) {
            resolve(cropResult)
            return
          }
          const scaleResult = tryCropScan(img, 2)
          resolve(scaleResult)
        } catch (err) {
          console.error("Error extracting image data for QR scanning:", err)
          resolve(null)
        }
      }
      img.onerror = () => resolve(null)
      img.src = e.target?.result as string
    }
    reader.onerror = () => resolve(null)
    reader.readAsDataURL(file)
  })
}
