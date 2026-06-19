import React from "react"

import { Button } from "../../atoms/Button"

interface FooterActionsProps {
  onCancelMinting: () => void
  onSaveMintedCard: () => Promise<void>
  t: any
}

export const FooterActions: React.FC<FooterActionsProps> = ({
  onCancelMinting,
  onSaveMintedCard,
  t
}) => (
  <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end">
    <Button
      variant="ghost"
      onClick={onCancelMinting}
      className="h-9 text-xs rounded-xl hover:bg-slate-200/50">
      {t.minting.cancel}
    </Button>
    <Button
      onClick={onSaveMintedCard}
      className="h-9 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-md hover:from-blue-700 hover:to-indigo-700 font-bold px-4">
      {t.minting.saveToLibrary}
    </Button>
  </div>
)
