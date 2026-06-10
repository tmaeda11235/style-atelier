export interface StorageEstimateResult {
  usage: number // in bytes
  quota: number // in bytes
  percentage: number // 0 to 100
  usageFormatted: string // e.g. "12.5 MB"
  quotaFormatted: string // e.g. "500.0 MB"
}

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes === 0) return "0 Bytes"
  const k = 1024
  const dm = decimals < 0 ? 0 : decimals
  const sizes = ["Bytes", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return (bytes / Math.pow(k, i)).toFixed(dm) + " " + sizes[i]
}

export async function getStorageEstimate(): Promise<StorageEstimateResult | null> {
  if (
    typeof window === "undefined" ||
    typeof navigator === "undefined" ||
    !navigator ||
    !navigator.storage ||
    !navigator.storage.estimate
  ) {
    return null
  }
  try {
    const estimate = await navigator.storage.estimate()
    const usage = estimate?.usage ?? 0
    const quota = estimate?.quota ?? 1 // avoid division by zero
    const percentage = Math.min(100, Math.round((usage / quota) * 100))
    return {
      usage,
      quota,
      percentage,
      usageFormatted: formatBytes(usage),
      quotaFormatted: formatBytes(quota)
    }
  } catch (err) {
    console.error("Failed to estimate storage usage:", err)
    return null
  }
}

export async function checkAvailableStorage(
  requiredBytes: number
): Promise<boolean> {
  const estimate = await getStorageEstimate()
  if (!estimate) {
    return true
  }
  const availableBytes = estimate.quota - estimate.usage
  return availableBytes >= requiredBytes
}

export async function verifyCacheIntegrity(
  cacheName: string,
  expectedFiles: { url: string; size: number }[]
): Promise<boolean> {
  if (typeof window === "undefined" || !("caches" in window)) {
    return true
  }
  try {
    const cache = await window.caches.open(cacheName)
    let allValid = true

    for (const expected of expectedFiles) {
      const response = await cache.match(expected.url)
      if (!response) {
        allValid = false
        continue
      }
      const blob = await response.blob()
      if (blob.size !== expected.size) {
        allValid = false
        await cache.delete(expected.url)
      }
    }
    return allValid
  } catch (err) {
    console.error("Failed to verify cache integrity:", err)
    return false
  }
}

export async function verifyOpfsIntegrity(
  dirName: string,
  expectedFiles: { name: string; size: number }[]
): Promise<boolean> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.getDirectory
  ) {
    return true
  }
  try {
    const root = await navigator.storage.getDirectory()
    let dirHandle: FileSystemDirectoryHandle
    try {
      dirHandle = await root.getDirectoryHandle(dirName, { create: false })
    } catch {
      return false
    }

    let allValid = true
    for (const expected of expectedFiles) {
      try {
        const fileHandle = await dirHandle.getFileHandle(expected.name, {
          create: false
        })
        const file = await fileHandle.getFile()
        if (file.size !== expected.size) {
          allValid = false
          await dirHandle.removeEntry(expected.name)
        }
      } catch {
        allValid = false
      }
    }
    return allValid
  } catch (err) {
    console.error("Failed to verify OPFS integrity:", err)
    return false
  }
}
