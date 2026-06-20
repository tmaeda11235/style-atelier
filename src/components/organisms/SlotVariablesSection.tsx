import React, { useEffect, useRef } from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import type { StyleCard } from "../../shared/lib/db-schema"
import { buildPromptString } from "../../shared/lib/prompt-utils"
import { HelpTooltip } from "../atoms/HelpTooltip"
import { SlotField } from "../molecules/SlotField"

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
  onSendToWorkbench: (value: string, label: string) => Promise<void> | void
}

const renderSlotField = ({
  slot,
  index,
  slotValues,
  slotHistory,
  handCards,
  onSlotValueChange,
  onSendToWorkbench,
  t,
  firstInputRef
}: any) => {
  const label = slot.label
  const currentValue = slotValues[label] ?? ""
  const historyList = slotHistory[label] || []

  const handSuggestions = handCards.map((hc: any) => ({
    label: hc.name,
    value: buildPromptString(hc.promptSegments, hc.parameters)
  }))
  const historySuggestions = historyList.map((val: any) => ({
    label: val,
    value: val
  }))
  const suggestions = [...handSuggestions, ...historySuggestions]

  return (
    <SlotField
      key={`${label}-${index}`}
      slot={slot}
      index={index}
      currentValue={currentValue}
      suggestions={suggestions}
      handSuggestions={handSuggestions}
      historySuggestions={historySuggestions}
      onSlotValueChange={onSlotValueChange}
      onSendToWorkbench={onSendToWorkbench}
      t={t}
      firstInputRef={index === 0 ? firstInputRef : undefined}
    />
  )
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

  return (
    <div className="bg-white dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800 rounded-lg space-y-3">
      <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1">
        {t.simpleWorkbench.slotVariables}
        <HelpTooltip content={t.helpTooltips.slot} position="top-left" />
      </h4>
      <div className="space-y-3">
        {slots.map((slot, index) =>
          renderSlotField({
            slot,
            index,
            slotValues,
            slotHistory,
            handCards,
            onSlotValueChange,
            onSendToWorkbench,
            t,
            firstInputRef
          })
        )}
      </div>
    </div>
  )
}
