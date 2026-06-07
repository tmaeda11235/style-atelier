import { HelpCircle } from "lucide-react"
import React from "react"

import { cn } from "../../lib/utils"

interface HelpTooltipProps {
  content: string
  position?: "top" | "bottom" | "left" | "right"
  className?: string
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  position = "top",
  className
}) => {
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2 after:content-[''] after:absolute after:top-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-t-slate-900",
    bottom:
      "top-full left-1/2 -translate-x-1/2 mt-2 after:content-[''] after:absolute after:bottom-full after:left-1/2 after:-translate-x-1/2 after:border-4 after:border-transparent after:border-b-slate-900",
    left: "right-full top-1/2 -translate-y-1/2 mr-2 after:content-[''] after:absolute after:left-full after:top-1/2 after:-translate-y-1/2 after:border-4 after:border-transparent after:border-l-slate-900",
    right:
      "left-full top-1/2 -translate-y-1/2 ml-2 after:content-[''] after:absolute after:right-full after:top-1/2 after:-translate-y-1/2 after:border-4 after:border-transparent after:border-r-slate-900"
  }

  return (
    <div
      className={cn(
        "group relative inline-block text-left select-none",
        className
      )}>
      <button
        type="button"
        className="text-slate-400 hover:text-slate-600 focus:outline-none transition-colors cursor-help p-0.5 rounded-full hover:bg-slate-100 flex items-center justify-center"
        aria-label="Help info"
        data-testid="help-tooltip-trigger">
        <HelpCircle className="w-3.5 h-3.5" />
      </button>
      <div
        data-testid="help-tooltip-content"
        className={cn(
          "absolute hidden group-hover:block group-focus-within:block bg-slate-900 text-white text-xs font-normal rounded-lg p-2.5 shadow-xl w-56 z-[9999] pointer-events-none leading-relaxed transition-all animate-in fade-in duration-150",
          positionClasses[position]
        )}>
        {content}
      </div>
    </div>
  )
}
