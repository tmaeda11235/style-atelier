import { Send, X } from "lucide-react"
import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSimpleWorkbenchModal } from "../../hooks/useSimpleWorkbenchModal"
import type { StyleCard } from "../../lib/db-schema"
import { Button } from "../atoms/Button"
import type { AlertType } from "../molecules/ConnectionAlert"
import { ParameterEditor } from "./ParameterEditor"
import { PromptBubbleEditor } from "./PromptBubbleEditor"

interface SimpleWorkbenchModalProps {
  card: StyleCard
  onClose: () => void
  addLog?: (msg: string) => void
  setAlertType: (type: AlertType | null) => void
}

const SimpleWorkbenchHeader = ({
  name,
  onClose,
  t
}: {
  name: string
  onClose: () => void
  t: any
}) => (
  <div className="p-4 border-b dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-900">
    <div className="flex items-center gap-2.5 min-w-0">
      <span className="text-xl filter drop-shadow-sm">{t.cardIcon}</span>
      <div className="min-w-0">
        <h3 className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
          {t.title}
        </h3>
        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[180px]">
          {name}
        </p>
      </div>
    </div>
    <button
      onClick={onClose}
      className="p-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-600 dark:hover:text-slate-300 transition-all duration-200"
      aria-label="Close"
      data-testid="simple-workbench-close-button">
      <X className="w-4 h-4" />
    </button>
  </div>
)

const SimpleWorkbenchCardInfo = ({
  card,
  i18n
}: {
  card: StyleCard
  i18n: any
}) => (
  <div className="flex gap-3 items-center bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-850 shadow-sm">
    <div className="w-14 h-14 flex-shrink-0 rounded-lg overflow-hidden border border-slate-200 dark:border-slate-800 shadow-sm">
      <img
        src={card.thumbnailData || "assets/icon.png"}
        className="w-full h-full object-cover"
        alt={card.name}
      />
    </div>
    <div className="flex-1 min-w-0">
      <span className="text-[9px] uppercase font-black tracking-widest text-slate-400 dark:text-slate-500">
        {i18n.minting.cardName}
      </span>
      <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">
        {card.name}
      </p>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-[9px] bg-slate-200/70 dark:bg-slate-800 px-1.5 py-0.5 rounded text-slate-600 dark:text-slate-400 font-bold">
          {card.tier}
        </span>
        {card.category && (
          <span className="text-[9px] bg-blue-50 dark:bg-blue-950/40 px-1.5 py-0.5 rounded text-blue-600 dark:text-blue-450 font-bold">
            {card.category}
          </span>
        )}
      </div>
    </div>
  </div>
)

const SimpleSlotInputSection = ({
  slots,
  slotValues,
  setSlotValues,
  t
}: {
  slots: { label: string; default: string }[]
  slotValues: Record<string, string>
  setSlotValues: React.Dispatch<React.SetStateAction<Record<string, string>>>
  t: any
}) => {
  if (slots.length === 0) return null
  return (
    <div className="space-y-2 bg-slate-50 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-100 dark:border-slate-850">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {t.slotVariables}
      </label>
      <div className="space-y-2">
        {slots.map((slot) => (
          <div key={slot.label} className="flex flex-col gap-1">
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              {slot.label}
            </span>
            <input
              type="text"
              value={slotValues[slot.label] ?? ""}
              onChange={(e) =>
                setSlotValues((prev) => ({
                  ...prev,
                  [slot.label]: e.target.value
                }))
              }
              placeholder={slot.default || `Enter ${slot.label}...`}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200"
              data-testid={`simple-slot-input-${slot.label}`}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

const SimpleWorkbenchFooter = ({
  onClose,
  onInject,
  isInjecting,
  t
}: {
  onClose: () => void
  onInject: () => void
  isInjecting: boolean
  t: any
}) => (
  <div className="p-4 border-t dark:border-slate-800 flex gap-2 bg-slate-50 dark:bg-slate-900">
    <Button
      variant="ghost"
      className="flex-1 text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-850 font-semibold text-xs py-2"
      onClick={onClose}
      data-testid="simple-workbench-cancel-button">
      {t.cancel}
    </Button>
    <Button
      className="flex-[2] bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-xs py-2 shadow-md hover:shadow-lg transition-all duration-200"
      onClick={onInject}
      disabled={isInjecting}>
      <Send className="w-3.5 h-3.5 mr-1.5" />
      {isInjecting ? t.injecting : t.tryOnMidjourney}
    </Button>
  </div>
)

const SimpleWorkbenchBody = ({
  card,
  i18n,
  t,
  editedSegments,
  setEditedSegments,
  editedParams,
  setEditedParams,
  slots,
  slotValues,
  setSlotValues
}: any) => (
  <div className="flex-1 overflow-y-auto p-4 space-y-4">
    <SimpleWorkbenchCardInfo card={card} i18n={i18n} />
    <div className="space-y-1">
      <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
        {t.promptPreview}
      </label>
      <PromptBubbleEditor
        initialSegments={editedSegments}
        onChange={setEditedSegments}
        tier={card.tier}
      />
    </div>
    <SimpleSlotInputSection
      slots={slots}
      slotValues={slotValues}
      setSlotValues={setSlotValues}
      t={t}
    />
    <ParameterEditor parameters={editedParams} onChange={setEditedParams} />
  </div>
)

export function SimpleWorkbenchModal({
  card,
  onClose,
  addLog,
  setAlertType
}: SimpleWorkbenchModalProps) {
  const swm = useSimpleWorkbenchModal({ card, addLog, setAlertType })
  const { t: i18n } = useLanguage()
  const t = i18n.simpleWorkbench

  const slots = swm.editedSegments.reduce<{ label: string; default: string }[]>(
    (acc, seg) => {
      if (seg.type === "slot" && !acc.some((s) => s.label === seg.label)) {
        acc.push({ label: seg.label, default: seg.default })
      }
      return acc
    },
    []
  )

  return (
    <div className="absolute inset-0 bg-slate-950/40 dark:bg-slate-950/70 backdrop-blur-[2px] z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="modal-content" data-testid="simple-workbench-modal">
        <SimpleWorkbenchHeader name={card.name} onClose={onClose} t={t} />
        <SimpleWorkbenchBody
          card={card}
          i18n={i18n}
          t={t}
          editedSegments={swm.editedSegments}
          setEditedSegments={swm.setEditedSegments}
          editedParams={swm.editedParams}
          setEditedParams={swm.setEditedParams}
          slots={slots}
          slotValues={swm.slotValues}
          setSlotValues={swm.setSlotValues}
        />
        <SimpleWorkbenchFooter
          onClose={onClose}
          onInject={swm.handleInjectPrompt}
          isInjecting={swm.isInjecting}
          t={t}
        />
      </div>
    </div>
  )
}
