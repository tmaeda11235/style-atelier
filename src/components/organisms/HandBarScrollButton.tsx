import { ChevronLeft, ChevronRight } from "lucide-react"
import React from "react"

export interface ScrollButtonProps {
  direction: "left" | "right"
  onClick: () => void
  show: boolean
  t: any
}

export function ScrollButton({
  direction,
  onClick,
  show,
  t
}: ScrollButtonProps) {
  if (!show) return null
  const isLeft = direction === "left"
  return (
    <button
      onClick={onClick}
      className={`absolute ${isLeft ? "left-0" : "right-0"} top-1/2 -translate-y-1/2 z-20 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full p-1 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all opacity-40 hover:opacity-100 group-hover/scroll:opacity-100 focus:opacity-100`}
      style={{ width: "20px", height: "20px" }}
      title={isLeft ? t.workbench.scrollLeft : t.workbench.scrollRight}
      data-testid={
        isLeft ? "handbar-scroll-left-btn" : "handbar-scroll-right-btn"
      }
      type="button">
      {isLeft ? (
        <ChevronLeft className="w-3 h-3" />
      ) : (
        <ChevronRight className="w-3 h-3" />
      )}
    </button>
  )
}
