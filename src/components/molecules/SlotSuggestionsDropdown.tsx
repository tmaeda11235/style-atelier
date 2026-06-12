import { Pin } from "lucide-react"
import React from "react"

export interface SlotSuggestionsDropdownProps {
  activeIndex: number
  setActiveIndex: (idx: number) => void
  handSuggestions: { label: string; value: string }[]
  historySuggestions: { label: string; value: string }[]
  onSlotValueChange: (label: string, value: string) => void
  onSendToWorkbench: (value: string, label: string) => Promise<void>
  label: string
  setActiveSlot: (slot: string | null) => void
  t: any
}

const HandSuggestionsList = ({
  handSuggestions,
  activeIndex,
  onSlotValueChange,
  setActiveSlot,
  setActiveIndex,
  label,
  t
}: any) => {
  if (handSuggestions.length === 0) return null
  return (
    <div className="space-y-1">
      <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 px-1 uppercase tracking-wider">
        {t.workbench.fillFromWorkbench}
      </div>
      {handSuggestions.map((item: any, idx: number) => {
        const isSelected = activeIndex === idx
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
            onMouseEnter={() => setActiveIndex(idx)}
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
  )
}

const HistorySuggestionItem = (props: any) => {
  const globalIdx = props.handSuggestionsLength + props.idx
  const isSelected = props.activeIndex === globalIdx
  return (
    <div
      onMouseEnter={() => props.setActiveIndex(globalIdx)}
      className={`flex items-center justify-between rounded px-2 py-0.5 text-xs transition-colors ${
        isSelected
          ? "bg-blue-500 text-white"
          : "hover:bg-slate-100 dark:hover:bg-slate-800"
      }`}>
      <button
        type="button"
        onMouseDown={(e) => (
          e.preventDefault(),
          props.onSlotValueChange(props.label, props.item.value),
          props.setActiveSlot(null),
          props.setActiveIndex(-1)
        )}
        className={`flex-1 text-left text-xs truncate py-0.5 ${
          isSelected ? "text-white" : "text-slate-700 dark:text-slate-300"
        }`}>
        {props.item.label}
      </button>
      <button
        type="button"
        onMouseDown={(e) => (
          e.preventDefault(),
          props.onSendToWorkbench(props.item.value, props.label)
        )}
        title="Send this value to Workbench"
        className={`p-0.5 rounded ${
          isSelected
            ? "text-white hover:text-blue-200"
            : "text-slate-400 dark:text-slate-500 hover:text-blue-500"
        }`}>
        <Pin className="w-3 h-3" />
      </button>
    </div>
  )
}

const HistorySuggestionsList = ({
  historySuggestions,
  handSuggestionsLength,
  activeIndex,
  onSlotValueChange,
  onSendToWorkbench,
  setActiveSlot,
  setActiveIndex,
  label,
  t
}: any) => {
  if (historySuggestions.length === 0) return null
  return (
    <div className="space-y-1 pt-1.5 border-t border-slate-100 dark:border-slate-800">
      <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 px-1 uppercase tracking-wider">
        {t.workbench.recent}
      </div>
      {historySuggestions.map((item: any, idx: number) => (
        <HistorySuggestionItem
          key={`hist-${idx}`}
          item={item}
          idx={idx}
          handSuggestionsLength={handSuggestionsLength}
          activeIndex={activeIndex}
          onSlotValueChange={onSlotValueChange}
          onSendToWorkbench={onSendToWorkbench}
          setActiveSlot={setActiveSlot}
          setActiveIndex={setActiveIndex}
          label={label}
        />
      ))}
    </div>
  )
}

export const SlotSuggestionsDropdown: React.FC<
  SlotSuggestionsDropdownProps
> = ({
  activeIndex,
  setActiveIndex,
  handSuggestions,
  historySuggestions,
  onSlotValueChange,
  onSendToWorkbench,
  label,
  setActiveSlot,
  t
}) => {
  return (
    <div className="absolute left-0 right-0 top-full mt-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg shadow-lg z-50 p-1.5 max-h-48 overflow-y-auto space-y-1.5">
      <HandSuggestionsList
        handSuggestions={handSuggestions}
        activeIndex={activeIndex}
        onSlotValueChange={onSlotValueChange}
        setActiveSlot={setActiveSlot}
        setActiveIndex={setActiveIndex}
        label={label}
        t={t}
      />
      <HistorySuggestionsList
        historySuggestions={historySuggestions}
        handSuggestionsLength={handSuggestions.length}
        activeIndex={activeIndex}
        onSlotValueChange={onSlotValueChange}
        onSendToWorkbench={onSendToWorkbench}
        setActiveSlot={setActiveSlot}
        setActiveIndex={setActiveIndex}
        label={label}
        t={t}
      />
    </div>
  )
}
