import React, { useRef } from "react"

import { useConfirm } from "../contexts/ConfirmContext"
import { useCardExport } from "./useCardExport"
import { useHistory } from "./useHistory"
import { useLocalBackup } from "./useLocalBackup"

export function useResetDbHandler({
  confirm,
  onResetDb,
  showStatus,
  checkStorage,
  t
}: {
  confirm: ReturnType<typeof useConfirm>
  onResetDb: () => void
  showStatus: (msg: string, type: "success" | "error") => void
  checkStorage: () => void
  t: any
}) {
  return React.useCallback(async () => {
    const ok = await confirm({
      title: t.confirmTitle,
      message: t.resetConfirm,
      confirmText: t.confirmBtn,
      cancelText: t.cancelBtn,
      variant: "danger"
    })
    if (!ok) return
    await onResetDb()
    showStatus(t.resetSuccess, "success")
    checkStorage()
  }, [confirm, onResetDb, showStatus, checkStorage, t])
}

export function useClearHistoryHandler({
  confirm,
  clearHistory,
  addLog,
  showStatus,
  checkStorage,
  t
}: {
  confirm: ReturnType<typeof useConfirm>
  clearHistory: () => Promise<void>
  addLog: (log: string) => void
  showStatus: (msg: string, type: "success" | "error") => void
  checkStorage: () => void
  t: any
}) {
  return React.useCallback(async () => {
    const ok = await confirm({
      title: t.confirmTitle,
      message: t.clearHistoryConfirm,
      confirmText: t.confirmBtn,
      cancelText: t.cancelBtn,
      variant: "danger"
    })
    if (!ok) return
    try {
      await clearHistory()
      addLog("Prompt history cleared successfully.")
      showStatus(t.clearHistorySuccess, "success")
      checkStorage()
    } catch (err: any) {
      console.error(err)
      addLog(`Failed to clear history: ${err.message || err}`)
      showStatus(
        `${t.clearHistoryFailed}: ${err.message || "Unknown error"}`,
        "error"
      )
    }
  }, [confirm, clearHistory, addLog, showStatus, checkStorage, t])
}

function useLocalBackupState({ addLog, checkStorage, gdriveShowStatus }: any) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const localBackup = useLocalBackup({
    addLog,
    checkStorage,
    showStatus: gdriveShowStatus,
    fileInputRef
  })
  return { fileInputRef, localBackup }
}

function useBackupAndExport(addLog: any, checkStorage: any, showStatus: any) {
  const { fileInputRef, localBackup } = useLocalBackupState({
    addLog,
    checkStorage,
    gdriveShowStatus: showStatus
  })
  const cardExport = useCardExport({ addLog, showStatus })
  return { fileInputRef, localBackup, cardExport }
}

function buildMaintenanceProps(
  props: UseMaintenanceStateProps,
  fileInputRef: React.RefObject<HTMLInputElement | null>,
  localBackup: any,
  cardExport: any,
  handleClearHistory: any,
  handleResetDbClick: any
) {
  return {
    t: props.t,
    estimate: props.estimate,
    handleClearHistory,
    fileInputRef,
    isSyncing: props.gdriveSyncState.isSyncing,
    isRestoring: props.gdriveSyncState.isRestoring,
    handleLocalExport: localBackup.handleLocalExport,
    handleLocalImport: localBackup.handleLocalImport,
    handleExportCSV: cardExport.handleExportCSV,
    handleExportMarkdown: cardExport.handleExportMarkdown,
    isSyncEnabled: props.gdriveSyncState.isSyncEnabled,
    isLoadingCloudBackup: props.gdriveSyncState.isLoadingCloudBackup,
    cloudBackup: props.gdriveSyncState.cloudBackup,
    handleResetDbClick,
    handleForceRecovery: props.gdriveSyncState.handleForceRecovery
  }
}

interface UseMaintenanceStateProps {
  addLog: (log: string) => void
  onResetDb: () => void
  checkStorage: () => void
  gdriveShowStatus: (msg: string, type: "success" | "error") => void
  gdriveSyncState: any
  estimate: any
  t: any
}

export function useMaintenanceState(props: UseMaintenanceStateProps) {
  const confirm = useConfirm()
  const { clearHistory } = useHistory()
  const { fileInputRef, localBackup, cardExport } = useBackupAndExport(
    props.addLog,
    props.checkStorage,
    props.gdriveShowStatus
  )

  const handleResetDbClick = useResetDbHandler({
    confirm,
    onResetDb: props.onResetDb,
    showStatus: props.gdriveShowStatus,
    checkStorage: props.checkStorage,
    t: props.t
  })

  const handleClearHistory = useClearHistoryHandler({
    confirm,
    clearHistory,
    addLog: props.addLog,
    showStatus: props.gdriveShowStatus,
    checkStorage: props.checkStorage,
    t: props.t
  })

  return {
    maintenanceProps: buildMaintenanceProps(
      props,
      fileInputRef,
      localBackup,
      cardExport,
      handleClearHistory,
      handleResetDbClick
    )
  }
}
