import React from "react"

interface IllustrationProps {
  t: any
}

export const BubblesIllustration: React.FC<IllustrationProps> = ({ t }) => {
  const mockT = t.onboarding.mock
  return (
    <div className="w-full h-32 bg-slate-900/50 rounded-lg flex flex-col items-center justify-center border border-slate-700/50 p-3 gap-2">
      <div className="text-[10px] text-slate-400 font-bold self-start">
        {mockT.promptBubbles}
      </div>
      <div className="flex flex-wrap gap-1.5 justify-center">
        <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-300">
          {mockT.aSamurai}
        </span>
        <span className="bg-emerald-500/20 border-2 border-emerald-400 px-2 py-0.5 rounded text-[10px] text-emerald-300 font-bold animate-pulse flex items-center gap-0.5">
          {mockT.slotNeonHair}
        </span>
        <span className="bg-slate-800 border border-slate-700 px-2 py-0.5 rounded text-[10px] text-slate-300">
          {mockT.detailedIllustration}
        </span>
      </div>
    </div>
  )
}
