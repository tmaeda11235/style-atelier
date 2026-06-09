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
