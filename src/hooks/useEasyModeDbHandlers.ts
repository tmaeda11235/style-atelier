import { db, seedDefaultCategories } from "../lib/db"

interface UseEasyModeDbHandlersOptions {
  confirm: (options: any) => Promise<boolean>
  addLog: (log: string) => void
}

export function useEasyModeDbHandlers({
  confirm,
  addLog
}: UseEasyModeDbHandlersOptions) {
  const handleResetDb = async () => {
    const ok = await confirm({
      title: "Reset Database",
      message: "Are you sure you want to delete ALL DATA?",
      confirmText: "Reset",
      cancelText: "Cancel",
      variant: "danger"
    })
    if (ok) {
      await Promise.all([
        db.historyItems.clear(),
        db.styleCards.clear(),
        db.userSettings.clear(),
        db.categories.clear()
      ])
      await seedDefaultCategories()
      localStorage.removeItem("style-atelier-onboarding-seen")
      addLog("All data cleared.")
    }
  }

  return { handleResetDb }
}
