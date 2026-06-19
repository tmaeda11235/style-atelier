import { Beaker, Download, Save, Send, Trash2 } from "lucide-react"
import React from "react"

import { Button } from "~components/atoms/Button"
import type { StyleCard } from "~shared/lib/db-schema"

interface ActionButtonsProps {
  t: any
  expertFeatures: any
  card: StyleCard
  onDelete?: (cardId: string) => Promise<void>
  onClose: () => void
  handleExportCard: () => void
  isExporting: boolean
  onSendToWorkbench?: (card: StyleCard) => Promise<void>
  handleTryOnMidjourney: () => void
  onSaveClick: () => void
  setShowDeleteConfirm: (v: boolean) => void
}

function Row1SecondaryActions({
  t,
  onDelete,
  onClose,
  handleExportCard,
  isExporting,
  setShowDeleteConfirm
}: {
  t: any
  onDelete?: (cardId: string) => Promise<void>
  onClose: () => void
  handleExportCard: () => void
  isExporting: boolean
  setShowDeleteConfirm: (v: boolean) => void
}) {
  return (
    <div className="flex justify-between items-center gap-2">
      <div className="flex gap-1.5">
        {onDelete && (
          <Button
            variant="danger"
            onClick={() => setShowDeleteConfirm(true)}
            className="flex items-center gap-1"
            data-testid="delete-card-button">
            <Trash2 className="w-3.5 h-3.5" />
            {t.cardDetail.delete}
          </Button>
        )}
        <Button variant="ghost" onClick={onClose} className="px-2">
          {t.cardDetail.cancel}
        </Button>
      </div>
      <Button
        variant="outline"
        onClick={handleExportCard}
        disabled={isExporting}
        className="flex items-center gap-1 border-slate-300 hover:bg-slate-50 text-slate-700 px-2.5"
        data-testid="export-card-button">
        <Download className="w-3.5 h-3.5" />
        {isExporting ? t.cardDetail.exporting : t.cardDetail.export}
      </Button>
    </div>
  )
}

function Row2PrimaryActions({
  t,
  expertFeatures,
  card,
  onSendToWorkbench,
  handleTryOnMidjourney,
  onSaveClick
}: {
  t: any
  expertFeatures: any
  card: StyleCard
  onSendToWorkbench?: (card: StyleCard) => Promise<void>
  handleTryOnMidjourney: () => void
  onSaveClick: () => void
}) {
  return (
    <div className="flex gap-2 mt-1">
      {onSendToWorkbench && (
        <Button
          variant="outline"
          onClick={() => onSendToWorkbench(card)}
          className="px-3 border-slate-300 hover:bg-slate-50 text-slate-700"
          title={t.cardDetail.sendToWorkbench}
          data-testid="detail-quick-send-button">
          <Beaker className="w-4.5 h-4.5" />
        </Button>
      )}
      <Button
        variant="secondary"
        onClick={handleTryOnMidjourney}
        className="flex-1 flex items-center justify-center gap-1.5 py-2">
        <Send className="w-4 h-4" />
        {t.cardDetail.inject}
      </Button>
      {expertFeatures.cardEditing && (
        <Button
          onClick={onSaveClick}
          className="flex-1 bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center gap-1.5 py-2">
          <Save className="w-4 h-4" />
          {t.cardDetail.save}
        </Button>
      )}
    </div>
  )
}

export function ActionButtons(props: ActionButtonsProps) {
  return (
    <div className="p-4 bg-white shadow-t-sm flex flex-col gap-2 border-t z-10">
      <Row1SecondaryActions {...props} />
      <Row2PrimaryActions {...props} />
    </div>
  )
}
