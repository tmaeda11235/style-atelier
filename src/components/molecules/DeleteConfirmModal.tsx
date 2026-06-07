import { Trash2 } from "lucide-react"
import React from "react"

import { Button } from "../atoms/Button"

interface DeleteConfirmModalProps {
  isOpen: boolean
  cardName: string
  onClose: () => void
  onConfirm: () => Promise<void>
}

export function DeleteConfirmModal({
  isOpen,
  cardName,
  onClose,
  onConfirm
}: DeleteConfirmModalProps) {
  if (!isOpen) return null

  return (
    <div
      data-testid="delete-confirm-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden p-6 space-y-4 animate-in zoom-in-95 duration-200">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center text-red-600">
            <Trash2 className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 text-center">
            Cardを削除しますか？
          </h3>
          <p className="text-xs text-slate-500 leading-relaxed text-center">
            この操作は取り消せません。"{cardName}"
            をライブラリから完全に削除します。
          </p>
        </div>
        <div className="flex gap-3">
          <Button
            variant="outline"
            fullWidth
            onClick={onClose}
            data-testid="delete-confirm-cancel-button">
            キャンセル
          </Button>
          <Button
            variant="danger"
            fullWidth
            onClick={onConfirm}
            data-testid="delete-confirm-ok-button">
            削除する
          </Button>
        </div>
      </div>
    </div>
  )
}
