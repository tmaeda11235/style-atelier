import React from "react"
import { useHand } from "../../hooks/useHand"
import { RARITY_CONFIG } from "../../lib/rarity-config"

export function HandBar() {
  const { pinnedCards, unpinCard, clearHand } = useHand()

  // Always render the container, but hide content if empty
  // This helps confirm DOM existence during debugging
  if (pinnedCards.length === 0) return <div id="handbar-root" />

  console.log("any hand");
  
  return (
    <div id="handbar-root" className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-sm border-t border-slate-200 shadow-lg z-50 transition-all">
      <div className="max-w-md mx-auto p-2">
        <div className="flex items-center justify-between mb-2 px-1">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Your Hand ({pinnedCards.length})</span>
          <button 
            onClick={clearHand}
            className="text-[10px] text-slate-400 hover:text-red-500 transition-colors"
          >
            Clear All
          </button>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {pinnedCards.map((card) => {
            const config = RARITY_CONFIG[card.tier]
            return (
              <div 
                key={card.id} 
                className={`relative flex-shrink-0 w-12 h-12 rounded-md border-2 overflow-hidden group ${config.borderClass}`}
              >
                <img 
                  src={card.thumbnailData} 
                  alt={card.name} 
                  className="w-full h-full object-cover"
                />
                <button
                  onClick={() => unpinCard(card.id)}
                  className="absolute -top-1 -right-1 bg-slate-800 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            )
          })}
          {/* Action Button: To Workbench (Future) */}
          <button className="flex-shrink-0 w-12 h-12 rounded-md border-2 border-dashed border-slate-300 flex items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-500 transition-all bg-slate-50">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path>
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}