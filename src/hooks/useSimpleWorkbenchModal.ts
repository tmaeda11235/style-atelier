import { useEffect, useState } from "react"

import type { AlertType } from "../components/molecules/ConnectionAlert"
import { useLanguage } from "../contexts/LanguageContext"
import {
  isExtensionContextValid,
  safeQueryTabs,
  safeSendTabMessage
} from "../lib/chrome-utils"
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
  if (!isExtensionContextValid()) {
    throw new Error("Extension context invalidated")
  }
  const tabs = await safeQueryTabs({ active: true, currentWindow: true })
  const activeTab = tabs?.[0]
  if (!activeTab?.id) {
    throw new Error("No active tab found")
  }
  return safeSendTabMessage(activeTab.id, {
    type: "INJECT_PROMPT",
    prompt
  })
}

interface ConnectionState {
  isCancelled: boolean
  retryCount: number
  timerId: any
}

async function performConnectionCheck(
  state: ConnectionState,
  addLog: ((msg: string) => void) | undefined,
  setAlertType: (type: AlertType | null) => void,
  noActiveTabMsg: string,
  maxRetries: number,
  retryCallback: () => void
) {
  if (state.isCancelled) return
  if (!isExtensionContextValid()) {
    setAlertType("disconnected")
    return
  }
  try {
    const tabs = await safeQueryTabs({ active: true, currentWindow: true })
    const activeTab = tabs?.[0]
    if (state.isCancelled) return
    if (!activeTab?.id) {
      addLog?.(`Check Connection: ${noActiveTabMsg}`)
      return
    }
    if (activeTab.status !== "complete") {
      state.timerId = setTimeout(retryCallback, 1000)
      return
    }
    await safeSendTabMessage(activeTab.id, { type: "PING" })
    if (!state.isCancelled) setAlertType(null)
  } catch (err: any) {
    if (state.isCancelled) return
    console.log("Connection check failed:", err)
    if (state.retryCount < maxRetries) {
      state.retryCount++
      state.timerId = setTimeout(retryCallback, 1500)
    } else {
      setAlertType("disconnected")
    }
  }
}

export function useSimpleWorkbenchConnection(
  cardId: string,
  addLog: ((msg: string) => void) | undefined,
  setAlertType: (type: AlertType | null) => void,
  noActiveTabMsg: string
) {
  useEffect(() => {
    const state: ConnectionState = {
      isCancelled: false,
      retryCount: 0,
      timerId: null
    }
    const checkConnection = () => {
      performConnectionCheck(
        state,
        addLog,
        setAlertType,
        noActiveTabMsg,
        2,
        checkConnection
      )
    }
    checkConnection()
    return () => {
      state.isCancelled = true
      if (state.timerId) clearTimeout(state.timerId)
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
