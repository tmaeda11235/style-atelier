import { useCallback, useState } from "react"

import { db, seedDefaultCategories } from "../lib/db"

async function performDbReset(addLog: (log: string) => void) {
  await db.historyItems.clear()
  await db.styleCards.clear()
  await db.userSettings.clear()
  await db.categories.clear()
  await seedDefaultCategories()
  localStorage.removeItem("style-atelier-onboarding-seen")
  addLog("All data cleared.")
}

export function useExpertLogs(confirm: any) {
  const [logs, setLogs] = useState<string[]>([])
  const addLog = useCallback(
    (log: string) => setLogs((prev) => [log, ...prev].slice(0, 20)),
    []
  )
  const handleClearLogs = useCallback(() => setLogs([]), [])

  const handleResetDb = useCallback(async () => {
    const ok = await confirm({
      title: "Reset Database",
      message: "Are you sure you want to delete ALL DATA?",
      confirmText: "Reset",
      cancelText: "Cancel",
      variant: "danger"
    })
    if (ok) {
      await performDbReset(addLog)
    }
  }, [confirm, addLog])

  return { logs, addLog, handleClearLogs, handleResetDb }
}
