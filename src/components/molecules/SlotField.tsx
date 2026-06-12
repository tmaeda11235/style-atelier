import { Pin } from "lucide-react"
import React, { useState } from "react"

import { Button } from "../atoms/Button"
import { SlotSuggestionsDropdown } from "./SlotSuggestionsDropdown"

export interface SlotFieldProps {
  slot: { label: string; default: string }
  index: number
  currentValue: string
  suggestions: { label: string; value: string }[]
  handSuggestions: { label: string; value: string }[]
  historySuggestions: { label: string; value: string }[]
  onSlotValueChange: (label: string, value: string) => void
  onSendToWorkbench: (value: string, label: string) => Promise<void>
  t: any
  firstInputRef?: React.RefObject<HTMLInputElement | null>
}

interface UseSlotFieldProps {
  label: string
  suggestions: { label: string; value: string }[]
  onSlotValueChange: (label: string, value: string) => void
}

export function useSlotField(props: UseSlotFieldProps) {
  const [activeSlot, setActiveSlot] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)
  const [activeIndex, setActiveIndex] = useState<number>(-1)

  const handleDragOver = (e: React.DragEvent) => (
    e.preventDefault(),
    setIsDragOver(true)
  )
  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)
    const text = e.dataTransfer.getData("text/plain")
    if (text) props.onSlotValueChange(props.label, text)
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    const len = props.suggestions.length
    if (len === 0) return
    if (e.key === "ArrowDown") {
      e.preventDefault()
      setActiveIndex((prev) => (prev + 1) % len)
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setActiveIndex((prev) => (prev - 1 + len) % len)
    } else if (e.key === "Enter" && activeIndex >= 0 && activeIndex < len) {
      e.preventDefault()
      props.onSlotValueChange(props.label, props.suggestions[activeIndex].value)
      setActiveSlot(null)
      setActiveIndex(-1)
    } else if (e.key === "Escape") {
      setActiveSlot(null)
      setActiveIndex(-1)
    }
  }

  return {
    activeSlot,
    setActiveSlot,
    isDragOver,
    setIsDragOver,
    activeIndex,
    setActiveIndex,
    handleDragOver,
    handleDrop,
    handleKeyDown
  }
}

const SlotInput = ({
  label,
  slot,
  index,
  currentValue,
  onSlotValueChange,
  setActiveSlot,
  setActiveIndex,
  handleKeyDown,
  firstInputRef
}: any) => (
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
    onKeyDown={handleKeyDown}
    placeholder={slot.default || `Enter ${label}...`}
    className="flex-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded px-2 py-1 text-sm text-slate-800 dark:text-slate-100 focus:outline-none focus:border-blue-500"
    data-testid={`slot-input-${label}`}
  />
)

const SlotInputField = (props: any) => {
  return (
    <div className="flex gap-2 items-center relative">
      <SlotInput
        label={props.label}
        slot={props.slot}
        index={props.index}
        currentValue={props.currentValue}
        onSlotValueChange={props.onSlotValueChange}
        setActiveSlot={props.setActiveSlot}
        setActiveIndex={props.setActiveIndex}
        handleKeyDown={props.handleKeyDown}
        firstInputRef={props.firstInputRef}
      />
      <Button
        type="button"
        variant="ghost"
        size="xs"
        onClick={() => props.onSendToWorkbench(props.currentValue, props.label)}
        title="Send to Workbench"
        className="text-slate-400 dark:text-slate-500 hover:text-blue-500">
        <Pin className="w-3.5 h-3.5" />
      </Button>

      {props.activeSlot === props.label && props.suggestions.length > 0 && (
        <SlotSuggestionsDropdown
          activeIndex={props.activeIndex}
          setActiveIndex={props.setActiveIndex}
          handSuggestions={props.handSuggestions}
          historySuggestions={props.historySuggestions}
          onSlotValueChange={props.onSlotValueChange}
          onSendToWorkbench={props.onSendToWorkbench}
          label={props.label}
          setActiveSlot={props.setActiveSlot}
          t={props.t}
        />
      )}
    </div>
  )
}

export const SlotField: React.FC<SlotFieldProps> = ({
  slot,
  index,
  currentValue,
  suggestions,
  handSuggestions,
  historySuggestions,
  onSlotValueChange,
  onSendToWorkbench,
  t,
  firstInputRef
}) => {
  const label = slot.label
  const sf = useSlotField({ label, suggestions, onSlotValueChange })

  return (
    <div
      onDragOver={sf.handleDragOver}
      onDragLeave={() => sf.setIsDragOver(false)}
      onDrop={sf.handleDrop}
      className={`p-2 rounded-lg border-2 transition-all relative space-y-1 ${
        sf.isDragOver
          ? "border-dashed border-blue-400 bg-blue-50/50 dark:bg-blue-950/20"
          : "border-transparent"
      }`}
      data-testid={`slot-zone-${label}`}>
      <label className="block text-xs font-medium text-slate-600 dark:text-slate-400">
        {label}
      </label>
      <SlotInputField
        label={label}
        slot={slot}
        index={index}
        currentValue={currentValue}
        suggestions={suggestions}
        handSuggestions={handSuggestions}
        historySuggestions={historySuggestions}
        onSlotValueChange={onSlotValueChange}
        onSendToWorkbench={onSendToWorkbench}
        t={t}
        firstInputRef={firstInputRef}
        activeSlot={sf.activeSlot}
        setActiveSlot={sf.setActiveSlot}
        activeIndex={sf.activeIndex}
        setActiveIndex={sf.setActiveIndex}
        handleKeyDown={sf.handleKeyDown}
      />
    </div>
  )
}
