import {
  readBlobFromOpfs,
  saveBase64ToOpfs
} from "../shared/lib/db/migration-helpers"

const webImageCache = new Map<string, string>()

export function isOpfsSupported(): boolean {
  return (
    typeof navigator !== "undefined" &&
    !!navigator.storage &&
    !!navigator.storage.getDirectory
  )
}

export async function resolveWebCardImage(
  cardId: string | undefined,
  thumbnailPath: string | undefined,
  thumbnailData: string | undefined
): Promise<string> {
  const fallback = "./cyber_samurai.png"

  if (!cardId) {
    return thumbnailData || fallback
  }

  const pathKey = thumbnailPath || `images/cards/${cardId}.png`
  const cachedUrl = webImageCache.get(pathKey)
  if (cachedUrl) {
    return cachedUrl
  }

  if (isOpfsSupported()) {
    try {
      const blob = await readBlobFromOpfs(pathKey)
      const objectUrl = URL.createObjectURL(blob)
      webImageCache.set(pathKey, objectUrl)
      return objectUrl
    } catch {
      if (thumbnailData && thumbnailData.startsWith("data:image/")) {
        try {
          await saveBase64ToOpfs(pathKey, thumbnailData)
          const blob = await readBlobFromOpfs(pathKey)
          const objectUrl = URL.createObjectURL(blob)
          webImageCache.set(pathKey, objectUrl)
          return objectUrl
        } catch (saveErr) {
          console.warn(
            "Failed to write/read OPFS image in background:",
            saveErr
          )
        }
      }
    }
  }

  return thumbnailData || fallback
}

export function clearWebImageCache(): void {
  for (const url of webImageCache.values()) {
    URL.revokeObjectURL(url)
  }
  webImageCache.clear()
}
