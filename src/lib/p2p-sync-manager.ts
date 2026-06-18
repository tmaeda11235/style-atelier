import { base64ToUint8Array, uint8ArrayToBase64 } from "./binary-utils"
import { db } from "./db"
import type { BackupData } from "./db/import-ops"
import { importBackupData } from "./db/import-ops"
import { computeHash, listOpfsFiles } from "./db/migration-helpers"

async function getCryptoKey(passphrase: string): Promise<CryptoKey> {
  const enc = new TextEncoder()
  const rawKey = enc.encode(passphrase)
  const hash = await crypto.subtle.digest("SHA-256", rawKey)
  return crypto.subtle.importKey("raw", hash, { name: "AES-GCM" }, false, [
    "encrypt",
    "decrypt"
  ])
}

export async function encryptSyncData(
  dataStr: string,
  passphrase: string
): Promise<string> {
  const key = await getCryptoKey(passphrase)
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const enc = new TextEncoder()
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    enc.encode(dataStr)
  )

  const combined = new Uint8Array(iv.length + encrypted.byteLength)
  combined.set(iv, 0)
  combined.set(new Uint8Array(encrypted), iv.length)

  return uint8ArrayToBase64(combined)
}

export async function decryptSyncData(
  encryptedBase64: string,
  passphrase: string
): Promise<string> {
  const key = await getCryptoKey(passphrase)
  const combined = base64ToUint8Array(encryptedBase64)
  if (combined.length < 12) {
    throw new Error("Invalid encrypted data format")
  }
  const iv = combined.slice(0, 12)
  const ciphertext = combined.slice(12)

  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    key,
    ciphertext
  )

  const dec = new TextDecoder()
  return dec.decode(decrypted)
}

export async function mergeIncomingSyncData(
  decryptedDataStr: string
): Promise<{ success: boolean; cardsCount: number; categoriesCount: number }> {
  try {
    const parsed = JSON.parse(decryptedDataStr)
    const styleCards = parsed.styleCards || []
    const categories = parsed.categories || []

    const backupData: BackupData = {
      styleCards,
      categories,
      userSettings: parsed.userSettings || [],
      historyItems: parsed.historyItems || [],
      slotHistory: parsed.slotHistory || {}
    }

    await importBackupData(db, backupData, "merge")

    return {
      success: true,
      cardsCount: styleCards.length,
      categoriesCount: categories.length
    }
  } catch (error) {
    console.error("[P2PSyncManager] failed to merge incoming sync data:", error)
    return {
      success: false,
      cardsCount: 0,
      categoriesCount: 0
    }
  }
}

export async function prepareOutgoingSyncData(): Promise<string> {
  const styleCards = await db.getAllCards()
  const categories = await db.getAllCategories()
  const historyItems = await db.historyItems.toArray()
  const slotHistory = await db.getAllSlotHistory()

  const payload = {
    styleCards,
    categories,
    userSettings: [],
    historyItems,
    slotHistory
  }

  return JSON.stringify(payload)
}

export async function readOpfsFileAsBlob(filePath: string): Promise<Blob> {
  const root = await navigator.storage.getDirectory()
  const parts = filePath.split("/")
  const fileName = parts.pop()
  if (!fileName) {
    throw new Error(`Invalid file path: ${filePath}`)
  }

  let currentDir = root
  for (const part of parts) {
    if (part) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: false })
    }
  }

  const fileHandle = await currentDir.getFileHandle(fileName, { create: false })
  return await fileHandle.getFile()
}

function parseImageIds(
  filePath: string,
  fileName: string
): { cardId?: string; categoryId?: string } {
  let cardId: string | undefined
  let categoryId: string | undefined
  const pathParts = filePath.split("/")
  if (pathParts.length >= 3) {
    const type = pathParts[1]
    const id = fileName.replace(/\.[^/.]+$/, "")
    if (type === "cards") cardId = id
    else if (type === "categories") categoryId = id
  }
  return { cardId, categoryId }
}

async function writeIncomingFile(
  parts: string[],
  fileName: string,
  buffer: ArrayBuffer
): Promise<void> {
  const root = await navigator.storage.getDirectory()
  let currentDir = root
  for (const part of parts) {
    if (part) {
      currentDir = await currentDir.getDirectoryHandle(part, { create: true })
    }
  }

  const tmpFileName = `${fileName}.tmp`
  const tmpFileHandle = await currentDir.getFileHandle(tmpFileName, {
    create: true
  })
  const writable = await tmpFileHandle.createWritable()
  await writable.write(buffer)
  await writable.close()

  try {
    if (typeof (tmpFileHandle as any).move === "function") {
      await (tmpFileHandle as any).move(fileName)
    } else {
      const fileHandle = await currentDir.getFileHandle(fileName, {
        create: true
      })
      const finalWritable = await fileHandle.createWritable()
      await finalWritable.write(buffer)
      await finalWritable.close()
      await currentDir.removeEntry(tmpFileName)
    }
  } catch (err) {
    console.error(
      "[P2PSyncManager] Failed atomic move, falling back to direct write:",
      err
    )
    const fileHandle = await currentDir.getFileHandle(fileName, {
      create: true
    })
    const finalWritable = await fileHandle.createWritable()
    await finalWritable.write(buffer)
    await finalWritable.close()
    try {
      await currentDir.removeEntry(tmpFileName)
    } catch {
      // Ignore cleanup error of tmp file
    }
  }
}

async function updateImageSyncState(
  filePath: string,
  fileName: string,
  hash: string
): Promise<void> {
  const { cardId, categoryId } = parseImageIds(filePath, fileName)
  await db.imageSyncStates.put({
    filePath,
    cardId,
    categoryId,
    hash,
    syncStatus: "synced",
    updatedAt: Date.now()
  })
}

export async function saveIncomingImage(
  filePath: string,
  buffer: ArrayBuffer,
  hash: string
): Promise<void> {
  const parts = filePath.split("/")
  const fileName = parts.pop()
  if (!fileName) {
    throw new Error(`Invalid file path: ${filePath}`)
  }

  await writeIncomingFile(parts, fileName, buffer)
  await updateImageSyncState(filePath, fileName, hash)
}

async function syncSingleLocalFile(
  fileInfo: any,
  existing: any
): Promise<void> {
  const blob = await fileInfo.handle.getFile()
  const arrayBuf = await blob.arrayBuffer()
  const hash = await computeHash(arrayBuf)

  const { cardId, categoryId } = parseImageIds(fileInfo.filePath, fileInfo.name)

  if (!existing) {
    await db.imageSyncStates.put({
      filePath: fileInfo.filePath,
      cardId,
      categoryId,
      hash,
      syncStatus: "pending",
      updatedAt: Date.now()
    })
  } else if (existing.hash !== hash) {
    await db.imageSyncStates.put({
      ...existing,
      hash,
      syncStatus: "pending",
      updatedAt: Date.now()
    })
  }
}

export async function getLocalImagesMetadata(): Promise<
  Array<{ filePath: string; hash: string }>
> {
  const states = await db.imageSyncStates.toArray()
  return states
    .filter((s) => s.syncStatus !== "deleted")
    .map((s) => ({
      filePath: s.filePath,
      hash: s.hash
    }))
}

export async function scanLocalImages(): Promise<void> {
  const root = await navigator.storage.getDirectory()
  let imagesDir: FileSystemDirectoryHandle
  try {
    imagesDir = await root.getDirectoryHandle("images", { create: false })
  } catch {
    return
  }

  const files = await listOpfsFiles(imagesDir, "images")
  const allStates = await db.imageSyncStates.toArray()
  const statesMap = new Map<string, (typeof allStates)[0]>()
  for (const s of allStates) {
    statesMap.set(s.filePath, s)
  }

  const foundPaths = new Set<string>()
  for (const fileInfo of files) {
    foundPaths.add(fileInfo.filePath)
    const existing = statesMap.get(fileInfo.filePath)
    await syncSingleLocalFile(fileInfo, existing)
  }

  for (const state of allStates) {
    if (!foundPaths.has(state.filePath)) {
      if (state.syncStatus === "synced") {
        await db.imageSyncStates.put({
          ...state,
          syncStatus: "deleted",
          updatedAt: Date.now()
        })
      } else if (state.syncStatus === "pending") {
        await db.imageSyncStates.delete(state.filePath)
      }
    }
  }
}
