import { useEffect, useRef, useState } from "react"

import { useConfirm } from "../contexts/ConfirmContext"
import { useLanguage } from "../contexts/LanguageContext"
import { setAutoSyncEnabled } from "../lib/auto-sync"
import { exportDatabase, importDatabase } from "../lib/backup-manager"
import {
  authorize,
  clearCachedToken,
  downloadBackup,
  GDriveTimeoutError,
  getBackupMetadata,
  uploadBackup
} from "../lib/google-drive"

interface UseSettingsGoogleDriveProps {
  addLog: (log: string) => void
  checkStorage: () => void
}

export function useSettingsGoogleDrive({
  addLog,
  checkStorage
}: UseSettingsGoogleDriveProps) {
  const abortControllerRef = useRef<AbortController | null>(null)
  const confirm = useConfirm()
  const { t: i18n } = useLanguage()
  const t = i18n.settings

  const [isSyncEnabled, setIsSyncEnabled] = useState(false)
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [cloudBackup, setCloudBackup] = useState<{
    modifiedTime: string
    size: string
  } | null>(null)
  const [isLoadingCloudBackup, setIsLoadingCloudBackup] = useState(false)
  const [syncProgress, setSyncProgress] = useState<number | null>(null)
  const [restoreProgress, setRestoreProgress] = useState<number | null>(null)

  const [statusMessage, setStatusMessage] = useState<{
    text: string
    type: "success" | "error" | "info" | null
  }>({
    text: "",
    type: null
  })

  useEffect(() => {
    // Load last backup time
    const savedLastBackup = localStorage.getItem("style-atelier-last-backup")
    if (savedLastBackup) {
      setLastBackup(new Date(parseInt(savedLastBackup)).toLocaleString())
    }

    // Load sync enabled state
    const savedSyncEnabled =
      localStorage.getItem("style-atelier-sync-enabled") === "true"
    setIsSyncEnabled(savedSyncEnabled)

    // Load auto sync enabled state
    const savedAutoSyncEnabled =
      localStorage.getItem("style-atelier-auto-sync-enabled") === "true"
    setIsAutoSyncEnabled(savedAutoSyncEnabled)

    if (savedSyncEnabled) {
      // Silently authorize and get backup metadata
      authorize(false)
        .then((token) => {
          setAccessToken(token)
          setIsLoadingCloudBackup(true)
          getBackupMetadata(token, setAccessToken)
            .then((meta) => {
              if (meta) {
                const dateStr = new Date(meta.modifiedTime).toLocaleString()
                const sizeKB = (parseInt(meta.size) / 1024).toFixed(1)
                setCloudBackup({
                  modifiedTime: dateStr,
                  size: `${sizeKB} KB`
                })
              } else {
                setCloudBackup(null)
              }
            })
            .catch((err) => console.error(err))
            .finally(() => setIsLoadingCloudBackup(false))
        })
        .catch((err) => {
          console.log("Silent authorization failed:", err.message)
        })
    }

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort()
      }
    }
  }, [])

  const showStatus = (text: string, type: "success" | "error" | "info") => {
    setStatusMessage({ text, type })
    setTimeout(() => {
      setStatusMessage({ text: "", type: null })
    }, 6000)
  }

  const handleCancelSync = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
  }

  const handleToggleSync = async (checked: boolean) => {
    setIsSyncEnabled(checked)
    localStorage.setItem(
      "style-atelier-sync-enabled",
      checked ? "true" : "false"
    )
    addLog(`Google Drive synchronization: ${checked ? "ENABLED" : "DISABLED"}`)

    if (!checked) {
      if (accessToken) {
        clearCachedToken(accessToken).catch(console.error)
      }
      setAccessToken(null)
      setCloudBackup(null)
      setIsAutoSyncEnabled(false)
      setAutoSyncEnabled(false)
    } else {
      try {
        const token = await authorize(true)
        setAccessToken(token)
        setIsLoadingCloudBackup(true)
        const meta = await getBackupMetadata(token, setAccessToken)
        if (meta) {
          const dateStr = new Date(meta.modifiedTime).toLocaleString()
          const sizeKB = (parseInt(meta.size) / 1024).toFixed(1)
          setCloudBackup({
            modifiedTime: dateStr,
            size: `${sizeKB} KB`
          })
        } else {
          setCloudBackup(null)
        }
      } catch (err: any) {
        console.error(err)
        addLog(`Sync authorization failed: ${err.message || err}`)
        showStatus(
          `Authorization failed: ${err.message || "Unknown error"}`,
          "error"
        )
        setIsSyncEnabled(false)
        localStorage.setItem("style-atelier-sync-enabled", "false")
      } finally {
        setIsLoadingCloudBackup(false)
      }
    }
  }

  const handleToggleAutoSync = (checked: boolean) => {
    setIsAutoSyncEnabled(checked)
    setAutoSyncEnabled(checked)
    addLog(`Google Drive auto-sync: ${checked ? "ENABLED" : "DISABLED"}`)
  }

  const getOrRequestToken = async (): Promise<string> => {
    if (accessToken) return accessToken
    const token = await authorize(true)
    setAccessToken(token)
    return token
  }

  const handleSync = async () => {
    if (!isSyncEnabled) return

    setIsSyncing(true)
    setSyncProgress(0)
    setStatusMessage({ text: t.syncingStart, type: "info" })

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const token = await getOrRequestToken()

      setStatusMessage({ text: t.syncingFetch, type: "info" })
      const backupData = await downloadBackup(
        token,
        setAccessToken,
        (percent) => {
          setSyncProgress(Math.round(percent * 0.5))
          setStatusMessage({
            text: `${t.syncingProgress} (${percent}%)...`,
            type: "info"
          })
        },
        undefined,
        { signal: controller.signal }
      )

      if (backupData) {
        setStatusMessage({ text: t.syncingMerge, type: "info" })
        await importDatabase(backupData, "merge")
      } else {
        addLog("No existing backup found. Uploading local data as new backup.")
      }

      setStatusMessage({ text: t.syncingPrepare, type: "info" })
      const jsonData = await exportDatabase()

      setStatusMessage({ text: `${t.syncingText} (50%)...`, type: "info" })
      await uploadBackup(
        token,
        jsonData,
        setAccessToken,
        (percent) => {
          setSyncProgress(50 + Math.round(percent * 0.5))
          setStatusMessage({
            text: `${t.syncingUpload} (${percent}%)...`,
            type: "info"
          })
        },
        { signal: controller.signal }
      )

      const now = Date.now()
      localStorage.setItem("style-atelier-last-backup", now.toString())
      setLastBackup(new Date(now).toLocaleString())

      const meta = await getBackupMetadata(token, setAccessToken, undefined, {
        signal: controller.signal
      })
      if (meta) {
        const dateStr = new Date(meta.modifiedTime).toLocaleString()
        const sizeKB = (parseInt(meta.size) / 1024).toFixed(1)
        setCloudBackup({
          modifiedTime: dateStr,
          size: `${sizeKB} KB`
        })
      }

      addLog("Google Drive synchronization completed successfully.")
      showStatus(t.syncSuccess, "success")
      checkStorage()
    } catch (err: any) {
      if (err.name === "AbortError") {
        addLog("Sync cancelled by user.")
        showStatus(t.syncCancelled, "info")
      } else if (err instanceof GDriveTimeoutError) {
        addLog("Sync failed: Connection timed out.")
        showStatus(t.syncTimeout, "error")
      } else {
        console.error(err)
        addLog(`Sync failed: ${err.message || err}`)
        showStatus(
          `${t.syncFailed}: ${err.message || "Unknown error"}`,
          "error"
        )
      }

      if (err.name !== "AbortError" && accessToken) {
        await clearCachedToken(accessToken).catch(console.error)
        setAccessToken(null)
      }
    } finally {
      setIsSyncing(false)
      abortControllerRef.current = null
      setSyncProgress(null)
    }
  }

  const handleForceRecovery = async () => {
    if (!isSyncEnabled || isSyncing || isRestoring) return

    setIsRestoring(true)
    setStatusMessage({ text: t.loadingCloudBackup, type: "info" })

    const controller = new AbortController()
    abortControllerRef.current = controller

    try {
      const token = await getOrRequestToken()

      const meta = await getBackupMetadata(token, setAccessToken, undefined, {
        signal: controller.signal
      })
      let currentBackup = cloudBackup
      if (meta) {
        const dateStr = new Date(meta.modifiedTime).toLocaleString()
        const sizeKB = (parseInt(meta.size) / 1024).toFixed(1)
        currentBackup = {
          modifiedTime: dateStr,
          size: `${sizeKB} KB`
        }
        setCloudBackup(currentBackup)
      } else {
        setCloudBackup(null)
        currentBackup = null
      }

      let confirmMsg = t.restoreConfirmMsg
      if (currentBackup) {
        confirmMsg += `\n\n${t.restoreConfirmHeader}\n${t.restoreConfirmTime}${currentBackup.modifiedTime}\n${t.restoreConfirmSize}${currentBackup.size}`
      }

      setStatusMessage({ text: "", type: null })
      const ok = await confirm({
        title: t.confirmTitle,
        message: confirmMsg,
        confirmText: t.confirmBtn,
        cancelText: t.cancelBtn,
        variant: "danger"
      })
      if (!ok) return

      setRestoreProgress(0)
      setStatusMessage({ text: `${t.restoreLoading} (0%)...`, type: "info" })

      const backupData = await downloadBackup(
        token,
        setAccessToken,
        (percent) => {
          setRestoreProgress(percent)
          setStatusMessage({
            text: `${t.restoreProgress} (${percent}%)...`,
            type: "info"
          })
        },
        undefined,
        { signal: controller.signal }
      )
      if (!backupData) {
        showStatus(t.noCloudBackup, "error")
        addLog("Force recovery failed: Backup file not found.")
        return
      }

      await importDatabase(backupData, "replace")
      addLog("Database recovered from Google Drive successfully.")
      showStatus(t.restoreSuccess, "success")
      checkStorage()
    } catch (err: any) {
      if (err.name === "AbortError") {
        addLog("Force recovery cancelled by user.")
        showStatus(t.restoreCancelled, "info")
      } else if (err instanceof GDriveTimeoutError) {
        addLog("Force recovery failed: Connection timed out.")
        showStatus(t.syncTimeout, "error")
      } else {
        console.error(err)
        addLog(`Force recovery failed: ${err.message || err}`)
        showStatus(
          `${t.restoreFailed}: ${err.message || "Unknown error"}`,
          "error"
        )
      }

      if (err.name !== "AbortError" && accessToken) {
        await clearCachedToken(accessToken).catch(console.error)
        setAccessToken(null)
      }
    } finally {
      setIsRestoring(false)
      abortControllerRef.current = null
      setRestoreProgress(null)
    }
  }

  return {
    isSyncEnabled,
    isAutoSyncEnabled,
    accessToken,
    isSyncing,
    isRestoring,
    lastBackup,
    cloudBackup,
    isLoadingCloudBackup,
    syncProgress,
    restoreProgress,
    statusMessage,
    showStatus,
    handleCancelSync,
    handleToggleSync,
    handleToggleAutoSync,
    handleSync,
    handleForceRecovery
  }
}
