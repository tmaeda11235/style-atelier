import { Send, X } from "lucide-react"
import React from "react"
import iconUrl from "url:../../../assets/icon.png"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSimpleWorkbenchModal } from "../../hooks/useSimpleWorkbenchModal"
import type { StyleCard } from "../../lib/db-schema"
import { Button } from "../atoms/Button"
import { OpfsImage } from "../atoms/OpfsImage"
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
  <div className="p-4 border-b flex items-center justify-between">
    <div className="flex items-center gap-2">
      <span className="text-lg">{t.cardIcon}</span>
      <div>
        <h3 className="text-sm font-black text-slate-800">{t.title}</h3>
        <p className="text-[10px] text-slate-400 font-bold truncate max-w-[200px]">
          {name}
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
)

const SimpleWorkbenchCardInfo = ({
  card,
  i18n
}: {
  card: StyleCard
  i18n: any
}) => (
  <div className="flex gap-4 items-start bg-slate-50 p-3 rounded-lg border border-slate-100">
    <div className="w-16 h-16 flex-shrink-0 rounded overflow-hidden border border-slate-200 shadow-sm">
      <OpfsImage
        src={card.thumbnailPath || card.thumbnailData || iconUrl}
        className="w-full h-full object-cover"
        alt={card.name}
      />
    </div>
    <div className="flex-1 min-w-0">
      <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400">
        {i18n.minting.cardName}
      </span>
      <p className="text-xs font-bold text-slate-800 truncate">{card.name}</p>
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
    <div className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
      <label className="block text-xs font-semibold text-slate-500">
        {t.slotVariables}
      </label>
      <div className="space-y-2">
        {slots.map((slot) => (
          <div key={slot.label} className="flex flex-col gap-1">
            <span className="text-[10px] font-bold text-slate-600 uppercase">
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
              className="bg-white border border-slate-200 rounded px-2.5 py-1.5 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
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
  <div className="p-4 border-t flex gap-2 bg-slate-50">
    <Button variant="ghost" className="flex-1" onClick={onClose}>
      {t.cancel}
    </Button>
    <Button
      className="flex-[2] bg-blue-600 hover:bg-blue-700 text-white font-bold"
      onClick={onInject}
      disabled={isInjecting}>
      <Send className="w-4 h-4 mr-2" />
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
      <label className="block text-xs font-semibold text-slate-500">
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
    <div className="absolute inset-0 bg-black/20 dark:bg-slate-900/60 backdrop-blur-sm z-[100] flex flex-col justify-end">
      <div className="bg-white rounded-t-xl max-h-[90%] flex flex-col shadow-2xl transition-all duration-300 transform translate-y-0">
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
