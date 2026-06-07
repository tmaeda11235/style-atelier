import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect, useRef, useState } from "react"

import { useConfirm } from "../contexts/ConfirmContext"
import { useLanguage } from "../contexts/LanguageContext"
import { setAutoSyncEnabled } from "../lib/auto-sync"
import { exportDatabase, importDatabase } from "../lib/backup-manager"
import {
  defaultGoogleDriveClient,
  GDriveTimeoutError,
  type GoogleDriveClient
} from "../lib/google-drive"

interface UseSettingsGoogleDriveProps {
  addLog: (log: string) => void
  checkStorage: () => void
  gdriveClient?: GoogleDriveClient
}

export function useSettingsGoogleDrive({
  addLog,
  checkStorage,
  gdriveClient = defaultGoogleDriveClient
}: UseSettingsGoogleDriveProps) {
  const abortControllerRef = useRef<AbortController | null>(null)
  const confirm = useConfirm()
  const { t: i18n } = useLanguage()
  const t = i18n.settings
  const queryClient = useQueryClient()

  // React Query managed settings and tokens
  const syncEnabledQuery = useQuery({
    queryKey: ["gdrive", "syncEnabled"],
    queryFn: () =>
      localStorage.getItem("style-atelier-sync-enabled") === "true",
    staleTime: Infinity,
    gcTime: Infinity
  })
  const isSyncEnabled = syncEnabledQuery.data ?? false

  const autoSyncEnabledQuery = useQuery({
    queryKey: ["gdrive", "autoSyncEnabled"],
    queryFn: () =>
      localStorage.getItem("style-atelier-auto-sync-enabled") === "true",
    staleTime: Infinity,
    gcTime: Infinity
  })
  const isAutoSyncEnabled = autoSyncEnabledQuery.data ?? false

  const lastBackupQuery = useQuery({
    queryKey: ["gdrive", "lastBackup"],
    queryFn: () => {
      const saved = localStorage.getItem("style-atelier-last-backup")
      return saved ? new Date(parseInt(saved)).toLocaleString() : null
    },
    staleTime: Infinity,
    gcTime: Infinity
  })
  const lastBackup = lastBackupQuery.data ?? null

  const accessTokenQuery = useQuery({
    queryKey: ["gdrive", "accessToken"],
    queryFn: async () => {
      const enabled =
        localStorage.getItem("style-atelier-sync-enabled") === "true"
      if (!enabled) return null
      try {
        return await gdriveClient.authorize(false)
      } catch (err: any) {
        console.log("Silent authorization failed:", err.message)
        return null
      }
    },
    staleTime: Infinity,
    gcTime: Infinity
  })
  const accessToken = accessTokenQuery.data ?? null

  const onTokenUpdated = (newToken: string) => {
    queryClient.setQueryData(["gdrive", "accessToken"], newToken)
  }

  // Temporary UI progress states
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
      const meta = await gdriveClient.getBackupMetadata(
        accessToken,
        onTokenUpdated
      )
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

  const toggleSyncMutation = useMutation({
    mutationFn: async (checked: boolean) => {
      localStorage.setItem(
        "style-atelier-sync-enabled",
        checked ? "true" : "false"
      )
      addLog(
        `Google Drive synchronization: ${checked ? "ENABLED" : "DISABLED"}`
      )

      if (!checked) {
        if (accessToken) {
          await gdriveClient.clearCachedToken(accessToken).catch(console.error)
        }
        return { checked, token: null }
      } else {
        try {
          const token = await gdriveClient.authorize(true)
          return { checked, token }
        } catch (err: any) {
          console.error(err)
          addLog(`Sync authorization failed: ${err.message || err}`)
          showStatus(
            `Authorization failed: ${err.message || "Unknown error"}`,
            "error"
          )
          localStorage.setItem("style-atelier-sync-enabled", "false")
          throw err
        }
      }
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["gdrive", "syncEnabled"], data.checked)
      queryClient.setQueryData(["gdrive", "accessToken"], data.token)
      if (!data.checked) {
        queryClient.setQueryData(["gdriveBackupMetadata", null], null)
        queryClient.setQueryData(["gdrive", "autoSyncEnabled"], false)
        setAutoSyncEnabled(false)
      }
    },
    onError: () => {
      queryClient.setQueryData(["gdrive", "syncEnabled"], false)
      queryClient.setQueryData(["gdrive", "accessToken"], null)
    }
  })

  const handleToggleSync = (checked: boolean) => {
    toggleSyncMutation.mutate(checked)
  }

  const toggleAutoSyncMutation = useMutation({
    mutationFn: async (checked: boolean) => {
      localStorage.setItem(
        "style-atelier-auto-sync-enabled",
        checked ? "true" : "false"
      )
      setAutoSyncEnabled(checked)
      addLog(`Google Drive auto-sync: ${checked ? "ENABLED" : "DISABLED"}`)
      return checked
    },
    onSuccess: (checked) => {
      queryClient.setQueryData(["gdrive", "autoSyncEnabled"], checked)
    }
  })

  const handleToggleAutoSync = (checked: boolean) => {
    toggleAutoSyncMutation.mutate(checked)
  }

  const getOrRequestToken = async (): Promise<string> => {
    if (accessToken) return accessToken
    const token = await gdriveClient.authorize(true)
    queryClient.setQueryData(["gdrive", "accessToken"], token)
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
        const backupData = await gdriveClient.downloadBackup(
          token,
          onTokenUpdated,
          (percent) => {
            setSyncProgress(Math.round(percent * 0.5))
            setStatusMessage({
              text: `${t.syncingProgress} (${percent}%)...`,
              type: "info"
            })
          },
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
        await gdriveClient.uploadBackup(
          token,
          jsonData,
          onTokenUpdated,
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
        queryClient.setQueryData(
          ["gdrive", "lastBackup"],
          new Date(now).toLocaleString()
        )

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
          await gdriveClient.clearCachedToken(accessToken).catch(console.error)
          queryClient.setQueryData(["gdrive", "accessToken"], null)
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

        const meta = await gdriveClient.getBackupMetadata(
          token,
          onTokenUpdated,
          {
            signal: controller.signal
          }
        )
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

        const backupData = await gdriveClient.downloadBackup(
          token,
          onTokenUpdated,
          (percent) => {
            setRestoreProgress(percent)
            setStatusMessage({
              text: `${t.restoreProgress} (${percent}%)...`,
              type: "info"
            })
          },
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
          await gdriveClient.clearCachedToken(accessToken).catch(console.error)
          queryClient.setQueryData(["gdrive", "accessToken"], null)
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
