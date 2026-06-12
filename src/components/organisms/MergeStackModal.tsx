import { Layers, X } from "lucide-react"
import React, { useEffect, useState } from "react"
import iconUrl from "url:../../../assets/icon.png"

import { useLanguage } from "../../contexts/LanguageContext"
import type { StyleCard } from "../../lib/db-schema"
import { Button } from "../atoms/Button"

/**
 * Props for the MergeStackModal component.
 */
export interface MergeStackModalProps {
  /** Controlling whether the modal is visible */
  isOpen: boolean
  /** Callback to close the modal */
  onClose: () => void
  /** The cards currently loaded in the Workbench to be merged */
  workbenchCards: StyleCard[]
  /** Callback triggered when the merge operation is executed */
  onExecuteMerge: (
    baseCardId: string,
    consumeStates: Record<string, boolean>
  ) => Promise<void>
}

/**
 * MergeStackModal component allows users to select a representative (base) card
 * from a stack of cards and choose which of the remaining material cards should
 * be consumed to transfer their usage count.
 */
export const MergeStackModal: React.FC<MergeStackModalProps> = ({
  isOpen,
  onClose,
  workbenchCards,
  onExecuteMerge
}) => {
  const { t: i18n } = useLanguage()
  const t = i18n.mergeStack

  const [baseCardId, setBaseCardId] = useState<string>("")
  const [consumeStates, setConsumeStates] = useState<Record<string, boolean>>(
    {}
  )
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Initialize and synchronize states when modal opens or cards change
  useEffect(() => {
    if (isOpen && workbenchCards.length >= 2) {
      const defaultBase = workbenchCards[0].id
      setBaseCardId(defaultBase)

      const initialConsume: Record<string, boolean> = {}
      workbenchCards.forEach((c) => {
        if (c.id !== defaultBase) {
          initialConsume[c.id] = true
        }
      })
      setConsumeStates(initialConsume)
    } else if (!isOpen) {
      setBaseCardId("")
      setConsumeStates({})
    }
  }, [workbenchCards, isOpen])

  if (!isOpen) return null

  const handleSelectBaseCard = (cardId: string) => {
    setBaseCardId(cardId)
    setConsumeStates((prev) => {
      const next = { ...prev }
      delete next[cardId]
      workbenchCards.forEach((c) => {
        if (c.id !== cardId && next[c.id] === undefined) {
          next[c.id] = true
        }
      })
      return next
    })
  }

  const handleMergeClick = async () => {
    if (!baseCardId) return
    setIsSubmitting(true)
    try {
      await onExecuteMerge(baseCardId, consumeStates)
    } finally {
      setIsSubmitting(false)
    }
  }

  const baseCard = workbenchCards.find((c) => c.id === baseCardId)
  const additionalUses = workbenchCards
    .filter((c) => c.id !== baseCardId && consumeStates[c.id])
    .reduce((sum, c) => sum + (c.usageCount || 0), 0)
  const previewUsageCount = (baseCard?.usageCount || 0) + additionalUses

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 dark:bg-slate-950/80 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-blue-500" />
            {t.title}
          </h3>
          <Button
            variant="ghost"
            size="xs"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600">
            <X className="w-4 h-4" />
          </Button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto space-y-4">
          <p className="text-xs text-slate-500 leading-relaxed">
            {t.description}
          </p>

          <div className="space-y-3">
            <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {t.representative}
            </h4>
            <div className="space-y-2">
              {workbenchCards.map((c) => {
                const isBase = c.id === baseCardId
                return (
                  <div
                    key={c.id}
                    onClick={() => handleSelectBaseCard(c.id)}
                    className={`flex items-center gap-3 p-2 rounded-xl border-2 transition-all cursor-pointer ${
                      isBase
                        ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/30 shadow-sm"
                        : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30"
                    }`}>
                    <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 border dark:border-slate-700 bg-white dark:bg-slate-800">
                      <img
                        src={
                          !c.thumbnailData ||
                          c.thumbnailData === "assets/icon.png"
                            ? iconUrl
                            : c.thumbnailData
                        }
                        className="w-full h-full object-cover"
                        alt={c.name}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                        {c.name}
                      </p>
                      <p className="text-[10px] text-slate-400">
                        {t.uses.replace("{count}", String(c.usageCount || 0))}
                      </p>
                    </div>
                    <div
                      className={`w-4 h-4 rounded-full border flex items-center justify-center ${
                        isBase
                          ? "border-blue-500 bg-blue-500"
                          : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"
                      }`}>
                      {isBase && (
                        <div className="w-1.5 h-1.5 rounded-full bg-white" />
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>

          {workbenchCards.length > 1 && (
            <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {t.material}
              </h4>
              <div className="space-y-2">
                {workbenchCards
                  .filter((c) => c.id !== baseCardId)
                  .map((c) => {
                    const isConsumed = consumeStates[c.id] ?? true
                    return (
                      <div
                        key={c.id}
                        data-testid={`material-row-${c.id}`}
                        className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/20 gap-3">
                        <div className="flex items-center gap-2.5 min-w-0">
                          <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border bg-white">
                            <img
                              src={
                                !c.thumbnailData ||
                                c.thumbnailData === "assets/icon.png"
                                  ? iconUrl
                                  : c.thumbnailData
                              }
                              className="w-full h-full object-cover"
                              alt={c.name}
                            />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">
                              {c.name}
                            </p>
                            <p className="text-[9px] text-slate-400">
                              {t.usesToTransfer.replace(
                                "{count}",
                                String(c.usageCount || 0)
                              )}
                            </p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setConsumeStates((prev) => ({
                                ...prev,
                                [c.id]: !isConsumed
                              }))
                            }
                            className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all border ${
                              isConsumed
                                ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900/50"
                                : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                            }`}>
                            {isConsumed ? t.consume : t.keep}
                          </button>
                        </div>
                      </div>
                    )
                  })}
              </div>
            </div>
          )}

          {baseCard && (
            <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-150 dark:border-slate-700 space-y-1.5">
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>{t.baseCard}</span>
                <span className="font-semibold truncate max-w-[150px]">
                  {baseCard.name}
                </span>
              </div>
              <div className="flex justify-between text-[11px] text-slate-600">
                <span>{t.combinedImages}</span>
                <span className="font-semibold font-mono">
                  {t.imagesCount.replace(
                    "{count}",
                    String(
                      workbenchCards.reduce((acc, c) => {
                        const urls = [...(c.images || [])]
                        if (c.thumbnailData) urls.push(c.thumbnailData)
                        urls.forEach((u) => acc.add(u))
                        return acc
                      }, new Set<string>()).size
                    )
                  )}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                <span className="font-medium">{t.previewUsage}</span>
                <div className="flex items-center gap-1 font-bold text-blue-600">
                  <span>{baseCard.usageCount || 0}</span>
                  {additionalUses > 0 && (
                    <>
                      <span className="text-[10px] text-slate-400 font-normal">
                        +{additionalUses}
                      </span>
                      <span>&rarr; {previewUsageCount}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 flex justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}>
            {t.cancel}
          </Button>
          <Button
            onClick={handleMergeClick}
            disabled={isSubmitting || !baseCardId}
            data-testid="handbar-execute-merge-btn"
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1.5 shadow-sm shadow-blue-200">
            {isSubmitting ? t.merging : t.merge}
          </Button>
        </div>
      </div>
    </div>
  )
}
