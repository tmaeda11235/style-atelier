import {
  BookUp2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Layers,
  Trash2,
  X
} from "lucide-react"
import React, { useEffect, useState } from "react"
import { createPortal } from "react-dom"
import iconUrl from "url:../../../assets/icon.png"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import { useHand } from "../../hooks/useHand"
import type { StyleCard } from "../../lib/db-schema"
import { buildPromptString } from "../../lib/prompt-utils"
import { RARITY_CONFIG } from "../../lib/rarity-config"
import { Button } from "../atoms/Button"
import { HelpTooltip } from "../atoms/HelpTooltip"
import { CardThumbnail } from "../molecules/CardThumbnail"

export interface HandBarProps {
  onNavigateToWorkbench?: () => void
  onOpenDetailCard?: (card: StyleCard) => void
}

export function HandBar({
  onNavigateToWorkbench,
  onOpenDetailCard
}: HandBarProps) {
  const { pinnedCards, unpinCard, clearHand, mergeCards } = useHand()
  const { expertFeatures } = useSettings()
  const { t } = useLanguage()

  const scrollRef = React.useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  // States for merging stack/cards
  const [isMergeOpen, setIsMergeOpen] = useState(false)
  const [baseCardId, setBaseCardId] = useState<string>("")
  const [consumeStates, setConsumeStates] = useState<Record<string, boolean>>(
    {}
  )

  // Collapsible state for HandBar
  const [isCollapsed, setIsCollapsed] = useState<boolean>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("handbar_collapsed")
      return saved === "true"
    }
    return false
  })

  // Watch pinned cards length to auto-expand
  const [prevCount, setPrevCount] = useState(pinnedCards.length)
  useEffect(() => {
    if (pinnedCards.length > prevCount) {
      setIsCollapsed(false)
      if (typeof window !== "undefined") {
        localStorage.setItem("handbar_collapsed", "false")
      }
    }
    setPrevCount(pinnedCards.length)
  }, [pinnedCards.length, prevCount])

  // Watch global drag start to auto-expand
  useEffect(() => {
    const handleDragStart = () => {
      setIsCollapsed(false)
      if (typeof window !== "undefined") {
        localStorage.setItem("handbar_collapsed", "false")
      }
    }
    if (typeof window !== "undefined") {
      window.addEventListener("dragstart", handleDragStart)
    }
    return () => {
      if (typeof window !== "undefined") {
        window.removeEventListener("dragstart", handleDragStart)
      }
    }
  }, [])

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev
      if (typeof window !== "undefined") {
        localStorage.setItem("handbar_collapsed", String(next))
      }
      return next
    })
  }

  const pinnedCardsDependency = pinnedCards
    .map((c) => `${c.id}-${c.updatedAt || 0}`)
    .join(",")

  const checkScroll = () => {
    const el = scrollRef.current
    if (el) {
      const { scrollLeft, scrollWidth, clientWidth } = el
      setShowLeftArrow(scrollLeft > 1)
      setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1)
    }
  }

  // Watch pinned cards and scroll positions to update arrow visibility
  useEffect(() => {
    checkScroll()
  }, [pinnedCardsDependency])

  // Watch scroll event and window resize
  useEffect(() => {
    const el = scrollRef.current
    if (el) {
      el.addEventListener("scroll", checkScroll)
      window.addEventListener("resize", checkScroll)
      const timer = setTimeout(checkScroll, 100)
      return () => {
        el.removeEventListener("scroll", checkScroll)
        window.removeEventListener("resize", checkScroll)
        clearTimeout(timer)
      }
    }
  }, [pinnedCards.length])

  // Clamp pinned cards to maximum 1 if multiCard feature is disabled
  useEffect(() => {
    if (!expertFeatures.multiCard && pinnedCards.length > 1) {
      const latest = pinnedCards[pinnedCards.length - 1]
      pinnedCards.forEach((c) => {
        if (c.id !== latest.id) {
          unpinCard(c.id)
        }
      })
    }
  }, [pinnedCardsDependency, expertFeatures.multiCard, unpinCard])

  // Synchronize merge state when pinned cards change
  useEffect(() => {
    if (pinnedCards.length >= 2) {
      const currentPinned = pinnedCards.some((c) => c.id === baseCardId)
      const defaultBase = currentPinned ? baseCardId : pinnedCards[0].id
      setBaseCardId(defaultBase)

      setConsumeStates((prev) => {
        const next = { ...prev }
        pinnedCards.forEach((c) => {
          if (c.id === defaultBase) {
            delete next[c.id]
          } else if (next[c.id] === undefined) {
            next[c.id] = true
          }
        })
        Object.keys(next).forEach((id) => {
          if (!pinnedCards.some((c) => c.id === id)) {
            delete next[id]
          }
        })
        return next
      })
    } else {
      setBaseCardId("")
      setConsumeStates({})
    }
  }, [pinnedCardsDependency, baseCardId])

  const handleSelectBaseCard = (cardId: string) => {
    setBaseCardId(cardId)
    setConsumeStates((prev) => {
      const next = { ...prev }
      delete next[cardId]
      pinnedCards.forEach((c) => {
        if (c.id !== cardId && next[c.id] === undefined) {
          next[c.id] = true
        }
      })
      return next
    })
  }

  const handleExecuteMerge = async () => {
    if (!baseCardId) return
    const representative = pinnedCards.find((c) => c.id === baseCardId)
    if (!representative) return

    const materials = pinnedCards.filter((c) => c.id !== baseCardId)

    try {
      await mergeCards(representative.id, materials, consumeStates)
      setIsMergeOpen(false)
    } catch (err) {
      console.error("Failed to merge style cards:", err)
    }
  }

  const baseCard = pinnedCards.find((c) => c.id === baseCardId)
  const additionalUses = pinnedCards
    .filter((c) => c.id !== baseCardId && consumeStates[c.id])
    .reduce((sum, c) => sum + (c.usageCount || 0), 0)
  const previewUsageCount = (baseCard?.usageCount || 0) + additionalUses

  // Always render the container, but hide content if empty
  // This helps confirm DOM existence during debugging
  if (pinnedCards.length === 0) return <div id="handbar-root" />

  return (
    <div
      id="handbar-root"
      onClick={
        isCollapsed
          ? () => {
              setIsCollapsed(false)
              if (typeof window !== "undefined") {
                localStorage.setItem("handbar_collapsed", "false")
              }
            }
          : undefined
      }
      className={`fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm border-t border-slate-200 dark:border-slate-800 shadow-lg z-50 transition-all duration-300 ease-in-out ${
        isCollapsed
          ? "cursor-pointer hover:bg-slate-50/95 dark:hover:bg-slate-800/95"
          : "cursor-default"
      }`}
      style={{
        transform: isCollapsed
          ? "translateY(calc(100% - 38px))"
          : "translateY(0)"
      }}>
      <div className="max-w-md mx-auto p-2">
        <div className="flex items-center justify-between mb-2 px-1">
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Workbench ({pinnedCards.length})
            </span>
            <Button
              variant="ghost"
              size="xs"
              onClick={(e) => {
                e.stopPropagation()
                toggleCollapse()
              }}
              className="text-slate-400 hover:text-blue-500 dark:hover:text-blue-400 p-0.5 h-auto"
              title={isCollapsed ? "展開" : "最小化"}
              data-testid="handbar-toggle-collapse-btn">
              {isCollapsed ? (
                <ChevronUp className="w-3.5 h-3.5" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5" />
              )}
            </Button>
          </div>
          {!isCollapsed && (
            <div className="flex gap-2">
              {pinnedCards.length >= 2 && expertFeatures.stack && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="secondary"
                    size="xs"
                    onClick={() => setIsMergeOpen(true)}
                    className="flex items-center justify-center bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/60 font-bold p-1"
                    data-testid="handbar-merge-btn"
                    title={t.mergeStack.merge}>
                    <Layers className="w-3.5 h-3.5" />
                  </Button>
                  <HelpTooltip
                    content={t.helpTooltips.stack}
                    position="top-right"
                  />
                </div>
              )}
              <Button
                variant="ghost"
                size="xs"
                onClick={clearHand}
                className="text-slate-400 hover:text-red-500 dark:hover:text-red-400 p-1 flex items-center justify-center"
                data-testid="handbar-clear-all-btn"
                title={t.workbench.clearAll}>
                <Trash2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          )}
        </div>
        <div className="relative group/scroll px-4">
          {/* Left fade overlay */}
          {showLeftArrow && (
            <div className="absolute left-4 top-0 bottom-0 w-8 bg-gradient-to-r from-white/95 dark:from-slate-900/95 to-transparent pointer-events-none z-10" />
          )}

          {/* Left scroll button */}
          {showLeftArrow && (
            <button
              onClick={() =>
                scrollRef.current?.scrollBy({ left: -80, behavior: "smooth" })
              }
              className="absolute left-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full p-1 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all opacity-40 hover:opacity-100 group-hover/scroll:opacity-100 focus:opacity-100"
              style={{ width: "20px", height: "20px" }}
              title="左へスクロール"
              data-testid="handbar-scroll-left-btn"
              type="button">
              <ChevronLeft className="w-3 h-3" />
            </button>
          )}

          <div
            ref={scrollRef}
            className={`flex overflow-x-auto pb-1.5 custom-scrollbar scroll-smooth ${
              pinnedCards.length >= 4 ? "gap-1" : "gap-2"
            }`}
            onScroll={checkScroll}>
            {pinnedCards.map((card, index) => {
              const config = RARITY_CONFIG[card.tier]
              const shouldStack = pinnedCards.length >= 4
              const stackClass = shouldStack && index > 0 ? "ml-[-16px]" : ""
              return (
                <div
                  key={card.id}
                  onClick={() => onOpenDetailCard?.(card)}
                  style={{ zIndex: index, position: "relative" }}
                  className={`cursor-pointer flex-shrink-0 transition-all duration-200 hover:-translate-y-1 hover:scale-105 hover:z-30 ${stackClass}`}>
                  <CardThumbnail
                    imageUrl={card.thumbnailData}
                    thumbnailImages={card.selectedThumbnails}
                    alt={card.name}
                    tier={card.tier}
                    size="sm"
                    onDeleteClick={(e) => {
                      e.stopPropagation()
                      unpinCard(card.id)
                    }}
                    className={`flex-shrink-0 border-2 transition-all ${config.borderClass}`}
                    draggable={true}
                    onDragStart={(e) => {
                      const text = buildPromptString(
                        card.promptSegments,
                        card.parameters
                      )
                      e.dataTransfer.setData("text/plain", text)
                    }}
                  />
                </div>
              )
            })}
            {/* Action Button: To Workbench */}
            <button
              onClick={onNavigateToWorkbench}
              className="flex-shrink-0 w-12 h-12 rounded-md border-2 border-dashed border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-400 hover:border-blue-400 dark:hover:border-blue-500 hover:text-blue-500 dark:hover:text-blue-400 transition-all bg-slate-50 dark:bg-slate-800/50"
              title="Workbenchを開く"
              data-testid="navigate-to-workbench-btn">
              <BookUp2 className="w-5 h-5" />
            </button>
          </div>

          {/* Right fade overlay */}
          {showRightArrow && (
            <div className="absolute right-4 top-0 bottom-0 w-8 bg-gradient-to-l from-white/95 dark:from-slate-900/95 to-transparent pointer-events-none z-10" />
          )}

          {/* Right scroll button */}
          {showRightArrow && (
            <button
              onClick={() =>
                scrollRef.current?.scrollBy({ left: 80, behavior: "smooth" })
              }
              className="absolute right-0 top-1/2 -translate-y-1/2 z-20 bg-white/90 dark:bg-slate-800/90 hover:bg-white dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-full p-1 shadow-md border border-slate-200 dark:border-slate-700 flex items-center justify-center transition-all opacity-40 hover:opacity-100 group-hover/scroll:opacity-100 focus:opacity-100"
              style={{ width: "20px", height: "20px" }}
              title="右へスクロール"
              data-testid="handbar-scroll-right-btn"
              type="button">
              <ChevronRight className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {isMergeOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20 dark:bg-slate-950/80 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200">
            <div className="w-full max-w-sm bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl overflow-hidden text-slate-800 dark:text-slate-200 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-b dark:border-slate-800 flex items-center justify-between">
                <h3 className="font-bold text-sm text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-blue-500" />
                  {t.mergeStack.title}
                </h3>
                <Button
                  variant="ghost"
                  size="xs"
                  onClick={() => setIsMergeOpen(false)}
                  className="text-slate-400 hover:text-slate-600">
                  <X className="w-4 h-4" />
                </Button>
              </div>

              <div className="p-4 flex-1 overflow-y-auto space-y-4">
                <p className="text-xs text-slate-500 leading-relaxed">
                  {t.mergeStack.description}
                </p>

                <div className="space-y-3">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    {t.mergeStack.representative}
                  </h4>
                  <div className="space-y-2">
                    {pinnedCards.map((c) => {
                      const isBase = c.id === baseCardId
                      return (
                        <div
                          key={c.id}
                          onClick={() => handleSelectBaseCard(c.id)}
                          className={`flex items-center gap-3 p-2 rounded-xl border-2 transition-all cursor-pointer ${
                            isBase
                              ? "border-blue-500 bg-blue-50/50 dark:bg-blue-900/30 shadow-sm"
                              : "border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50/30 dark:bg-slate-800/30"
                          }`}>
                          <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 border dark:border-slate-700 bg-white dark:bg-slate-800">
                            <img
                              src={
                                !c.thumbnailData ||
                                c.thumbnailData === "assets/icon.png"
                                  ? iconUrl
                                  : c.thumbnailData
                              }
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">
                              {c.name}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {t.mergeStack.uses.replace(
                                "{count}",
                                String(c.usageCount || 0)
                              )}
                            </p>
                          </div>
                          <div
                            className={`w-4 h-4 rounded-full border flex items-center justify-center ${isBase ? "border-blue-500 bg-blue-500" : "border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800"}`}>
                            {isBase && (
                              <div className="w-1.5 h-1.5 rounded-full bg-white" />
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>

                {pinnedCards.length > 1 && (
                  <div className="space-y-3 pt-2 border-t border-slate-100">
                    <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      {t.mergeStack.material}
                    </h4>
                    <div className="space-y-2">
                      {pinnedCards
                        .filter((c) => c.id !== baseCardId)
                        .map((c) => {
                          const isConsumed = consumeStates[c.id] ?? true
                          return (
                            <div
                              key={c.id}
                              data-testid={`material-row-${c.id}`}
                              className="flex items-center justify-between p-2 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/20 dark:bg-slate-800/20 gap-3">
                              <div className="flex items-center gap-2.5 min-w-0">
                                <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border bg-white">
                                  <img
                                    src={
                                      !c.thumbnailData ||
                                      c.thumbnailData === "assets/icon.png"
                                        ? iconUrl
                                        : c.thumbnailData
                                    }
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-slate-600 dark:text-slate-400 truncate">
                                    {c.name}
                                  </p>
                                  <p className="text-[9px] text-slate-400">
                                    {t.mergeStack.usesToTransfer.replace(
                                      "{count}",
                                      String(c.usageCount || 0)
                                    )}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() =>
                                    setConsumeStates((prev) => ({
                                      ...prev,
                                      [c.id]: !isConsumed
                                    }))
                                  }
                                  className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all border ${
                                    isConsumed
                                      ? "bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 border-red-200 dark:border-red-900 hover:bg-red-100 dark:hover:bg-red-900/50"
                                      : "bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700"
                                  }`}>
                                  {isConsumed
                                    ? t.mergeStack.consume
                                    : t.mergeStack.keep}
                                </button>
                              </div>
                            </div>
                          )
                        })}
                    </div>
                  </div>
                )}

                {baseCard && (
                  <div className="p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-200 dark:border-slate-700 space-y-1.5">
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>{t.mergeStack.baseCard}</span>
                      <span className="font-semibold truncate max-w-[150px]">
                        {baseCard.name}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-600">
                      <span>{t.mergeStack.combinedImages}</span>
                      <span className="font-semibold font-mono">
                        {t.mergeStack.imagesCount.replace(
                          "{count}",
                          String(
                            pinnedCards.reduce((acc, c) => {
                              const urls = [...(c.images || [])]
                              if (c.thumbnailData) urls.push(c.thumbnailData)
                              urls.forEach((u) => acc.add(u))
                              return acc
                            }, new Set<string>()).size
                          )
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300">
                      <span className="font-medium">
                        {t.mergeStack.previewUsage}
                      </span>
                      <div className="flex items-center gap-1 font-bold text-blue-600">
                        <span>{baseCard.usageCount || 0}</span>
                        {additionalUses > 0 && (
                          <>
                            <span className="text-[10px] text-slate-400 font-normal">
                              +{additionalUses}
                            </span>
                            <span>&rarr; {previewUsageCount}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="p-4 bg-slate-50 dark:bg-slate-800/50 border-t dark:border-slate-800 flex justify-end gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsMergeOpen(false)}>
                  {t.mergeStack.cancel}
                </Button>
                <Button
                  onClick={handleExecuteMerge}
                  className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1.5 shadow-sm shadow-blue-200"
                  data-testid="handbar-execute-merge-btn">
                  {t.mergeStack.merge}
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  )
}
