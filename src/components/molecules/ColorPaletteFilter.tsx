import React, { useCallback, useEffect, useRef, useState } from "react"

interface ColorOption {
  value: string
  label: string
  bg: string
}

interface ColorPaletteFilterProps {
  colorFilter: string
  setColorFilter: (color: string) => void
  colorOptions: ColorOption[]
  colorLabel?: string
  styleCardsCount: number
}

interface ColorButtonProps {
  colorOpt: ColorOption
  isSelected: boolean
  onClick: () => void
}

export function ColorButton({
  colorOpt,
  isSelected,
  onClick
}: ColorButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`w-3.5 h-3.5 rounded-full flex-shrink-0 transition-all border relative ${
        isSelected
          ? "scale-110 ring-1.5 ring-blue-500 ring-offset-0.5"
          : "hover:scale-105"
      }`}
      style={{
        background: colorOpt.bg,
        borderColor: colorOpt.value === "White" ? "#cbd5e1" : "transparent"
      }}
      title={colorOpt.label}>
      {isSelected && (
        <span
          className={`absolute inset-0 flex items-center justify-center text-[7px] font-black ${
            colorOpt.value === "White" || colorOpt.value === "Yellow"
              ? "text-slate-800"
              : "text-white"
          }`}>
          ✓
        </span>
      )}
    </button>
  )
}

interface ScrollButtonProps {
  direction: "left" | "right"
  onClick: () => void
}

export function ScrollButton({ direction, onClick }: ScrollButtonProps) {
  const isLeft = direction === "left"
  return (
    <button
      onClick={onClick}
      className={`absolute ${
        isLeft ? "left-0" : "right-0"
      } z-10 w-4 h-4 bg-white/95 dark:bg-slate-800/95 text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100 rounded-full flex items-center justify-center border border-slate-200 dark:border-slate-700 shadow hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors text-[9px] font-bold`}
      aria-label={`Scroll ${direction}`}>
      {isLeft ? "‹" : "›"}
    </button>
  )
}

function useHorizontalScroll(dependencies: any[]) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  const checkScroll = useCallback(() => {
    const el = scrollRef.current
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el
      setShowLeftArrow(scrollLeft > 1)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }, [])

  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      checkScroll()
      el.addEventListener("scroll", checkScroll)
      window.addEventListener("resize", checkScroll)

      const timer = setTimeout(checkScroll, 100)

      let resizeObserver: ResizeObserver | null = null
      if (typeof ResizeObserver !== "undefined") {
        resizeObserver = new ResizeObserver(() => {
          checkScroll()
        })
        resizeObserver.observe(el)
      }

      return () => {
        el.removeEventListener("scroll", checkScroll)
        window.removeEventListener("resize", checkScroll)
        clearTimeout(timer)
        if (resizeObserver) {
          resizeObserver.disconnect()
        }
      }
    }
  }, [checkScroll, ...dependencies])

  const scrollBy = (amount: number) => {
    const el = scrollRef.current
    if (el) {
      el.scrollBy({ left: amount, behavior: "smooth" })
    }
  }

  return { scrollRef, showLeftArrow, showRightArrow, scrollBy }
}

export function ColorPaletteFilter({
  colorFilter,
  setColorFilter,
  colorOptions,
  colorLabel = "Color:",
  styleCardsCount
}: ColorPaletteFilterProps) {
  const { scrollRef, showLeftArrow, showRightArrow, scrollBy } =
    useHorizontalScroll([styleCardsCount])

  return (
    <div className="flex gap-1 items-center mt-0.5 select-none w-full">
      <span className="text-[9px] text-slate-400 font-bold mr-1 flex-shrink-0">
        {colorLabel}
      </span>
      <div className="relative flex-1 flex items-center min-w-0">
        {showLeftArrow && (
          <ScrollButton direction="left" onClick={() => scrollBy(-100)} />
        )}
        <div
          ref={scrollRef}
          data-testid="color-scroll-container"
          className="flex gap-1 items-center overflow-x-auto pb-1 scrollbar-none w-full"
          style={{
            maskImage: `linear-gradient(to right, ${
              showLeftArrow ? "transparent" : "white"
            } 0%, white 12px, white calc(100% - 12px), ${
              showRightArrow ? "transparent" : "white"
            } 100%)`,
            WebkitMaskImage: `linear-gradient(to right, ${
              showLeftArrow ? "transparent" : "white"
            } 0%, white 12px, white calc(100% - 12px), ${
              showRightArrow ? "transparent" : "white"
            } 100%)`
          }}>
          {colorOptions.map((colorOpt) => (
            <ColorButton
              key={colorOpt.value}
              colorOpt={colorOpt}
              isSelected={colorFilter === colorOpt.value}
              onClick={() => setColorFilter(colorOpt.value)}
            />
          ))}
        </div>
        {showRightArrow && (
          <ScrollButton direction="right" onClick={() => scrollBy(100)} />
        )}
      </div>
    </div>
  )
}
