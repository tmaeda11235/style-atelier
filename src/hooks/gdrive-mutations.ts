import { useMutation, useQueryClient } from "@tanstack/react-query"

import { setAutoSyncEnabled } from "../lib/auto-sync"
import type { GoogleDriveClient } from "../lib/google-drive"
import {
  executeRestoreWorkflow,
  executeSyncWorkflow,
  handleRestoreError,
  handleSyncError,
  promptRestoreConfirmation,
  type GDriveProgressTracker
} from "../lib/google-drive-sync-helpers"

export async function executeToggleSyncMutationFn(
  checked: boolean,
  params: {
    accessToken: string | null
    gdriveClient: GoogleDriveClient
    addLog: (log: string) => void
    progress: GDriveProgressTracker
  }
) {
  const { accessToken, gdriveClient, addLog, progress } = params
  localStorage.setItem("style-atelier-sync-enabled", checked ? "true" : "false")
  addLog(`Google Drive synchronization: ${checked ? "ENABLED" : "DISABLED"}`)
  if (!checked) {
    if (accessToken) {
      await gdriveClient.clearCachedToken(accessToken).catch(console.error)
    }
    return { checked, token: null }
  }
  try {
    const token = await gdriveClient.authorize(true)
    return { checked, token }
  } catch (err: any) {
    addLog(`Sync authorization failed: ${err.message || err}`)
    progress.showStatus(
      `Authorization failed: ${err.message || "Unknown error"}`,
      "error"
    )
    localStorage.setItem("style-atelier-sync-enabled", "false")
    throw err
  }
}

export function useToggleSyncMutation(params: {
  accessToken: string | null
  gdriveClient: GoogleDriveClient
  addLog: (log: string) => void
  progress: GDriveProgressTracker
}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (checked: boolean) =>
      executeToggleSyncMutationFn(checked, params),
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
}

export function useToggleAutoSyncMutation(params: {
  addLog: (log: string) => void
}) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (checked: boolean) => {
      localStorage.setItem(
        "style-atelier-auto-sync-enabled",
        checked ? "true" : "false"
      )
      setAutoSyncEnabled(checked)
      params.addLog(
        `Google Drive auto-sync: ${checked ? "ENABLED" : "DISABLED"}`
      )
      return checked
    },
    onSuccess: (checked) => {
      queryClient.setQueryData(["gdrive", "autoSyncEnabled"], checked)
    }
  })
}

export interface SyncMutationParams {
  isSyncEnabled: boolean
  accessToken: string | null
  gdriveClient: GoogleDriveClient
  onTokenUpdated: (newToken: string) => void
  progress: GDriveProgressTracker
  t: any
  abortControllerRef: React.MutableRefObject<AbortController | null>
  addLog: (log: string) => void
  checkStorage: () => void
  getOrRequestToken: () => Promise<string>
  queryClient?: any
}

async function performSync(
  params: SyncMutationParams & {
    mergeStrategy?: "merge" | "local-overwrite" | "cloud-overwrite"
  },
  controller: AbortController
) {
  const token = await params.getOrRequestToken()
  params.progress.setStatusMessage({
    text: params.t.syncingFetch,
    type: "info"
  })
  await executeSyncWorkflow({
    token,
    gdriveClient: params.gdriveClient,
    onTokenUpdated: params.onTokenUpdated,
    progress: params.progress,
    t: params.t,
    signal: controller.signal,
    addLog: params.addLog,
    checkStorage: params.checkStorage,
    queryClient: params.queryClient,
    mergeStrategy: params.mergeStrategy
  })
}

export async function executeSyncMutationFn(
  params: SyncMutationParams & {
    mergeStrategy?: "merge" | "local-overwrite" | "cloud-overwrite"
  }
) {
  const { isSyncEnabled, progress, t, abortControllerRef } = params
  if (!isSyncEnabled) return
  progress.setSyncProgress(0)
  progress.setStatusMessage({ text: t.syncingStart, type: "info" })
  const controller = new AbortController()
  abortControllerRef.current = controller
  try {
    await performSync(params, controller)
  } catch (err: any) {
    await handleSyncError({
      err,
      accessToken: params.accessToken,
      gdriveClient: params.gdriveClient,
      addLog: params.addLog,
      progress,
      t,
      queryClient: params.queryClient
    })
    throw err
  } finally {
    abortControllerRef.current = null
    progress.setSyncProgress(null)
  }
}

export function useSyncMutation(
  params: Omit<SyncMutationParams, "queryClient">
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (
      mergeStrategy?: "merge" | "local-overwrite" | "cloud-overwrite"
    ) => executeSyncMutationFn({ ...params, queryClient, mergeStrategy }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["gdriveBackupMetadata", params.accessToken]
      })
    }
  })
}

export interface RestoreMutationParams {
  isSyncEnabled: boolean
  accessToken: string | null
  gdriveClient: GoogleDriveClient
  onTokenUpdated: (newToken: string) => void
  cloudBackup: { modifiedTime: string; size: string } | null
  progress: GDriveProgressTracker
  confirm: any
  t: any
  abortControllerRef: React.MutableRefObject<AbortController | null>
  addLog: (log: string) => void
  checkStorage: () => void
  getOrRequestToken: () => Promise<string>
  isSyncPending: boolean
  queryClient?: any
}

export async function performRestoreWorkflow(
  params: RestoreMutationParams & { token: string; signal: AbortSignal }
) {
  const ok = await promptRestoreConfirmation({
    token: params.token,
    gdriveClient: params.gdriveClient,
    onTokenUpdated: params.onTokenUpdated,
    cloudBackup: params.cloudBackup,
    progress: params.progress,
    confirm: params.confirm,
    t: params.t,
    signal: params.signal
  })
  if (!ok) return
  await executeRestoreWorkflow({
    token: params.token,
    gdriveClient: params.gdriveClient,
    onTokenUpdated: params.onTokenUpdated,
    progress: params.progress,
    t: params.t,
    signal: params.signal,
    addLog: params.addLog,
    checkStorage: params.checkStorage
  })
}

export async function executeRestoreMutationFn(params: RestoreMutationParams) {
  const {
    isSyncEnabled,
    accessToken,
    gdriveClient,
    progress,
    t,
    abortControllerRef,
    addLog,
    getOrRequestToken,
    isSyncPending,
    queryClient
  } = params
  if (!isSyncEnabled || isSyncPending) return
  const controller = new AbortController()
  abortControllerRef.current = controller
  try {
    const token = await getOrRequestToken()
    await performRestoreWorkflow({
      ...params,
      token,
      signal: controller.signal
    })
  } catch (err: any) {
    await handleRestoreError({
      err,
      accessToken,
      gdriveClient,
      addLog,
      progress,
      t,
      queryClient
    })
    throw err
  } finally {
    abortControllerRef.current = null
    progress.setRestoreProgress(null)
  }
}

export function useRestoreMutation(
  params: Omit<RestoreMutationParams, "queryClient">
) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => executeRestoreMutationFn({ ...params, queryClient }),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["gdriveBackupMetadata", params.accessToken]
      })
    }
  })
}

export function useGDriveMutations(params: {
  isSyncEnabled: boolean
  accessToken: string | null
  gdriveClient: GoogleDriveClient
  onTokenUpdated: (newToken: string) => void
  cloudBackup: { modifiedTime: string; size: string } | null
  progress: GDriveProgressTracker
  confirm: any
  t: any
  abortControllerRef: React.MutableRefObject<AbortController | null>
  addLog: (log: string) => void
  checkStorage: () => void
}) {
  const queryClient = useQueryClient()
  const { accessToken, gdriveClient } = params

  const getOrRequestToken = async (): Promise<string> => {
    if (accessToken) return accessToken
    const token = await gdriveClient.authorize(true)
    queryClient.setQueryData(["gdrive", "accessToken"], token)
    return token
  }

  const toggleSyncMutation = useToggleSyncMutation(params)
  const toggleAutoSyncMutation = useToggleAutoSyncMutation(params)
  const syncMutation = useSyncMutation({ ...params, getOrRequestToken })
  const restoreMutation = useRestoreMutation({
    ...params,
    getOrRequestToken,
    isSyncPending: syncMutation.isPending
  })

  return {
    toggleSyncMutation,
    toggleAutoSyncMutation,
    syncMutation,
    restoreMutation
  }
}
