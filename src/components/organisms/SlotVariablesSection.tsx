import { Pin } from "lucide-react"
import React, { useEffect, useRef, useState } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import type { StyleCard } from "../../lib/db-schema"
import { buildPromptString } from "../../lib/prompt-utils"
import { Button } from "../atoms/Button"
import { HelpTooltip } from "../atoms/HelpTooltip"

/**
 * Props for the SlotVariablesSection component.
 */
export interface SlotVariablesSectionProps {
  /** The list of slot variables extracted from current segments */
  slots: { label: string; default: string }[]
  /** Current values mapped by slot label */
  slotValues: Record<string, string>
  /** Callback triggered when a slot's value changes */
  onSlotValueChange: (label: string, value: string) => void
  /** Current historical values mapped by slot label */
  slotHistory: Record<string, string[]>
  /** List of cards currently in the Hand for quick-filling values */
  handCards: StyleCard[]
  /** Callback triggered to send a slot value as a new card to the Workbench */
  onSendToWorkbench: (value: string, label: string) => Promise<void>
}

/**
 * SlotVariablesSection renders input fields for slot variables (prompts with holes),
 * allowing users to fill variables from Hand cards, see recent history, and pin values back.
 */
export const SlotVariablesSection: React.FC<SlotVariablesSectionProps> = ({
  slots,
  slotValues,
  onSlotValueChange,
  slotHistory,
  handCards,
  onSendToWorkbench
}) => {
  const { expertFeatures } = useSettings()
  const { t } = useLanguage()
  const firstInputRef = useRef<HTMLInputElement>(null)

  const [activeSlot, setActiveSlot] = useState<string | null>(null)
  const [dragOverSlots, setDragOverSlots] = useState<Record<string, boolean>>(
    {}
  )
  const [activeIndex, setActiveIndex] = useState<number>(-1)

  // Auto-focus the first slot input when the slot list changes
  useEffect(() => {
    if (slots.length > 0 && expertFeatures.slot) {
      const timer = setTimeout(() => {
        firstInputRef.current?.focus()
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [slots, expertFeatures.slot])

  if (!expertFeatures.slot || slots.length === 0) return null

  const handleDragOver = (e: React.DragEvent, label: string) => {
    e.preventDefault()
    setDragOverSlots((prev) => ({ ...prev, [label]: true }))
  }

  const handleDragLeave = (label: string) => {
    setDragOverSlots((prev) => ({ ...prev, [label]: false }))
  }

  const handleDrop = (e: React.DragEvent, label: string) => {
    e.preventDefault()
    setDragOverSlots((prev) => ({ ...prev, [label]: false }))
    const text = e.dataTransfer.getData("text/plain")
    if (text) {
      onSlotValueChange(label, text)
    }
  }

  const handleKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    label: string,
    suggestions: { label: string; value: string }[]
  ) => {
    if (suggestions.length === 0) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % suggestions.length)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex(
        (prev) => (prev - 1 + suggestions.length) % suggestions.length
      )
    } else if (e.key === "Enter") {
      if (activeIndex >= 0 && activeIndex < suggestions.length) {
        e.preventDefault()
        onSlotValueChange(label, suggestions[activeIndex].value)
        setActiveSlot(null)
        setActiveIndex(-1)
      }
    } else if (e.key === "Escape") {
      setActiveSlot(null)
      setActiveIndex(-1)
    }
  }

  return (
    <div className="bg-white dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
        {t.simpleWorkbench.slotVariables}
        <HelpTooltip content={t.helpTooltips.slot} position="top-left" />
      </h4>
      <div className="space-y-3">
        {slots.map((slot, index) => {
          const label = slot.label
          const currentValue = slotValues[label] ?? ""
          const historyList = slotHistory[label] || []

          const handSuggestions = handCards.map((hc) => ({
            label: hc.name,
            value: buildPromptString(hc.promptSegments, hc.parameters)
          }))
          const historySuggestions = historyList.map((val) => ({
            label: val,
            value: val
          }))
          const suggestions = [...handSuggestions, ...historySuggestions]

          return (
            <div
              key={`${label}-${index}`}
              onDragOver={(e) => handleDragOver(e, label)}
              onDragLeave={() => handleDragLeave(label)}
              onDrop={(e) => handleDrop(e, label)}
              className={`p-2 rounded-lg border-2 transition-all relative space-y-1 ${
                dragOverSlots[label]
                  ? "border-dashed border-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
                  : "border-transparent"
              }`}
              data-testid={`slot-zone-${label}`}>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
                {label}
              </label>
              <div className="flex gap-2 items-center relative">
                <input
                  ref={index === 0 ? firstInputRef : null}
                  type="text"
                  value={currentValue}
                  onChange={(e) => onSlotValueChange(label, e.target.value)}
                  onFocus={() => {
                    setActiveSlot(label)
                    setActiveIndex(-1)
                  }}
                  onBlur={() => {
                    setTimeout(() => {
                      setActiveSlot(null)
                      setActiveIndex(-1)
                    }, 150)
                  }}
                  onKeyDown={(e) => handleKeyDown(e, label, suggestions)}
                  placeholder={slot.default || `Enter ${label}...`}
                  className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
                  data-testid={`slot-input-${label}`}
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  onClick={() => onSendToWorkbench(currentValue, label)}
                  title="Send to Workbench"
                  className="text-slate-400 dark:text-slate-500 hover:text-blue-500">
                  <Pin className="w-3.5 h-3.5" />
                </Button>

                {activeSlot === label && suggestions.length > 0 && (
                  <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-50 p-1.5 max-h-48 overflow-y-auto space-y-1.5">
                    {handSuggestions.length > 0 && (
                      <div className="space-y-1">
                        <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 px-1 uppercase tracking-wider">
                          {t.workbench.fillFromWorkbench}
                        </div>
                        {handSuggestions.map((item, idx) => {
                          const globalIdx = idx
                          const isSelected = activeIndex === globalIdx
                          return (
                            <button
                              key={`hand-${idx}`}
                              type="button"
                              onMouseDown={(e) => {
                                e.preventDefault()
                                onSlotValueChange(label, item.value)
                                setActiveSlot(null)
                                setActiveIndex(-1)
                              }}
                              onMouseEnter={() => setActiveIndex(globalIdx)}
                              className={`w-full text-left text-xs px-2 py-1 rounded transition-colors block truncate ${
                                isSelected
                                  ? "bg-blue-500 text-white"
                                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}>
                              {item.label}
                            </button>
                          )
                        })}
                      </div>
                    )}

                    {historySuggestions.length > 0 && (
                      <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
                        <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 px-1 uppercase tracking-wider">
                          {t.workbench.recent}
                        </div>
                        {historySuggestions.map((item, idx) => {
                          const globalIdx = handSuggestions.length + idx
                          const isSelected = activeIndex === globalIdx
                          return (
                            <div
                              key={`hist-${idx}`}
                              onMouseEnter={() => setActiveIndex(globalIdx)}
                              className={`flex items-center justify-between rounded px-2 py-0.5 text-xs transition-colors ${
                                isSelected
                                  ? "bg-blue-500 text-white"
                                  : "hover:bg-slate-100 dark:hover:bg-slate-800"
                              }`}>
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  onSlotValueChange(label, item.value)
                                  setActiveSlot(null)
                                  setActiveIndex(-1)
                                }}
                                className={`flex-1 text-left text-xs truncate py-0.5 ${
                                  isSelected
                                    ? "text-white"
                                    : "text-slate-700 dark:text-slate-300"
                                }`}>
                                {item.label}
                              </button>
                              <button
                                type="button"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  onSendToWorkbench(item.value, label)
                                }}
                                title="Send this value to Workbench"
                                className={`p-0.5 rounded ${isSelected ? "text-white hover:text-blue-200" : "text-slate-400 dark:text-slate-500 hover:text-blue-500"}`}>
                                <Pin className="w-3 h-3" />
                              </button>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
