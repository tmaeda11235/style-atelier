import { useState } from "react"

import type { AlertType } from "../components/molecules/ConnectionAlert"
import { safeQueryTabs, safeSendTabMessage } from "../lib/chrome-utils"
import { db } from "../lib/db"
import type { PromptSegment, StyleCard } from "../shared/lib/db-schema"
import { buildPromptString } from "../shared/lib/prompt-utils"

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
      const isNoInput = response.message?.includes("Could not find chat input")
      setAlertType(isNoInput ? "no_input" : "disconnected")
    } else {
      addLog?.(`Prompt injected successfully!`)
      await updateUsageAndHistory(
        workbenchCards,
        slotValues,
        slotHistory,
        incrementCardUsage,
        saveSlotHistory
      )
      await saveRecipeHistory(workbenchCards, editedParams, slotValues)
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
  const tabs = await safeQueryTabs({
    active: true,
    currentWindow: true
  })
  if (!tabs || tabs.length === 0) {
    throw new Error("No active tab found")
  }
  const activeTab = tabs[0]

  if (!activeTab?.id) {
    throw new Error("No active tab found")
  }

  return await safeSendTabMessage(activeTab.id, {
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

async function saveRecipeHistory(
  workbenchCards: StyleCard[],
  editedParams: any,
  slotValues: Record<string, string>
) {
  if (workbenchCards.length === 0) return
  try {
    const cards = workbenchCards.map((c) => ({
      id: c.id,
      name: c.name,
      weight: c.weight !== undefined ? c.weight : 1.0
    }))

    const totalWeight = cards.reduce((sum, c) => sum + c.weight, 0)
    const nameParts = cards.map((c) => {
      const pct =
        totalWeight > 0 ? Math.round((c.weight / totalWeight) * 100) : 100
      return `${c.name} (${pct}%)`
    })
    const recipeName = nameParts.join(" + ")

    const parameters: any = {}
    const keys: (keyof StyleCard["parameters"])[] = [
      "ar",
      "sref",
      "cref",
      "p",
      "imagePrompts",
      "stylize",
      "chaos",
      "weird",
      "tile",
      "raw",
      "version",
      "niji"
    ]
    for (const key of keys) {
      if (editedParams[key] !== undefined) {
        parameters[key] = editedParams[key]
      }
    }

    await db.addRecipeHistory({
      name: recipeName,
      cards,
      parameters,
      slotValues
    })
  } catch (err) {
    console.error("Failed to save recipe history:", err)
  }
}
