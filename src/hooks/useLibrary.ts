import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"
import { buildPromptString } from "../lib/prompt-utils"

export function useLibrary(addLog: (msg: string) => void) {
  const styleCards = useLiveQuery(() => db.styleCards.orderBy("createdAt").reverse().toArray())

  const handleCardClick = (card: StyleCard) => {
    const maskedKeys: (keyof StyleCard["parameters"])[] = []
    if (card.masking.isSrefHidden) {
      maskedKeys.push("sref")
    }
    if (card.masking.isPHidden) {
      maskedKeys.push("p")
    }
    const prompt = buildPromptString(card.promptSegments, card.parameters, maskedKeys)
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      const activeTab = tabs[0]
      if (activeTab?.id) {
        chrome.tabs
          .sendMessage(activeTab.id, {
            type: "INJECT_PROMPT",
            prompt: prompt,
          })
          .catch((err) => {
            addLog(`Note: ${err.message || "Could not send to tab"}`)
          })
        addLog(`Sent prompt: ${prompt.substring(0, 30)}...`)
      } else {
        addLog("No active tab found")
      }
    })
  }

  return {
    styleCards,
    handleCardClick,
  }
}