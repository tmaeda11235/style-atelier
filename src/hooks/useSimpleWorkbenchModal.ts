import { useEffect, useState } from "react"

import type { AlertType } from "../components/molecules/ConnectionAlert"
import { useLanguage } from "../contexts/LanguageContext"
import type { PromptSegment, StyleCard } from "../lib/db-schema"
import { buildPromptString } from "../lib/prompt-utils"
import { updateStyleCard } from "../lib/style-card-store"

interface UseSimpleWorkbenchModalProps {
  card: StyleCard
  addLog?: (msg: string) => void
  setAlertType: (type: AlertType | null) => void
}

const resolveSegments = (
  segments: PromptSegment[],
  values: Record<string, string>
) => {
  return segments.map((seg) => {
    if (seg.type === "slot") {
      const val = values[seg.label]
      return {
        type: "text" as const,
        value: val !== undefined && val !== "" ? val : seg.default || seg.label
      }
    }
    return seg
  })
}

const sendInjectMessage = async (prompt: string) => {
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true })
  const activeTab = tabs[0]
  if (!activeTab?.id) {
    throw new Error("No active tab found")
  }
  return chrome.tabs.sendMessage(activeTab.id, {
    type: "INJECT_PROMPT",
    prompt
  })
}

export function useSimpleWorkbenchConnection(
  cardId: string,
  addLog: ((msg: string) => void) | undefined,
  setAlertType: (type: AlertType | null) => void,
  noActiveTabMsg: string
) {
  useEffect(() => {
    let isCancelled = false
    let retryCount = 0
    const maxRetries = 2
    let timerId: any = null

    const checkConnection = async () => {
      if (isCancelled) return
      try {
        const tabs = await chrome.tabs.query({
          active: true,
          currentWindow: true
        })
        const activeTab = tabs[0]
        if (isCancelled) return
        if (!activeTab || !activeTab.id) {
          addLog?.(`Check Connection: ${noActiveTabMsg}`)
          return
        }
        if (activeTab.status !== "complete") {
          timerId = setTimeout(checkConnection, 1000)
          return
        }
        await chrome.tabs.sendMessage(activeTab.id, { type: "PING" })
        if (isCancelled) return
        setAlertType(null)
      } catch (err: any) {
        if (isCancelled) return
        console.log("Connection check failed:", err)
        if (retryCount < maxRetries) {
          retryCount++
          timerId = setTimeout(checkConnection, 1500)
        } else {
          setAlertType("disconnected")
        }
      }
    }

    checkConnection()
    return () => {
      isCancelled = true
      if (timerId) clearTimeout(timerId)
    }
  }, [cardId, addLog, setAlertType, noActiveTabMsg])
}

export function useSimpleWorkbenchSegments(card: StyleCard) {
  const [editedSegments, setEditedSegments] = useState<PromptSegment[]>([])
  const [editedParams, setEditedParams] = useState<any>({})
  const [slotValues, setSlotValues] = useState<Record<string, string>>({})

  useEffect(() => {
    const segments = card.promptSegments || []
    setEditedSegments(segments)
    setEditedParams(card.parameters || {})

    const initialSlots: Record<string, string> = {}
    segments.forEach((seg) => {
      if (seg.type === "slot") {
        initialSlots[seg.label] = seg.default || ""
      }
    })
    setSlotValues(initialSlots)
  }, [card])

  return {
    editedSegments,
    setEditedSegments,
    editedParams,
    setEditedParams,
    slotValues,
    setSlotValues
  }
}

export function useSimpleWorkbenchModal({
  card,
  addLog,
  setAlertType
}: UseSimpleWorkbenchModalProps) {
  const [isInjecting, setIsInjecting] = useState(false)
  const { t: i18n } = useLanguage()
  const t = i18n.simpleWorkbench
  const segs = useSimpleWorkbenchSegments(card)

  useSimpleWorkbenchConnection(card.id, addLog, setAlertType, t.noActiveTab)

  const handleInjectPrompt = async () => {
    setIsInjecting(true)
    setAlertType(null)
    const resolvedSegments = resolveSegments(
      segs.editedSegments,
      segs.slotValues
    )
    const fullPrompt = buildPromptString(resolvedSegments, segs.editedParams)
    try {
      const response = await sendInjectMessage(fullPrompt)
      if (response && response.status === "error") {
        const isNoInput = response.message?.includes(
          "Could not find chat input"
        )
        setAlertType(isNoInput ? "no_input" : "disconnected")
      } else {
        addLog?.(t.injectSuccess)
        await updateStyleCard(card.id, {
          usageCount: (card.usageCount || 0) + 1
        })
      }
    } catch (err) {
      console.error("Injection failed:", err)
      setAlertType("disconnected")
    } finally {
      setIsInjecting(false)
    }
  }

  return {
    ...segs,
    isInjecting,
    handleInjectPrompt
  }
}
