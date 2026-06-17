/**
 * OPFS (Origin Private File System) Image Storage Utility
 * Provides safe, atomic operations for storing, reading, and deleting style card and category images.
 */

const BASE_DIR = "card-images"

/**
 * Normalizes an image ID or path to produce a clean file name and relative path.
 * Ensures compatibility if a relative path (e.g., "card-images/abc.png") is passed instead of a raw ID.
 */
function getStorageDetails(id: string): {
  fileName: string
  relativePath: string
} {
  let cleanId = id

  // Strip directory prefix if present
  if (cleanId.includes("/")) {
    const parts = cleanId.split("/")
    cleanId = parts[parts.length - 1]
  }

  // Strip common image extensions if present, to enforce .png consistently
  const extensions = [".png", ".jpg", ".jpeg", ".webp", ".gif"]
  for (const ext of extensions) {
    if (cleanId.toLowerCase().endsWith(ext)) {
      cleanId = cleanId.slice(0, -ext.length)
      break
    }
  }

  return {
    fileName: `${cleanId}.png`,
    relativePath: `${BASE_DIR}/${cleanId}.png`
  }
}

/**
 * Commits the temporary file by renaming (moving) it to the final destination,
 * or copying it as a fallback if move is not supported.
 */
async function commitTempFile(
  dirHandle: FileSystemDirectoryHandle,
  tempFileHandle: FileSystemFileHandle,
  tempFileName: string,
  fileName: string
): Promise<void> {
  if (typeof (tempFileHandle as any).move === "function") {
    await (tempFileHandle as any).move(fileName)
  } else {
    // Fallback for environments where FileSystemFileHandle.move is not supported
    const finalFileHandle = await dirHandle.getFileHandle(fileName, {
      create: true
    })
    const finalWritable = await finalFileHandle.createWritable()
    const tempFile = await tempFileHandle.getFile()
    await finalWritable.write(tempFile)
    await finalWritable.close()
    await dirHandle.removeEntry(tempFileName).catch(() => {})
  }
}

/**
 * Clean up writable streams and temporary files in case of error.
 */
async function handleWriteError(
  writable: FileSystemWritableFileStream | null,
  dirHandle: FileSystemDirectoryHandle,
  tempFileName: string,
  error: unknown
): Promise<never> {
  if (writable) {
    try {
      await writable.close()
    } catch {
      // ignore
    }
  }
  try {
    await dirHandle.removeEntry(tempFileName)
  } catch {
    // ignore
  }
  throw error
}

/**
 * Writes an image to the OPFS atomically using a temporary file.
 *
 * @param id - The unique identifier for the image (e.g., cardId or categoryId).
 * @param data - The image binary data.
 * @returns The relative path to the stored image in the OPFS.
 */
export async function writeImageToOpfs(
  id: string,
  data: Blob | ArrayBuffer
): Promise<string> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.getDirectory
  ) {
    throw new Error("OPFS is not supported in this environment")
  }

  const { fileName, relativePath } = getStorageDetails(id)
  const root = await navigator.storage.getDirectory()
  const dirHandle = await root.getDirectoryHandle(BASE_DIR, { create: true })

  const tempFileName = `${fileName}.tmp`
  let writable: FileSystemWritableFileStream | null = null

  try {
    const tempFileHandle = await dirHandle.getFileHandle(tempFileName, {
      create: true
    })
    writable = await tempFileHandle.createWritable()
    await writable.write(data)
    await writable.close()
    writable = null

    await commitTempFile(dirHandle, tempFileHandle, tempFileName, fileName)
    return relativePath
  } catch (error) {
    return await handleWriteError(writable, dirHandle, tempFileName, error)
  }
}

/**
 * Reads an image from the OPFS.
 *
 * @param id - The unique identifier or relative path for the image.
 * @returns The image binary data as a Blob.
 */
export async function readImageFromOpfs(id: string): Promise<Blob> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.getDirectory
  ) {
    throw new Error("OPFS is not supported in this environment")
  }

  const { fileName } = getStorageDetails(id)
  const root = await navigator.storage.getDirectory()
  const dirHandle = await root.getDirectoryHandle(BASE_DIR, { create: false })
  const fileHandle = await dirHandle.getFileHandle(fileName, { create: false })
  return await fileHandle.getFile()
}

/**
 * Deletes an image from the OPFS.
 * This operation is idempotent and will not throw an error if the file or directory does not exist.
 *
 * @param id - The unique identifier or relative path for the image.
 */
export async function deleteImageFromOpfs(id: string): Promise<void> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.getDirectory
  ) {
    throw new Error("OPFS is not supported in this environment")
  }

  const { fileName } = getStorageDetails(id)
  const root = await navigator.storage.getDirectory()
  try {
    const dirHandle = await root.getDirectoryHandle(BASE_DIR, { create: false })
    await dirHandle.removeEntry(fileName)
  } catch (error: any) {
    // Ignore NotFoundError to maintain idempotency
    if (error.name === "NotFoundError") {
      return
    }
    throw error
  }
}
