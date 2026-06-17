import type { AlertType } from "../components/molecules/ConnectionAlert"
import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"

interface UseEasyModeCardHandlersOptions {
  setActiveDetailCard: (card: StyleCard | null) => void
  addLog: (log: string) => void
  setAlertType: (type: AlertType) => void
}

export function useEasyModeCardHandlers({
  setActiveDetailCard,
  addLog,
  setAlertType
}: UseEasyModeCardHandlersOptions) {
  const handleSaveCardDetails = async (updatedCard: StyleCard) => {
    try {
      await db.styleCards.put(updatedCard)
      addLog(`StyleCard "${updatedCard.name}" updated successfully!`)
      setActiveDetailCard(null)
    } catch (err) {
      console.error("Failed to save style card updates:", err)
      addLog("Error: Failed to save style card updates.")
      setAlertType("db_error")
    }
  }

  const handleDeleteCard = async (cardId: string) => {
    try {
      await db.deleteStyleCardAndCleanup(cardId)
      addLog("StyleCard deleted successfully.")
      setActiveDetailCard(null)
    } catch (err) {
      console.error("Failed to delete style card:", err)
      addLog("Error: Failed to delete style card.")
      setAlertType("db_error")
    }
  }

  return { handleSaveCardDetails, handleDeleteCard }
}
