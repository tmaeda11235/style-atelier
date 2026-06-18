import { crc32 } from "./binary-utils"

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

function processTextChunk(
  pngBytes: Uint8Array,
  offset: number,
  length: number,
  key: string,
  decoder: TextDecoder
): string | null {
  if (offset + 8 + length > pngBytes.length) return null
  const data = pngBytes.subarray(offset + 8, offset + 8 + length)
  return parseTextChunk(data, key, decoder)
}

/**
 * Inserts stylecard payload into PNG's tEXt chunk
 */
export function insertMetadataToPng(
  pngBytes: Uint8Array,
  key: string,
  value: string
): Uint8Array {
  if (!isPngSignatureValid(pngBytes)) {
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

  try {
    let offset = 8
    const decoder = new TextDecoder()
    let iterations = 0
    const maxIterations = 2000

    while (offset < pngBytes.length && iterations < maxIterations) {
      iterations++
      if (offset + 8 > pngBytes.length) break
      const view = new DataView(
        pngBytes.buffer,
        pngBytes.byteOffset + offset,
        8
      )
      const length = view.getUint32(0, false)
      const typeBytes = pngBytes.subarray(offset + 4, offset + 8)
      const type = String.fromCharCode(...typeBytes)

      if (type === "IEND") break

      if (type === "tEXt") {
        const val = processTextChunk(pngBytes, offset, length, key, decoder)
        if (val !== null) return val
      }

      const nextOffset = offset + 8 + length + 4
      if (nextOffset <= offset) break
      offset = nextOffset
    }
  } catch (error) {
    console.error("Error parsing PNG metadata:", error)
  }

  return null
}
