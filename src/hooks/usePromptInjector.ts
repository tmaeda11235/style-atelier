import { useState } from "react"

import type { AlertType } from "../components/molecules/ConnectionAlert"
import type { PromptSegment, StyleCard } from "../lib/db-schema"
import { buildPromptString } from "../lib/prompt-utils"

interface UsePromptInjectorOptions {
  workbenchCards: StyleCard[]
  slotHistory: Record<string, string[]>
  saveSlotHistory: (label: string, values: string[]) => Promise<void>
  incrementCardUsage: (id: string) => Promise<void>
  setAlertType: (type: AlertType | null) => void
  addLog?: (msg: string) => void
}

/**
 * Custom hook to handle Midjourney prompt injection, saving variable slot history,
 * and incrementing card usage count.
 */
export function usePromptInjector(options: UsePromptInjectorOptions) {
  const [isInjecting, setIsInjecting] = useState(false)

  const injectPrompt = async (
    editedSegments: PromptSegment[],
    editedParams: any,
    slotValues: Record<string, string>
  ) => {
    await executePromptInjection({
      ...options,
      editedSegments,
      editedParams,
      slotValues,
      setIsInjecting
    })
  }

  return {
    isInjecting,
    injectPrompt
  }
}

async function executePromptInjection({
  workbenchCards,
  slotHistory,
  saveSlotHistory,
  incrementCardUsage,
  setAlertType,
  addLog,
  editedSegments,
  editedParams,
  slotValues,
  setIsInjecting
}: UsePromptInjectorOptions & {
  editedSegments: PromptSegment[]
  editedParams: any
  slotValues: Record<string, string>
  setIsInjecting: (injecting: boolean) => void
}) {
  if (workbenchCards.length === 0) return
  setIsInjecting(true)
  setAlertType(null)

  const resolvedSegments = resolvePromptSegments(editedSegments, slotValues)
  const fullPrompt = buildPromptString(resolvedSegments, editedParams)

  try {
    const response = await performPromptInjection(fullPrompt)

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
      addLog?.(`Prompt injected successfully!`)
      await updateUsageAndHistory(
        workbenchCards,
        slotValues,
        slotHistory,
        incrementCardUsage,
        saveSlotHistory
      )
    }
  } catch (err) {
    console.error("Injection failed:", err)
    setAlertType("disconnected")
  } finally {
    setIsInjecting(false)
  }
}

function resolvePromptSegments(
  editedSegments: PromptSegment[],
  slotValues: Record<string, string>
) {
  return editedSegments.map((seg) => {
    if (seg.type === "slot") {
      return {
        type: "text" as const,
        value: slotValues[seg.label] || seg.default || seg.label
      }
    }
    return seg
  })
}

async function performPromptInjection(fullPrompt: string) {
  const tabs = await chrome.tabs.query({
    active: true,
    currentWindow: true
  })
  const activeTab = tabs[0]

  if (!activeTab?.id) {
    throw new Error("No active tab found")
  }

  return await chrome.tabs.sendMessage(activeTab.id, {
    type: "INJECT_PROMPT",
    prompt: fullPrompt
  })
}

async function updateUsageAndHistory(
  workbenchCards: StyleCard[],
  slotValues: Record<string, string>,
  slotHistory: Record<string, string[]>,
  incrementCardUsage: (id: string) => Promise<void>,
  saveSlotHistory: (label: string, values: string[]) => Promise<void>
) {
  // Increment usage count for all cards in the Workbench
  workbenchCards.forEach((card) => {
    incrementCardUsage(card.id).catch((err) =>
      console.error("Failed to update usage count on workbench inject:", err)
    )
  })

  // Save slot values to history on success
  try {
    for (const [lbl, val] of Object.entries(slotValues)) {
      const trimmedVal = val.trim()
      if (!trimmedVal) continue
      const currentValues = slotHistory[lbl] || []
      const updatedValues = [
        trimmedVal,
        ...currentValues.filter((v) => v !== trimmedVal)
      ].slice(0, 10)
      await saveSlotHistory(lbl, updatedValues)
    }
  } catch (e) {
    console.error("Failed to save slot history:", e)
  }
}
