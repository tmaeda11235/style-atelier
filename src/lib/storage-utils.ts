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
  if (typeof caches === "undefined") {
    return true
  }
  try {
    const cache = await caches.open(cacheName)
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

async function getFileHandleAndSize(
  dirHandle: FileSystemDirectoryHandle,
  fileName: string
): Promise<{ fileHandle: FileSystemFileHandle; currentSize: number }> {
  try {
    const fileHandle = await dirHandle.getFileHandle(fileName, {
      create: false
    })
    const file = await fileHandle.getFile()
    return { fileHandle, currentSize: file.size }
  } catch {
    const fileHandle = await dirHandle.getFileHandle(fileName, { create: true })
    return { fileHandle, currentSize: 0 }
  }
}

async function fetchWithRange(
  downloadUrl: string,
  currentSize: number
): Promise<Response> {
  const headers = new Headers()
  if (currentSize > 0) {
    headers.set("Range", `bytes=${currentSize}-`)
  }
  const response = await fetch(downloadUrl, { headers })
  if (!response.ok) {
    throw new Error(
      `Failed to fetch model: ${response.status} ${response.statusText}`
    )
  }
  return response
}

function calculateSpeedAndEta(
  downloadedBytes: number,
  currentSize: number,
  expectedSize: number,
  elapsedTotalMs: number,
  isRange: boolean
): { speed: number; eta: number } {
  if (elapsedTotalMs <= 500) {
    return { speed: 0, eta: 0 }
  }
  const speedBps =
    (downloadedBytes - (isRange ? currentSize : 0)) / (elapsedTotalMs / 1000)
  const speed = Number((speedBps / (1024 * 1024)).toFixed(1))
  let eta = 0
  if (speed > 0) {
    const remainingBytes = expectedSize - downloadedBytes
    eta = Math.max(0, Math.round(remainingBytes / speedBps))
  }
  return { speed, eta }
}

async function writeResponseToStream(
  writable: FileSystemWritableFileStream,
  response: Response,
  currentSize: number,
  expectedSize: number,
  isRange: boolean,
  onProgress?: (progress: number, speed: number, eta: number) => void
): Promise<void> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error("Response body is not readable")
  }

  let downloadedBytes = isRange ? currentSize : 0
  const startTime = Date.now()
  let lastProgressTime = startTime

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      await writable.write(value)
      downloadedBytes += value.byteLength

      const now = Date.now()
      const elapsedTotalMs = now - startTime
      const progress = Math.min(
        100,
        Math.round((downloadedBytes / expectedSize) * 100)
      )

      if (now - lastProgressTime > 500 || progress === 100) {
        const { speed, eta } = calculateSpeedAndEta(
          downloadedBytes,
          currentSize,
          expectedSize,
          elapsedTotalMs,
          isRange
        )

        if (onProgress) {
          onProgress(progress, speed, eta)
        }

        lastProgressTime = now
      }
    }
  } finally {
    await writable.close()
  }
}

export async function downloadFileWithResume(
  dirName: string,
  fileName: string,
  downloadUrl: string,
  expectedSize: number,
  onProgress?: (progress: number, speed: number, eta: number) => void
): Promise<void> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.getDirectory
  ) {
    throw new Error("OPFS is not supported in this environment")
  }

  const root = await navigator.storage.getDirectory()
  const dirHandle = await root.getDirectoryHandle(dirName, { create: true })

  let { fileHandle, currentSize } = await getFileHandleAndSize(
    dirHandle,
    fileName
  )

  if (currentSize === expectedSize) {
    if (onProgress) {
      onProgress(100, 0, 0)
    }
    return
  }

  if (currentSize > expectedSize) {
    await dirHandle.removeEntry(fileName)
    const recreated = await getFileHandleAndSize(dirHandle, fileName)
    fileHandle = recreated.fileHandle
    currentSize = recreated.currentSize
  }

  const response = await fetchWithRange(downloadUrl, currentSize)
  const isRange = response.status === 206
  const writable = await fileHandle.createWritable({
    keepExistingData: isRange
  })

  if (isRange) {
    await writable.seek(currentSize)
  }

  await writeResponseToStream(
    writable,
    response,
    currentSize,
    expectedSize,
    isRange,
    onProgress
  )
}
