import { Gem } from "lucide-react"
import React from "react"

interface IllustrationProps {
  t: any
}

export const RarityIllustration: React.FC<IllustrationProps> = ({ t }) => {
  const mockT = t.onboarding.mock
  return (
    <div className="w-full h-32 bg-slate-900/50 rounded-lg flex items-center justify-center border border-slate-700/50 p-4 gap-2">
      <div className="flex gap-2">
        <span className="opacity-40 scale-90 border border-slate-700 bg-slate-800 text-[10px] font-bold px-2.5 py-1 rounded">
          {mockT.common}
        </span>
        <span className="bg-gradient-to-r from-cyan-500 to-blue-500 text-white text-xs font-black px-3.5 py-1.5 rounded-full shadow-lg shadow-cyan-500/30 animate-bounce ring-2 ring-cyan-300 flex items-center gap-1">
          <Gem className="w-3 h-3 text-cyan-200" /> {mockT.rare}
        </span>
        <span className="opacity-40 scale-90 border border-purple-900/50 bg-purple-950/30 text-purple-400 text-[10px] font-bold px-2.5 py-1 rounded">
          {mockT.epic}
        </span>
      </div>
    </div>
  )
}
