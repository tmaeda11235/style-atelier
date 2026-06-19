import { Hammer } from "lucide-react"
import React from "react"

interface IllustrationProps {
  t: any
}

export const WorkbenchEditorIllustration: React.FC<IllustrationProps> = ({
  t
}) => {
  const mockT = t.onboarding.mock
  return (
    <div className="w-full h-32 bg-slate-900/50 rounded-lg flex flex-col items-center justify-center border border-slate-700/50 p-4 gap-2">
      <div className="w-full max-w-[240px] bg-slate-800 border border-indigo-500/30 rounded p-2 flex flex-col gap-1.5 shadow-md">
        <div className="flex justify-between items-center border-b border-slate-700 pb-1">
          <span className="text-[10px] text-slate-300 font-bold flex items-center gap-1">
            <Hammer className="w-3 h-3 text-indigo-400" />{" "}
            {mockT.workbenchEditor}
          </span>
          <span className="text-[8px] bg-indigo-500/20 text-indigo-400 font-mono px-1 rounded">
            {mockT.active}
          </span>
        </div>
        <div className="flex items-center gap-1 bg-slate-900/60 p-1.5 rounded border border-slate-700">
          <span className="text-[9px] text-slate-400">{mockT.hairColor}</span>
          <span className="text-[9px] text-white font-bold bg-indigo-500/20 border border-indigo-500/50 px-1.5 py-0.5 rounded animate-pulse">
            {mockT.neonCyan}
          </span>
        </div>
      </div>
    </div>
  )
}
