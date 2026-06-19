import { Sparkles } from "lucide-react"
import React from "react"

import { Button } from "../../atoms/Button"

interface IllustrationProps {
  t: any
}

export const MintIllustration: React.FC<IllustrationProps> = ({ t }) => {
  const mockT = t.onboarding.mock
  return (
    <div className="w-full h-32 bg-slate-900/50 rounded-lg flex flex-col items-center justify-center border border-slate-700/50 p-4">
      <div className="bg-slate-800 p-2 rounded-lg border border-slate-700 w-full max-w-[200px] flex justify-between items-center shadow-md">
        <div className="flex items-center gap-2">
          <span className="text-lg">{t.parameterArrayEditor.imageEmoji}</span>
          <span className="text-[10px] text-slate-400 font-mono">#1234</span>
        </div>
        <Button size="sm" variant="primary" className="animate-pulse">
          <Sparkles className="w-3 h-3 mr-1" /> {mockT.mint}
        </Button>
      </div>
    </div>
  )
}
