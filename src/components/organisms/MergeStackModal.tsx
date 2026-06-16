import { Layers, X } from "lucide-react"
import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useMergeStack } from "../../hooks/useMergeStack"
import type { StyleCard } from "../../lib/db-schema"
import { Button } from "../atoms/Button"
import { MaterialCardList } from "./MergeStackMaterialList"
import { RepresentativeCardList } from "./MergeStackRepresentativeList"

export interface MergeStackModalProps {
  isOpen: boolean
  onClose: () => void
  workbenchCards: StyleCard[]
  onExecuteMerge: (
    baseCardId: string,
    consumeStates: Record<string, boolean>
  ) => Promise<void>
}

export const MergeStackModal: React.FC<MergeStackModalProps> = ({
  isOpen,
  onClose,
  workbenchCards,
  onExecuteMerge
}) => {
  const { t: i18n } = useLanguage()
  const t = i18n.mergeStack

  const {
    baseCardId,
    consumeStates,
    isSubmitting,
    handleSelectBaseCard,
    handleToggleConsume,
    handleMergeClick,
    baseCard,
    additionalUses,
    previewUsageCount
  } = useMergeStack({
    isOpen,
    workbenchCards,
    onExecuteMerge
  })

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 dark:bg-slate-950/80 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
        <MergeStackHeader onClose={onClose} title={t.title} />
        <MergeStackBody
          workbenchCards={workbenchCards}
          baseCardId={baseCardId}
          consumeStates={consumeStates}
          handleSelectBaseCard={handleSelectBaseCard}
          handleToggleConsume={handleToggleConsume}
          baseCard={baseCard}
          additionalUses={additionalUses}
          previewUsageCount={previewUsageCount}
          t={t}
        />
        <MergeStackFooter
          onClose={onClose}
          onMerge={handleMergeClick}
          isSubmitting={isSubmitting}
          canMerge={!!baseCardId}
          t={t}
        />
      </div>
    </div>
  )
}

const MergeStackHeader: React.FC<{ onClose: () => void; title: string }> = ({
  onClose,
  title
}) => (
  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex items-center justify-between">
    <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
      <Layers className="w-4 h-4 text-blue-500" />
      {title}
    </h3>
    <Button
      variant="ghost"
      size="xs"
      onClick={onClose}
      className="text-slate-400 hover:text-slate-600">
      <X className="w-4 h-4" />
    </Button>
  </div>
)

interface MergeStackFooterProps {
  onClose: () => void
  onMerge: () => void
  isSubmitting: boolean
  canMerge: boolean
  t: {
    cancel: string
    merging: string
    merge: string
  }
}

const MergeStackFooter: React.FC<MergeStackFooterProps> = ({
  onClose,
  onMerge,
  isSubmitting,
  canMerge,
  t
}) => (
  <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 flex justify-end gap-2">
    <Button variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
      {t.cancel}
    </Button>
    <Button
      onClick={onMerge}
      disabled={isSubmitting || !canMerge}
      data-testid="handbar-execute-merge-btn"
      className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1.5 shadow-sm shadow-blue-200">
      {isSubmitting ? t.merging : t.merge}
    </Button>
  </div>
)

interface MergePreviewSummaryProps {
  baseCard: StyleCard
  workbenchCards: StyleCard[]
  additionalUses: number
  previewUsageCount: number
  t: {
    baseCard: string
    combinedImages: string
    imagesCount: string
    previewUsage: string
  }
}

const MergePreviewSummary: React.FC<MergePreviewSummaryProps> = ({
  baseCard,
  workbenchCards,
  additionalUses,
  previewUsageCount,
  t
}) => {
  const combinedImagesCount = workbenchCards.reduce((acc, c) => {
    const urls = [...(c.images || [])]
    if (c.thumbnailData) urls.push(c.thumbnailData)
    urls.forEach((u) => acc.add(u))
    return acc
  }, new Set<string>()).size

  return (
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
          {t.imagesCount.replace("{count}", String(combinedImagesCount))}
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
  )
}

interface MergeStackBodyProps {
  workbenchCards: StyleCard[]
  baseCardId: string
  consumeStates: Record<string, boolean>
  handleSelectBaseCard: (cardId: string) => void
  handleToggleConsume: (cardId: string) => void
  baseCard: StyleCard | undefined
  additionalUses: number
  previewUsageCount: number
  t: any
}

const MergeStackBody: React.FC<MergeStackBodyProps> = ({
  workbenchCards,
  baseCardId,
  consumeStates,
  handleSelectBaseCard,
  handleToggleConsume,
  baseCard,
  additionalUses,
  previewUsageCount,
  t
}) => (
  <div className="p-4 flex-1 overflow-y-auto space-y-4">
    <p className="text-xs text-slate-500 leading-relaxed">{t.description}</p>
    <div className="space-y-3">
      <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
        {t.representative}
      </h4>
      <RepresentativeCardList
        workbenchCards={workbenchCards}
        baseCardId={baseCardId}
        onSelectBaseCard={handleSelectBaseCard}
        t={t}
      />
    </div>
    {workbenchCards.length > 1 && (
      <div className="space-y-3 pt-2 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
          {t.material}
        </h4>
        <MaterialCardList
          workbenchCards={workbenchCards}
          baseCardId={baseCardId}
          consumeStates={consumeStates}
          onToggleConsume={handleToggleConsume}
          t={t}
        />
      </div>
    )}
    {baseCard && (
      <MergePreviewSummary
        baseCard={baseCard}
        workbenchCards={workbenchCards}
        additionalUses={additionalUses}
        previewUsageCount={previewUsageCount}
        t={t}
      />
    )}
  </div>
)
