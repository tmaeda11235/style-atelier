import type { AlertType } from "../components/molecules/ConnectionAlert"
import { safeQueryTabs, safeSendTabMessage } from "../lib/chrome-utils"
import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"

interface InjectPromptOptions {
  prompt: string
  activeDetailCard: StyleCard | null
  addLog: (log: string) => void
  setAlertType: (type: AlertType) => void
}

export async function injectPrompt({
  prompt,
  activeDetailCard,
  addLog,
  setAlertType
}: InjectPromptOptions) {
  setAlertType(null)
  try {
    const tabs = await safeQueryTabs({ active: true, currentWindow: true })
    const activeTabEl = tabs ? tabs[0] : undefined
    if (!activeTabEl?.id) {
      throw new Error("No active tab found")
    }
    const response = await safeSendTabMessage(activeTabEl.id, {
      type: "INJECT_PROMPT",
      prompt: prompt
    })
    if (response && response.status === "error") {
      if (
        response.message &&
        response.message.includes("Could not find chat input")
      ) {
        setAlertType("no_input")
      } else {
        setAlertType("disconnected")
      }
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

interface UseEasyModePromptInjectorOptions {
  activeDetailCard: StyleCard | null
  addLog: (log: string) => void
  setAlertType: (type: AlertType) => void
}

export function useEasyModePromptInjector({
  activeDetailCard,
  addLog,
  setAlertType
}: UseEasyModePromptInjectorOptions) {
  const handleInjectPrompt = async (prompt: string) => {
    await injectPrompt({ prompt, activeDetailCard, addLog, setAlertType })
  }

  return { handleInjectPrompt }
}
