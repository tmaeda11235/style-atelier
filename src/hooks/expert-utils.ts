import type { AlertType } from "../components/molecules/ConnectionAlert"
import { db } from "../lib/db"
import type { StyleCard } from "../shared/lib/db-schema"

export async function saveCardDetails(
  updatedCard: StyleCard,
  addLog: (log: string) => void,
  setAlertType: (type: AlertType) => void
) {
  try {
    await db.styleCards.put(updatedCard)
    addLog(`StyleCard "${updatedCard.name}" updated successfully!`)
    return true
  } catch (err) {
    console.error("Failed to save style card updates:", err)
    addLog("Error: Failed to save style card updates.")
    setAlertType("db_error")
    return false
  }
}

export async function deleteCard(
  cardId: string,
  addLog: (log: string) => void,
  setAlertType: (type: AlertType) => void
) {
  try {
    await db.deleteStyleCardAndCleanup(cardId)
    addLog("StyleCard deleted successfully.")
    return true
  } catch (err) {
    console.error("Failed to delete style card:", err)
    addLog("Error: Failed to delete style card.")
    setAlertType("db_error")
    return false
  }
}

export async function sendToWorkbench(
  card: StyleCard,
  addLog: (log: string) => void,
  setAlertType: (type: AlertType) => void
) {
  try {
    if (!card.isPinned) {
      const pinnedCount = await db.styleCards
        .filter((c) => !!c.isPinned)
        .count()
      if (pinnedCount >= 5) {
        setAlertType("hand_full")
        return false
      }
      await db.updateCard(card.id, {
        isPinned: true,
        usageCount: (card.usageCount || 0) + 1
      })
      addLog(`Added ${card.name} to Workbench.`)
    }
    return true
  } catch (err) {
    console.error("Failed to send card to workbench:", err)
    addLog("Error: Failed to send card to workbench.")
    return false
  }
}

export async function injectPrompt(
  prompt: string,
  addLog: (log: string) => void,
  setAlertType: (type: AlertType) => void,
  activeDetailCard: StyleCard | null
) {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
    const activeTabEl = tabs[0]
    if (!activeTabEl?.id) throw new Error("No active tab found")
    const response = await chrome.tabs.sendMessage(activeTabEl.id, {
      type: "INJECT_PROMPT",
      prompt
    })
    if (response?.status === "error") {
      const isChatInput = response.message?.includes(
        "Could not find chat input"
      )
      setAlertType(isChatInput ? "no_input" : "disconnected")
    } else {
      addLog(`Sent prompt: ${prompt.substring(0, 30)}...`)
      if (activeDetailCard) {
        db.styleCards
          .update(activeDetailCard.id, {
            usageCount: (activeDetailCard.usageCount || 0) + 1
          })
          .catch((err) =>
            console.error(
              "Failed to update usage count on details inject:",
              err
            )
          )
      }
    }
  } catch (err: any) {
    console.error("Injection failed:", err)
    setAlertType("disconnected")
    addLog(`Note: ${err.message || "Could not send to tab"}`)
  }
}
