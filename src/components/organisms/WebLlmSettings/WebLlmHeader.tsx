import { Cpu } from "lucide-react"
import React from "react"

import { HelpTooltip } from "../../atoms/HelpTooltip"

export function WebLlmHeader({ title, desc }: { title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="p-2 bg-blue-500/10 dark:bg-blue-400/10 rounded-xl text-blue-600 dark:text-blue-400">
        <Cpu className="w-5 h-5" />
      </div>
      <div className="space-y-1">
        <h4 className="text-sm font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          {title}
          <HelpTooltip content={desc} position="top-left" />
        </h4>
      </div>
    </div>
  )
}
