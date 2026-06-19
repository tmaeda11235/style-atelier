import { Sparkles } from "lucide-react"
import React from "react"

export const BlendingOverlay: React.FC = () => (
  <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xs flex flex-col items-center justify-center z-50 animate-in fade-in duration-300">
    <div className="relative w-24 h-24 flex items-center justify-center">
      <div className="absolute inset-0 border-4 border-dashed border-teal-400 rounded-full animate-spin [animation-duration:2s]" />
      <div className="absolute inset-2 border border-purple-400 rounded-full animate-spin [animation-duration:4s] [animation-direction:reverse]" />
      <Sparkles className="w-8 h-8 text-yellow-300 animate-pulse" />
    </div>
    <span className="text-[10px] font-bold text-teal-300 mt-3 animate-pulse tracking-widest font-mono">
      ALCHEMY IN PROGRESS...
    </span>
  </div>
)
