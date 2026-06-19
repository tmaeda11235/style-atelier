import { Sparkles } from "lucide-react"
import React from "react"

export const ShufflingOverlay: React.FC = () => (
  <div className="absolute inset-0 bg-slate-950/65 backdrop-blur-[1px] flex flex-col items-center justify-center z-50 animate-in fade-in duration-200">
    <div className="relative w-20 h-20 flex items-center justify-center">
      <div className="absolute inset-0 border-4 border-dashed border-violet-400 rounded-full animate-spin [animation-duration:1.5s]" />
      <div className="absolute inset-2 border border-indigo-400 rounded-full animate-spin [animation-duration:3s] [animation-direction:reverse]" />
      <Sparkles className="w-6 h-6 text-indigo-300 animate-pulse" />
    </div>
    <span className="text-[10px] font-bold text-violet-300 mt-3 animate-pulse tracking-widest font-mono">
      SHUFFLING RECIPE...
    </span>
  </div>
)
