// Helper to convert Uint8Array to Base64 in both Node and Browser
export function uint8ArrayToBase64(arr: Uint8Array): string {
  if (typeof Buffer !== "undefined") {
    return Buffer.from(arr).toString("base64")
  }
  let binary = ""
  const len = arr.byteLength
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(arr[i])
  }
  return btoa(binary)
}

// Helper to convert Base64 to Uint8Array in both Node and Browser
export function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64")
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength)
  }
  const binaryString = atob(base64)
  const len = binaryString.length
  const bytes = new Uint8Array(len)
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

// CRC-32 Utility
let crcTable: number[] | null = null

function getCRCTable(): number[] {
  if (crcTable) return crcTable
  const table: number[] = []
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    }
    table[n] = c
  }
  crcTable = table
  return table
}

export function crc32(bytes: Uint8Array): number {
  const table = getCRCTable()
  let crc = 0 ^ -1
  for (let i = 0; i < bytes.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ bytes[i]) & 0xff]
  }
  return (crc ^ -1) >>> 0
}
