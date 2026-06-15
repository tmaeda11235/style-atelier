/**
 * Decodes base64 string (including data URL format) into a Blob.
 */
export function decodeBase64(base64Data: string): Blob {
  try {
    const parts = base64Data.split(",")
    const mimeMatch = parts[0].match(/:(.*?);/)
    const mime = mimeMatch ? mimeMatch[1] : "image/png"
    const b64 = parts[1] || parts[0]
    const binaryStr = atob(b64)
    const len = binaryStr.length
    const bytes = new Uint8Array(len)
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryStr.charCodeAt(i)
    }
    return new Blob([bytes], { type: mime })
  } catch (err) {
    throw new Error(`Failed to decode base64 data: ${(err as Error).message}`)
  }
}

/**
 * Resolves directory handles recursively from a root handle.
 */
async function resolveDirectory(
  root: FileSystemDirectoryHandle,
  pathParts: string[]
): Promise<FileSystemDirectoryHandle> {
  let currentDir = root
  for (const part of pathParts) {
    if (part) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true })
    }
  }
  return currentDir
}

/**
 * Helper to save base64 data to OPFS at a specified path.
 */
export async function saveBase64ToOpfs(
  filePath: string,
  base64Data: string
): Promise<void> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.getDirectory
  ) {
    throw new Error("OPFS is not supported in this environment")
  }

  const blob = decodeBase64(base64Data)
  const root = await navigator.storage.getDirectory()

  const pathParts = filePath.split("/")
  const fileName = pathParts.pop()
  if (!fileName) {
    throw new Error(`Invalid file path: ${filePath}`)
  }

  const targetDir = await resolveDirectory(root, pathParts)
  let writable: FileSystemWritableFileStream | null = null

  try {
    const fileHandle = await targetDir.getFileHandle(fileName, { create: true })
    writable = await fileHandle.createWritable()
    await writable.write(blob)
    await writable.close()
  } catch (err) {
    if (writable) {
      try {
        await writable.close()
      } catch {
        // Ignore secondary error during close
      }
    }
    try {
      await targetDir.removeEntry(fileName)
    } catch {
      // Ignore secondary error during cleanup
    }
    throw err
  }
}

/**
 * Helper to delete a file from OPFS.
 */
export async function deleteOpfsFile(filePath: string): Promise<void> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.getDirectory
  ) {
    return
  }
  const root = await navigator.storage.getDirectory()
  const pathParts = filePath.split("/")
  const fileName = pathParts.pop()
  if (!fileName) return

  let currentDir = root
  for (const part of pathParts) {
    if (part) {
      try {
        currentDir = await currentDir.getDirectoryHandle(part, {
          create: false
        })
      } catch {
        return
      }
    }
  }

  try {
    await currentDir.removeEntry(fileName)
  } catch (err) {
    if ((err as Error).name !== "NotFoundError") {
      throw err
    }
  }
}

/**
 * Helper to read a Blob from OPFS.
 */
export async function readBlobFromOpfs(filePath: string): Promise<Blob> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.getDirectory
  ) {
    throw new Error("OPFS is not supported in this environment")
  }

  const root = await navigator.storage.getDirectory()
  const pathParts = filePath.split("/")
  const fileName = pathParts.pop()
  if (!fileName) {
    throw new Error(`Invalid file path: ${filePath}`)
  }

  let currentDir = root
  for (const part of pathParts) {
    if (part) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: false })
    }
  }

  const fileHandle = await currentDir.getFileHandle(fileName, { create: false })
  const file = await fileHandle.getFile()
  return file
}
