import { exportDatabase, importDatabase } from "./backup-manager"
import { db } from "./db"
import { purgeDeletedRecords } from "./db/purge-ops"
import {
  authorize,
  downloadBackup,
  getBackupMetadata,
  uploadBackup
} from "./google-drive"

let isInternalChange = false
let debounceTimer: number | null = null
let pollTimer: number | null = null
let lastCheckedRemoteTime: string | null = null

// Default configuration
let debounceMs = 10000 // 10 seconds debounce
let pollIntervalMs = 60000 // 60 seconds polling

export const autoSyncConfig = {
  getDebounceMs: () => debounceMs,
  setDebounceMs: (ms: number) => {
    debounceMs = ms
  },
  getPollIntervalMs: () => pollIntervalMs,
  setPollIntervalMs: (ms: number) => {
    pollIntervalMs = ms
    if (isAutoSyncEnabled()) {
      stopPolling()
      startPolling()
    }
  }
}

if (typeof window !== "undefined") {
  ;(window as any).autoSyncConfig = autoSyncConfig
}

export function setAutoSyncSuspendedByAge(suspended: boolean) {
  if (suspended) {
    localStorage.setItem("style-atelier-auto-sync-suspended-by-age", "true")
  } else {
    localStorage.removeItem("style-atelier-auto-sync-suspended-by-age")
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("style-atelier-auto-sync-suspended-by-age-changed", {
        detail: suspended
      })
    )
  }
}

export function isAutoSyncEnabled(): boolean {
  const syncEnabled =
    localStorage.getItem("style-atelier-sync-enabled") === "true"
  const autoSyncEnabled =
    localStorage.getItem("style-atelier-auto-sync-enabled") === "true"
  return syncEnabled && autoSyncEnabled
}

export function setAutoSyncEnabled(enabled: boolean) {
  localStorage.setItem(
    "style-atelier-auto-sync-enabled",
    enabled ? "true" : "false"
  )
  if (enabled) {
    setAutoSyncSuspendedByAge(false)
  }
  if (typeof window !== "undefined") {
    window.dispatchEvent(
      new CustomEvent("style-atelier-auto-sync-toggled", { detail: enabled })
    )
  }
  if (enabled) {
    startPolling()
  } else {
    stopPolling()
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = null
    }
  }
}

// Trigger auto backup when database changes (debounced)
function triggerAutoBackup() {
  if (isInternalChange || !isAutoSyncEnabled()) return

  if (debounceTimer) {
    clearTimeout(debounceTimer)
  }

  debounceTimer = window.setTimeout(async () => {
    debounceTimer = null
    await performAutoBackup()
  }, debounceMs)
}

// Perform the backup upload silently
async function performAutoBackup() {
  if (!isAutoSyncEnabled()) return

  const lastBackupStr = localStorage.getItem("style-atelier-last-backup")
  const lastBackupTime = lastBackupStr ? parseInt(lastBackupStr, 10) : 0
  const thresholdMs = 60 * 24 * 60 * 60 * 1000 // 60 days

  if (lastBackupTime && Date.now() - lastBackupTime > thresholdMs) {
    console.warn(
      "Auto-sync suspended: last sync was more than 60 days ago. Manual sync required."
    )
    setAutoSyncSuspendedByAge(true)
    setAutoSyncEnabled(false)
    return
  }

  try {
    try {
      const thresholdMs = 60 * 24 * 60 * 60 * 1000 // 60 days
      await purgeDeletedRecords(db, thresholdMs)
    } catch (purgeErr) {
      console.warn(
        "Failed to purge aged deleted records during auto-backup:",
        purgeErr
      )
    }

    const token = await authorize(false) // Silent authentication
    const jsonData = await exportDatabase()
    await uploadBackup(token, jsonData)
    const now = Date.now()
    localStorage.setItem("style-atelier-last-backup", now.toString())
    setAutoSyncSuspendedByAge(false)

    // Retrieve metadata immediately after backup to avoid self-triggered download in next poll
    const meta = await getBackupMetadata(token)
    if (meta) {
      lastCheckedRemoteTime = meta.modifiedTime
    }
    console.log("Auto-backup completed successfully.")
  } catch (err) {
    console.error("Auto-backup failed:", err)
  }
}

// Polling for remote updates
function startPolling() {
  if (pollTimer) return
  pollTimer = window.setInterval(async () => {
    await checkAndMergeRemoteChanges()
  }, pollIntervalMs)
}

function stopPolling() {
  if (pollTimer) {
    clearInterval(pollTimer)
    pollTimer = null
  }
}

function isLastSyncAged(): boolean {
  const lastBackupStr = localStorage.getItem("style-atelier-last-backup")
  const lastBackupTime = lastBackupStr ? parseInt(lastBackupStr, 10) : 0
  const thresholdMs = 60 * 24 * 60 * 60 * 1000 // 60 days
  return !!(lastBackupTime && Date.now() - lastBackupTime > thresholdMs)
}

async function performDatabaseMerge(
  token: string,
  remoteModifiedTime: number,
  modifiedTime: string
) {
  const backupData = await downloadBackup(token)
  if (!backupData) return
  isInternalChange = true
  try {
    await importDatabase(backupData, "merge")
    console.log("Auto-merge completed successfully.")
    localStorage.setItem(
      "style-atelier-last-backup",
      remoteModifiedTime.toString()
    )
    setAutoSyncSuspendedByAge(false)
    lastCheckedRemoteTime = modifiedTime
  } finally {
    isInternalChange = false
  }
}

export async function checkAndMergeRemoteChanges() {
  if (!isAutoSyncEnabled()) return
  if (isLastSyncAged()) {
    console.warn(
      "Auto-sync suspended: last sync was more than 60 days ago. Manual sync required."
    )
    setAutoSyncSuspendedByAge(true)
    setAutoSyncEnabled(false)
    return
  }
  try {
    try {
      const thresholdMs = 60 * 24 * 60 * 60 * 1000 // 60 days
      await purgeDeletedRecords(db, thresholdMs)
    } catch (purgeErr) {
      console.warn(
        "Failed to purge aged deleted records during auto-merge check:",
        purgeErr
      )
    }
    const token = await authorize(false) // Silent authentication
    const meta = await getBackupMetadata(token)
    if (!meta) return

    const remoteModifiedTime = new Date(meta.modifiedTime).getTime()
    const lastBackupStr = localStorage.getItem("style-atelier-last-backup")
    const lastBackupTime = lastBackupStr ? parseInt(lastBackupStr) : 0

    if (
      remoteModifiedTime > lastBackupTime &&
      meta.modifiedTime !== lastCheckedRemoteTime
    ) {
      console.log(
        `Newer remote backup detected: ${meta.modifiedTime}. Starting auto-merge.`
      )
      await performDatabaseMerge(token, remoteModifiedTime, meta.modifiedTime)
    } else {
      lastCheckedRemoteTime = meta.modifiedTime
    }
  } catch (err) {
    console.error("Auto-merge check failed:", err)
  }
}

// Initialize and hook Dexie database
let hooksRegistered = false

export function initializeAutoSync() {
  if (hooksRegistered) return

  const trigger = (transaction: any) => {
    if (transaction && transaction.on) {
      transaction.on("complete", () => {
        triggerAutoBackup()
      })
    }
  }

  db.styleCards.hook("creating", (primKey, obj, transaction) => {
    trigger(transaction)
  })
  db.styleCards.hook("updating", (mods, primKey, obj, transaction) => {
    trigger(transaction)
  })
  db.styleCards.hook("deleting", (primKey, obj, transaction) => {
    trigger(transaction)
  })

  db.categories.hook("creating", (primKey, obj, transaction) => {
    trigger(transaction)
  })
  db.categories.hook("updating", (mods, primKey, obj, transaction) => {
    trigger(transaction)
  })
  db.categories.hook("deleting", (primKey, obj, transaction) => {
    trigger(transaction)
  })

  db.slotHistory.hook("creating", (primKey, obj, transaction) => {
    trigger(transaction)
  })
  db.slotHistory.hook("updating", (mods, primKey, obj, transaction) => {
    trigger(transaction)
  })
  db.slotHistory.hook("deleting", (primKey, obj, transaction) => {
    trigger(transaction)
  })

  hooksRegistered = true

  if (isAutoSyncEnabled()) {
    startPolling()
    checkAndMergeRemoteChanges()
  }
}
