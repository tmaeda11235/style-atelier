import { base64ToUint8Array, uint8ArrayToBase64 } from "./binary-utils"
import { db } from "./db"
import type { BackupData } from "./db/import-ops"
import { importBackupData } from "./db/import-ops"

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
