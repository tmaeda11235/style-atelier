import { Send, X } from "lucide-react"
import React, { useEffect, useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { db } from "../../lib/db"
import type { PromptSegment, StyleCard } from "../../lib/db-schema"
import { buildPromptString } from "../../lib/prompt-utils"
import { Button } from "../atoms/Button"
import { CardThumbnail } from "../molecules/CardThumbnail"
import type { AlertType } from "../molecules/ConnectionAlert"
import { ParameterEditor } from "./ParameterEditor"
import { PromptBubbleEditor } from "./PromptBubbleEditor"

interface SimpleWorkbenchModalProps {
  card: StyleCard
  onClose: () => void
  addLog?: (msg: string) => void
  setAlertType: (type: AlertType | null) => void
}

export function SimpleWorkbenchModal({
  card,
  onClose,
  addLog,
  setAlertType
}: SimpleWorkbenchModalProps) {
  const [editedSegments, setEditedSegments] = useState<PromptSegment[]>([])
  const [editedParams, setEditedParams] = useState<any>({})
  const [isInjecting, setIsInjecting] = useState(false)

  const { t: i18n } = useLanguage()
  const t = i18n.simpleWorkbench

  // Load segments and parameters on mount or when card changes
  useEffect(() => {
    setEditedSegments(card.promptSegments || [])
    setEditedParams(card.parameters || {})
  }, [card])

  // Connection check on mount
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
          addLog?.(`Check Connection: ${t.noActiveTab}`)
          return
        }

        if (activeTab.status !== "complete") {
          timerId = setTimeout(checkConnection, 1000)
          return
        }

        const response = await chrome.tabs.sendMessage(activeTab.id, {
          type: "PING"
        })
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
      if (timerId) {
        clearTimeout(timerId)
      }
    }
  }, [card.id])

  const handleInjectPrompt = async () => {
    setIsInjecting(true)
    setAlertType(null)

    // In Easy Mode, slot variables are not filled via a UI section.
    // Instead, if there are slot segments, we fallback to their default or label values.
    const resolvedSegments = editedSegments.map((seg) => {
      if (seg.type === "slot") {
        return {
          type: "text" as const,
          value: seg.default || seg.label
        }
      }
      return seg
    })

    const fullPrompt = buildPromptString(resolvedSegments, editedParams)

    try {
      const tabs = await chrome.tabs.query({
        active: true,
        currentWindow: true
      })
      const activeTab = tabs[0]

      if (!activeTab?.id) {
        throw new Error("No active tab found")
      }

      const response = await chrome.tabs.sendMessage(activeTab.id, {
        type: "INJECT_PROMPT",
        prompt: fullPrompt
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
        addLog?.(t.injectSuccess)

        // Increment usage count for the card
        await db.updateCard(card.id, { usageCount: (card.usageCount || 0) + 1 })
      }
    } catch (err) {
      console.error("Injection failed:", err)
      setAlertType("disconnected")
    } finally {
      setIsInjecting(false)
    }
  }

  return (
    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex flex-col justify-end">
      {/* Drawer Container */}
      <div className="bg-white rounded-t-xl max-h-[90%] flex flex-col shadow-2xl transition-all duration-300 transform translate-y-0">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎴</span>
            <div>
              <h3 className="text-sm font-black text-slate-800">{t.title}</h3>
              <p className="text-[10px] text-slate-400 font-bold truncate max-w-[200px]">
                {card.name}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="flex gap-4 items-start bg-slate-50 p-3 rounded-lg border border-slate-100">
            <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden border border-slate-200 shadow-sm">
              <img
                src={card.thumbnailData || "assets/icon.png"}
                className="w-full h-full object-cover"
                alt={card.name}
              />
            </div>
            <div className="flex-1 min-w-0">
              <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
                Card Name
              </span>
              <p className="text-xs font-bold text-slate-800 truncate">
                {card.name}
              </p>
              <div className="mt-1 flex items-center gap-1.5">
                <span className="text-[10px] bg-slate-150 px-1.5 py-0.5 rounded text-slate-600 font-semibold">
                  {card.tier}
                </span>
                {card.category && (
                  <span className="text-[10px] bg-blue-50 px-1.5 py-0.5 rounded text-blue-600 font-semibold">
                    {card.category}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="space-y-1">
            <label className="block text-xs font-semibold text-slate-500">
              {t.promptPreview}
            </label>
            <PromptBubbleEditor
              initialSegments={editedSegments}
              onChange={setEditedSegments}
              tier={card.tier}
            />
          </div>

          <ParameterEditor
            parameters={editedParams}
            onChange={setEditedParams}
          />
        </div>

        {/* Footer */}
        <div className="p-4 border-t flex gap-2 bg-slate-50">
          <Button variant="ghost" className="flex-1" onClick={onClose}>
            {t.cancel}
          </Button>
          <Button
            className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold"
            onClick={handleInjectPrompt}
            disabled={isInjecting}>
            <Send className="w-4 h-4 mr-2" />
            {isInjecting ? t.injecting : t.tryOnMidjourney}
          </Button>
        </div>
      </div>
    </div>
  )
}
