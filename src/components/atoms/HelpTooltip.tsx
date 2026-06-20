import { type VariantProps } from "class-variance-authority"
import { HelpCircle } from "lucide-react"
import React from "react"

import { cn } from "../../lib/utils"
import { tooltipContentVariants } from "./Tooltip.variants"

interface HelpTooltipProps extends Omit<
  VariantProps<typeof tooltipContentVariants>,
  "variant"
> {
  content: string
  className?: string
}

export const HelpTooltip: React.FC<HelpTooltipProps> = ({
  content,
  position = "top",
  className
}) => {
  return (
    <div
      className={cn(
        "group/tooltip relative inline-block text-left select-none",
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
        className={cn(tooltipContentVariants({ position, variant: "help" }))}>
        {content}
      </div>
    </div>
  )
}
