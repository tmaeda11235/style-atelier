import { ChevronRight } from "lucide-react"
import React from "react"

interface IllustrationProps {
  t: any
}

export const MoveIllustration: React.FC<IllustrationProps> = ({ t }) => {
  const mockT = t.onboarding.mock
  return (
    <div className="relative w-full h-32 bg-slate-900/50 rounded-lg flex items-center justify-center border border-slate-700/50 overflow-hidden">
      <div className="absolute top-2 left-2 text-[10px] text-slate-500 font-mono">
        {mockT.midjourneyWebUi}
      </div>
      <div className="absolute top-2 right-2 text-[10px] text-slate-500 font-mono">
        {mockT.sidePanel}
      </div>
      <div className="w-16 h-16 bg-slate-800 rounded border border-slate-700 flex items-center justify-center shadow-lg animate-pulse">
        <span className="text-xl">{t.parameterArrayEditor.imageEmoji}</span>
      </div>
      <div className="mx-4 flex items-center justify-center text-slate-400 animate-bounce">
        <ChevronRight className="w-8 h-8 text-blue-400" />
      </div>
      <div className="w-20 h-20 bg-slate-800/80 rounded border-2 border-dashed border-blue-500/50 flex flex-col items-center justify-center p-1">
        <div className="w-full h-full bg-blue-500/10 rounded flex items-center justify-center">
          <span className="text-xs text-blue-400 font-bold font-sans">
            {mockT.dropHere}
          </span>
        </div>
      </div>
    </div>
  )
}
