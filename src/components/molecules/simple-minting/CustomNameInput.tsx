import React from "react"

import { Input } from "../../atoms/Input"

interface CustomNameInputProps {
  customName: string
  setCustomName: (name: string) => void
  currentName: string
  advanceIfStep: (step: string) => void
  t: any
}

export const CustomNameInput: React.FC<CustomNameInputProps> = ({
  customName,
  setCustomName,
  currentName,
  advanceIfStep,
  t
}) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
      {t.minting.cardName}
    </label>
    <Input
      type="text"
      value={customName}
      onChange={(e) => {
        setCustomName(e.target.value)
        advanceIfStep("title-input")
      }}
      placeholder={t.minting.enterCustomName}
      size="sm"
    />
    <div className="mt-1.5 text-xs text-slate-500 font-medium">
      {t.minting.preview}:{" "}
      <span className="font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-100/80 inline-block mt-0.5">
        {currentName}
      </span>
    </div>
  </div>
)
