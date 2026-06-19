import React from "react"

import { Input } from "../../atoms/Input"

interface IllustrationProps {
  t: any
}

export const TitleIllustration: React.FC<IllustrationProps> = ({ t }) => {
  const mockT = t.onboarding.mock
  return (
    <div className="w-full h-32 bg-slate-900/50 rounded-lg flex flex-col items-center justify-center border border-slate-700/50 p-4 gap-2">
      <label className="text-xs text-purple-300 font-bold self-start pl-4">
        {mockT.cardName}
      </label>
      <div className="relative w-full max-w-[220px]">
        <Input
          type="text"
          readOnly
          value={mockT.neonCyberpunkSamurai}
          className="w-full focus:outline-none"
        />
        <span className="absolute right-2 top-2 text-[10px] text-purple-400 font-bold animate-pulse">
          {mockT.title}
        </span>
      </div>
    </div>
  )
}
