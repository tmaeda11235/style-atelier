import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
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
  const queryClient = useQueryClient()

  const [isSyncEnabled, setIsSyncEnabled] = useState(false)
  const [isAutoSyncEnabled, setIsAutoSyncEnabled] = useState(false)
  const [accessToken, setAccessToken] = useState<string | null>(null)
  const [lastBackup, setLastBackup] = useState<string | null>(null)
  const [syncProgress, setSyncProgress] = useState<number | null>(null)
  const [restoreProgress, setRestoreProgress] = useState<number | null>(null)

  const [statusMessage, setStatusMessage] = useState<{
    text: string
    type: "success" | "error" | "info" | null
  }>({
    text: "",
    type: null
  })

  // Google Drive backup metadata Query
  const cloudBackupQuery = useQuery({
    queryKey: ["gdriveBackupMetadata", accessToken],
    queryFn: async () => {
      if (!accessToken) return null
      const meta = await getBackupMetadata(accessToken, setAccessToken)
      if (meta) {
        const dateStr = new Date(meta.modifiedTime).toLocaleString()
        const sizeKB = (parseInt(meta.size) / 1024).toFixed(1)
        return {
          modifiedTime: dateStr,
          size: `${sizeKB} KB`
        }
      }
      return null
    },
    enabled: isSyncEnabled && !!accessToken,
    staleTime: 1000 * 60 * 5 // 5 minutes
  })

  const cloudBackup = cloudBackupQuery.data ?? null
  const isLoadingCloudBackup = cloudBackupQuery.isLoading

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
      // Silently authorize
      authorize(false)
        .then((token) => {
          setAccessToken(token)
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
      queryClient.setQueryData(["gdriveBackupMetadata", accessToken], null)
      setIsAutoSyncEnabled(false)
      setAutoSyncEnabled(false)
    } else {
      try {
        const token = await authorize(true)
        setAccessToken(token)
      } catch (err: any) {
        console.error(err)
        addLog(`Sync authorization failed: ${err.message || err}`)
        showStatus(
          `Authorization failed: ${err.message || "Unknown error"}`,
          "error"
        )
        setIsSyncEnabled(false)
        localStorage.setItem("style-atelier-sync-enabled", "false")
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

  // Google Drive synchronization Mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      if (!isSyncEnabled) return

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
          addLog(
            "No existing backup found. Uploading local data as new backup."
          )
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
        throw err
      } finally {
        abortControllerRef.current = null
        setSyncProgress(null)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["gdriveBackupMetadata", accessToken]
      })
    }
  })

  // Google Drive restore Mutation
  const restoreMutation = useMutation({
    mutationFn: async () => {
      if (!isSyncEnabled || syncMutation.isPending || restoreMutation.isPending)
        return

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
        } else {
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
        throw err
      } finally {
        abortControllerRef.current = null
        setRestoreProgress(null)
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["gdriveBackupMetadata", accessToken]
      })
    }
  })

  const handleSync = () => {
    syncMutation.mutate()
  }

  const handleForceRecovery = () => {
    restoreMutation.mutate()
  }

  return {
    isSyncEnabled,
    isAutoSyncEnabled,
    accessToken,
    isSyncing: syncMutation.isPending,
    isRestoring: restoreMutation.isPending,
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
