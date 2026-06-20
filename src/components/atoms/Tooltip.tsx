import { type VariantProps } from "class-variance-authority"
import React from "react"

import { cn } from "../../lib/utils"
import { tooltipContentVariants } from "./Tooltip.variants"

interface TooltipProps extends Omit<
  VariantProps<typeof tooltipContentVariants>,
  "variant"
> {
  content: string
  children: React.ReactNode
  className?: string
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  position = "top",
  children,
  className
}) => {
  return (
    <div
      className={cn(
        "group/tooltip relative inline-block text-left select-none",
        className
      )}>
      {children}
      <div
        data-testid="tooltip-content"
        className={cn(
          tooltipContentVariants({ position, variant: "default" })
        )}>
        {content}
      </div>
    </div>
  )
}
