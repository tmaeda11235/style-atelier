/* eslint-disable max-lines-per-function */
import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import type { GoogleDriveClient } from "../lib/google-drive"

export function useSettingsGoogleDriveQueries(gdriveClient: GoogleDriveClient) {
  const queryClient = useQueryClient()

  useEffect(() => {
    // Sync React Query cache with actual localStorage values on mount
    queryClient.setQueryData(
      ["gdrive", "syncEnabled"],
      localStorage.getItem("style-atelier-sync-enabled") === "true"
    )
    queryClient.setQueryData(
      ["gdrive", "autoSyncEnabled"],
      localStorage.getItem("style-atelier-auto-sync-enabled") === "true"
    )
    const saved = localStorage.getItem("style-atelier-last-backup")
    queryClient.setQueryData(
      ["gdrive", "lastBackup"],
      saved ? new Date(parseInt(saved)).toLocaleString() : null
    )

    const handleToggle = (e: Event) => {
      const customEvent = e as CustomEvent
      queryClient.setQueryData(
        ["gdrive", "autoSyncEnabled"],
        customEvent.detail
      )
    }
    window.addEventListener("style-atelier-auto-sync-toggled", handleToggle)
    return () => {
      window.removeEventListener(
        "style-atelier-auto-sync-toggled",
        handleToggle
      )
    }
  }, [queryClient])
  const syncEnabledQuery = useQuery({
    queryKey: ["gdrive", "syncEnabled"],
    queryFn: () =>
      localStorage.getItem("style-atelier-sync-enabled") === "true",
    staleTime: Infinity,
    gcTime: Infinity
  })
  const autoSyncEnabledQuery = useQuery({
    queryKey: ["gdrive", "autoSyncEnabled"],
    queryFn: () =>
      localStorage.getItem("style-atelier-auto-sync-enabled") === "true",
    staleTime: Infinity,
    gcTime: Infinity
  })
  const lastBackupQuery = useQuery({
    queryKey: ["gdrive", "lastBackup"],
    queryFn: () => {
      const saved = localStorage.getItem("style-atelier-last-backup")
      return saved ? new Date(parseInt(saved)).toLocaleString() : null
    },
    staleTime: Infinity,
    gcTime: Infinity
  })
  const accessTokenQuery = useQuery({
    queryKey: ["gdrive", "accessToken"],
    queryFn: async () => {
      if (localStorage.getItem("style-atelier-sync-enabled") !== "true")
        return null
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
  return {
    isSyncEnabled: syncEnabledQuery.data ?? false,
    isAutoSyncEnabled: autoSyncEnabledQuery.data ?? false,
    lastBackup: lastBackupQuery.data ?? null,
    accessToken: accessTokenQuery.data ?? null,
    onTokenUpdated: (newToken: string) => {
      queryClient.setQueryData(["gdrive", "accessToken"], newToken)
    }
  }
}

export function useSettingsGoogleDriveBackupMetadata(
  accessToken: string | null,
  isSyncEnabled: boolean,
  gdriveClient: GoogleDriveClient,
  onTokenUpdated: (newToken: string) => void
) {
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
        return { modifiedTime: dateStr, size: `${sizeKB} KB` }
      }
      return null
    },
    enabled: isSyncEnabled && !!accessToken,
    staleTime: 1000 * 60 * 5
  })
  return {
    cloudBackup: cloudBackupQuery.data ?? null,
    isLoadingCloudBackup: cloudBackupQuery.isLoading,
    error: cloudBackupQuery.error
  }
}
