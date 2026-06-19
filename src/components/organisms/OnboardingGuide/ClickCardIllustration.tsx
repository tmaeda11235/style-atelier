import React from "react"

interface IllustrationProps {
  t: any
}

export const ClickCardIllustration: React.FC<IllustrationProps> = ({ t }) => {
  const mockT = t.onboarding.mock
  return (
    <div className="relative w-full h-32 bg-slate-900/50 rounded-lg flex flex-col items-center justify-end border border-slate-700/50 p-2 overflow-hidden">
      <div className="w-16 h-20 bg-gradient-to-b from-slate-800 to-slate-950 border border-rose-500/50 rounded p-1 shadow-lg flex flex-col justify-between absolute top-2 animate-pulse cursor-pointer">
        <div className="w-full h-8 bg-slate-700 rounded-sm"></div>
        <div className="text-[7px] text-center text-rose-400 font-bold">
          {mockT.clickCard}
        </div>
      </div>
      <div className="w-full bg-slate-950/80 border border-slate-800 rounded p-1.5 flex gap-2 justify-center z-10">
        <div className="w-10 h-6 bg-rose-500/10 border border-rose-500/40 rounded flex items-center justify-center">
          <span className="text-[8px] text-rose-400 font-bold">
            {mockT.activeCard}
          </span>
        </div>
        <div className="w-10 h-6 bg-slate-800 border border-slate-700 rounded flex items-center justify-center">
          <span className="text-[8px] text-slate-500">+</span>
        </div>
      </div>
    </div>
  )
}
