import React, { useState, useEffect } from "react"
import { useHand } from "../../hooks/useHand"
import { RARITY_CONFIG } from "../../lib/rarity-config"
import { Button } from "../atoms/Button"
import { CardThumbnail } from "../molecules/CardThumbnail"
import { BookUp2, Layers, X } from "lucide-react"
import { db } from "../../lib/db"
import type { StyleCard } from "../../lib/db-schema"

export interface HandBarProps {
  onNavigateToWorkbench?: () => void
  onOpenDetailCard?: (card: StyleCard) => void
}

export function HandBar({ onNavigateToWorkbench, onOpenDetailCard }: HandBarProps) {
  const { pinnedCards, unpinCard, clearHand } = useHand()

  // States for merging stack/cards
  const [isMergeOpen, setIsMergeOpen] = useState(false)
  const [baseCardId, setBaseCardId] = useState<string>("")
  const [consumeStates, setConsumeStates] = useState<Record<string, boolean>>({})

  const pinnedCardsDependency = pinnedCards.map(c => `${c.id}-${c.updatedAt || 0}`).join(",")

  // Synchronize merge state when pinned cards change
  useEffect(() => {
    if (pinnedCards.length >= 2) {
      const currentPinned = pinnedCards.some(c => c.id === baseCardId)
      const defaultBase = currentPinned ? baseCardId : pinnedCards[0].id
      setBaseCardId(defaultBase)

      setConsumeStates(prev => {
        const next = { ...prev }
        pinnedCards.forEach(c => {
          if (c.id === defaultBase) {
            delete next[c.id]
          } else if (next[c.id] === undefined) {
            next[c.id] = true
          }
        })
        Object.keys(next).forEach(id => {
          if (!pinnedCards.some(c => c.id === id)) {
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
    setConsumeStates(prev => {
      const next = { ...prev }
      delete next[cardId]
      pinnedCards.forEach(c => {
        if (c.id !== cardId && next[c.id] === undefined) {
          next[c.id] = true
        }
      })
      return next
    })
  }

  const handleExecuteMerge = async () => {
    if (!baseCardId) return
    const representative = pinnedCards.find(c => c.id === baseCardId)
    if (!representative) return

    const materials = pinnedCards.filter(c => c.id !== baseCardId)

    try {
      await db.transaction("rw", db.styleCards, async () => {
        const mergedImages = [...(representative.images || [])]
        if (representative.thumbnailData && !mergedImages.includes(representative.thumbnailData)) {
          mergedImages.push(representative.thumbnailData)
        }

        const mergedJobIds = [...(representative.associatedJobIds || [])]
        if (representative.jobId && !mergedJobIds.includes(representative.jobId)) {
          mergedJobIds.push(representative.jobId)
        }

        let extraUsageCount = 0

        for (const mat of materials) {
          if (mat.images && mat.images.length > 0) {
            mat.images.forEach(img => {
              if (!mergedImages.includes(img)) mergedImages.push(img)
            })
          } else if (mat.thumbnailData && !mergedImages.includes(mat.thumbnailData)) {
            mergedImages.push(mat.thumbnailData)
          }

          if (mat.jobId && !mergedJobIds.includes(mat.jobId)) {
            mergedJobIds.push(mat.jobId)
          }
          if (mat.associatedJobIds && mat.associatedJobIds.length > 0) {
            mat.associatedJobIds.forEach(jid => {
              if (!mergedJobIds.includes(jid)) mergedJobIds.push(jid)
            })
          }

          const isConsumed = consumeStates[mat.id]
          if (isConsumed) {
            extraUsageCount += (mat.usageCount || 0)
            await db.styleCards.delete(mat.id)
          }
        }

        await db.styleCards.update(representative.id, {
          images: mergedImages,
          associatedJobIds: mergedJobIds,
          usageCount: (representative.usageCount || 0) + extraUsageCount,
          updatedAt: Date.now()
        })
      })

      setIsMergeOpen(false)
    } catch (err) {
      console.error("Failed to merge style cards:", err)
    }
  }

  const baseCard = pinnedCards.find(c => c.id === baseCardId)
  const additionalUses = pinnedCards
    .filter(c => c.id !== baseCardId && consumeStates[c.id])
    .reduce((sum, c) => sum + (c.usageCount || 0), 0)
  const previewUsageCount = (baseCard?.usageCount || 0) + additionalUses

  // Always render the container, but hide content if empty
  // This helps confirm DOM existence during debugging
  if (pinnedCards.length === 0) return <div id="handbar-root" />

  return (
    <div id="handbar-root" className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-lg z-50 transition-all">
      <div className="max-w-md mx-auto p-2">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Workbench ({pinnedCards.length})</span>
          <div className="flex gap-2">
            {pinnedCards.length >= 2 && (
              <Button
                variant="secondary"
                size="xs"
                onClick={() => setIsMergeOpen(true)}
                className="flex items-center gap-1 bg-blue-50 hover:bg-blue-100 text-blue-600 border border-blue-200 font-bold px-2 py-0.5"
                data-testid="handbar-merge-btn"
              >
                <Layers className="w-3 h-3" />
                Merge Stack
              </Button>
            )}
            <Button 
              variant="ghost" 
              size="xs" 
              onClick={clearHand}
              className="text-slate-400 hover:text-red-500"
            >
              Clear All
            </Button>
          </div>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {pinnedCards.map((card) => {
            const config = RARITY_CONFIG[card.tier]
            return (
              <div
                key={card.id}
                onClick={() => onOpenDetailCard?.(card)}
                className="cursor-pointer"
              >
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
                />
              </div>
            )
          })}
          {/* Action Button: To Workbench */}
          <button 
            onClick={onNavigateToWorkbench}
            className="flex-shrink-0 w-12 h-12 rounded-md border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-blue-400 hover:text-blue-500 transition-all bg-slate-50"
            title="Workbenchを開く"
            data-testid="navigate-to-workbench-btn"
          >
            <BookUp2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {isMergeOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm p-4 font-sans animate-in fade-in duration-200">
          <div className="w-full max-w-sm bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden text-slate-800 animate-in zoom-in-95 duration-200 flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-50 border-b flex items-center justify-between">
              <h3 className="font-bold text-sm text-slate-800 flex items-center gap-1.5">
                <Layers className="w-4 h-4 text-blue-500" />
                Merge Card Stack
              </h3>
              <Button variant="ghost" size="xs" onClick={() => setIsMergeOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </Button>
            </div>
            
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed">
                Select one card to keep as the base recipe. Choose whether to consume the other cards to inherit their usage counts.
              </p>
              
              <div className="space-y-3">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Representative Card (Choose 1)</h4>
                <div className="space-y-2">
                  {pinnedCards.map(c => {
                    const isBase = c.id === baseCardId
                    return (
                      <div
                        key={c.id}
                        onClick={() => handleSelectBaseCard(c.id)}
                        className={`flex items-center gap-3 p-2 rounded-xl border-2 transition-all cursor-pointer ${
                          isBase 
                            ? "border-blue-500 bg-blue-50/50 shadow-sm" 
                            : "border-slate-100 hover:border-slate-200 bg-slate-50/30"
                        }`}
                      >
                        <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 border bg-white">
                          <img src={c.thumbnailData || "assets/icon.png"} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-bold text-slate-700 truncate">{c.name}</p>
                          <p className="text-[10px] text-slate-400">Uses: {c.usageCount || 0}</p>
                        </div>
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center ${isBase ? "border-blue-500 bg-blue-500" : "border-slate-300 bg-white"}`}>
                          {isBase && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              {pinnedCards.length > 1 && (
                <div className="space-y-3 pt-2 border-t border-slate-100">
                  <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Material Cards Integration</h4>
                  <div className="space-y-2">
                    {pinnedCards.filter(c => c.id !== baseCardId).map(c => {
                      const isConsumed = consumeStates[c.id] ?? true
                      return (
                        <div
                          key={c.id}
                          className="flex items-center justify-between p-2 rounded-xl border border-slate-100 bg-slate-50/20 gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="w-8 h-8 rounded overflow-hidden flex-shrink-0 border bg-white">
                              <img src={c.thumbnailData || "assets/icon.png"} className="w-full h-full object-cover" />
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-600 truncate">{c.name}</p>
                              <p className="text-[9px] text-slate-400">Uses to transfer: {c.usageCount || 0}</p>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setConsumeStates(prev => ({ ...prev, [c.id]: !isConsumed }))}
                              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-all border ${
                                isConsumed 
                                  ? "bg-red-50 text-red-600 border-red-200 hover:bg-red-100" 
                                  : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                              }`}
                            >
                              {isConsumed ? "Consume" : "Keep"}
                            </button>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}

              {baseCard && (
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-150 space-y-1.5">
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Base Card:</span>
                    <span className="font-semibold truncate max-w-[150px]">{baseCard.name}</span>
                  </div>
                  <div className="flex justify-between text-[11px] text-slate-600">
                    <span>Combined Images:</span>
                    <span className="font-semibold font-mono">
                      {pinnedCards.reduce((acc, c) => {
                        const urls = [...(c.images || [])]
                        if (c.thumbnailData) urls.push(c.thumbnailData)
                        urls.forEach(u => acc.add(u))
                        return acc
                      }, new Set<string>()).size} images
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1.5 border-t border-slate-200 text-slate-700">
                    <span className="font-medium">Preview Usage Count:</span>
                    <div className="flex items-center gap-1 font-bold text-blue-600">
                      <span>{baseCard.usageCount || 0}</span>
                      {additionalUses > 0 && (
                        <>
                          <span className="text-[10px] text-slate-400 font-normal">+{additionalUses}</span>
                          <span>&rarr; {previewUsageCount}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="p-4 bg-slate-50 border-t flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => setIsMergeOpen(false)}>
                Cancel
              </Button>
              <Button 
                onClick={handleExecuteMerge}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-1.5 shadow-sm shadow-blue-200"
              >
                Merge Stack
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}