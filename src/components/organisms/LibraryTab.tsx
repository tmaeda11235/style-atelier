import React, { useState } from "react"
import { useLibrary } from "../../hooks/useLibrary"
import { RARITY_CONFIG } from "../../lib/rarity-config"
import { SearchField } from "../molecules/SearchField"
import { CardThumbnail } from "../molecules/CardThumbnail"
import type { StyleCard } from "../../lib/db-schema"
import { Plus } from "lucide-react"
import { CategoryManagerModal } from "./CategoryManagerModal"
import { ConnectionAlert, type AlertType } from "../molecules/ConnectionAlert"
import { useTutorial } from "../../contexts/TutorialContext"
import { db } from "../../lib/db"

interface LibraryTabProps {
  addLog: (msg: string) => void
  setAlertType: (type: AlertType) => void
  onOpenDetailCard: (card: StyleCard) => void
}

export function LibraryTab({ addLog, setAlertType, onOpenDetailCard }: LibraryTabProps) {
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false)
  const { advanceIfStep } = useTutorial()
  const [isFileDragging, setIsFileDragging] = useState(false)
  const [isImporting, setIsImporting] = useState(false)

  const handleFileDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.types.includes("Files")) {
      setIsFileDragging(true)
    }
  }

  const handleFileDragLeave = (e: React.DragEvent) => {
    e.preventDefault()
    setIsFileDragging(false)
  }

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    setIsFileDragging(false)

    const files = Array.from(e.dataTransfer.files)
    const imageFile = files.find((f) => f.type.startsWith("image/"))
    if (!imageFile) {
      addLog("No valid image file dropped.")
      return
    }

    setIsImporting(true)
    addLog("Processing dropped card image...")

    try {
      const { readQRCodeFromImage, decompressCardData } = await import("../../lib/qr-utils")
      const payload = await readQRCodeFromImage(imageFile)
      
      if (!payload) {
        addLog("No QR code found in the image.")
        setIsImporting(false)
        return
      }

      const partialCard = decompressCardData(payload)
      if (!partialCard.name || !partialCard.promptSegments) {
        addLog("Invalid card data in QR code.")
        setIsImporting(false)
        return
      }

      const cdnUrl = partialCard.images?.[0]
      let finalThumbnailData = "assets/icon.png"
      
      if (cdnUrl) {
        addLog("Fetching clean artwork from Midjourney...")
        try {
          const response = await fetch(cdnUrl)
          if (response.ok) {
            const blob = await response.blob()
            finalThumbnailData = await new Promise<string>((resolve, reject) => {
              const reader = new FileReader()
              reader.onloadend = () => resolve(reader.result as string)
              reader.onerror = reject
              reader.readAsDataURL(blob)
            })
            addLog("Artwork downloaded successfully.")
          } else {
            addLog("Could not fetch artwork from Midjourney CDN. Using placeholder.")
          }
        } catch (fetchErr) {
          console.error("CORS or network error fetching artwork:", fetchErr)
          addLog("Failed to download artwork. Using placeholder.")
        }
      } else {
        addLog("No artwork URL found in card. Using placeholder.")
      }

      const existingCard = partialCard.id ? await db.styleCards.get(partialCard.id) : null
      
      const importedCard: StyleCard = {
        id: partialCard.id || crypto.randomUUID(),
        name: partialCard.name,
        createdAt: existingCard?.createdAt || Date.now(),
        updatedAt: Date.now(),
        promptSegments: partialCard.promptSegments,
        parameters: partialCard.parameters || {},
        masking: partialCard.masking || { isSrefHidden: false, isPHidden: false },
        tier: partialCard.tier || "Common",
        isFavorite: existingCard?.isFavorite || false,
        usageCount: existingCard?.usageCount || 0,
        tags: partialCard.tags || [],
        category: partialCard.category,
        dominantColor: partialCard.dominantColor || "#1e293b",
        accentColor: partialCard.accentColor || "#3b82f6",
        thumbnailData: finalThumbnailData,
        frameId: partialCard.frameId || "default",
        genealogy: partialCard.genealogy || { generation: 1, parentIds: [] },
        images: cdnUrl ? [cdnUrl] : [],
        selectedThumbnails: cdnUrl ? [cdnUrl] : [],
      }

      await db.styleCards.put(importedCard)
      addLog(`Imported card "${importedCard.name}" successfully!`)
    } catch (err) {
      console.error("Failed to import card:", err)
      addLog("Error occurred while importing card.")
    } finally {
      setIsImporting(false)
    }
  }

  const {
    styleCards,
    handleCardClick,
    togglePin,
    searchTag,
    setSearchTag,
    rarityFilter,
    setRarityFilter,
    categoryFilter,
    setCategoryFilter,
    sortBy,
    setSortBy,
    allSrefs,
    categories,
  } = useLibrary(addLog, setAlertType)

  return (
    <div 
      className="flex flex-col gap-4 relative"
      onDragOver={handleFileDragOver}
      onDragLeave={handleFileDragLeave}
      onDrop={handleFileDrop}
      data-testid="library-tab-container"
    >
      {isFileDragging && (
        <div className="absolute inset-0 bg-blue-500/10 border-2 border-dashed border-blue-500 rounded-lg flex flex-col items-center justify-center z-50 backdrop-blur-[2px] pointer-events-none animate-pulse">
          <div className="bg-white p-4 rounded-full shadow-lg flex items-center justify-center border border-blue-100">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-blue-500">
              <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
              <polyline points="17 8 12 3 7 8"></polyline>
              <line x1="12" y1="3" x2="12" y2="15"></line>
            </svg>
          </div>
          <span className="text-xs font-bold text-blue-600 mt-2 bg-white px-2 py-0.5 rounded shadow-sm">
            Drop QR Card Image to Import
          </span>
        </div>
      )}
      
      {isImporting && (
        <div className="absolute inset-0 bg-slate-900/40 rounded-lg flex flex-col items-center justify-center z-50 backdrop-blur-[1px] pointer-events-none">
          <div className="bg-white p-4 rounded-lg shadow-xl flex items-center gap-3 border border-slate-100">
            <svg className="animate-spin h-5 w-5 text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span className="text-xs font-bold text-slate-700">Importing Card...</span>
          </div>
        </div>
      )}

      {/* Search and Filters */}
      <div className="flex flex-col gap-2 bg-slate-50 p-2 rounded-lg border border-slate-200">
        <SearchField
          placeholder="Search by tag, name or sref..."
          options={allSrefs}
          value={searchTag}
          onChange={(e) => setSearchTag(e.target.value)}
          className="text-xs"
        />
        <div className="flex gap-2">
          <select
            value={rarityFilter}
            onChange={(e) => setRarityFilter(e.target.value as any)}
            className="flex-1 px-1 py-1 text-[10px] border rounded bg-white"
          >
            <option value="All">All Rarities</option>
            <option value="Common">Common</option>
            <option value="Rare">Rare</option>
            <option value="Epic">Epic</option>
            <option value="Legendary">Legendary</option>
          </select>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="flex-1 px-1 py-1 text-[10px] border rounded bg-white"
          >
            <option value="newest">Newest</option>
            <option value="oldest">Oldest</option>
            <option value="rarity">Rarity</option>
            <option value="usage">Usage</option>
          </select>
        </div>
      </div>

      {/* Category Horizontal Filter Row */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setCategoryFilter("All")}
          className={`flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
            categoryFilter === "All"
              ? "bg-slate-800 border-slate-800 text-white shadow-sm"
              : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
          }`}
        >
          All
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setCategoryFilter(cat.id)}
            className={`flex items-center gap-1 flex-shrink-0 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all border ${
              categoryFilter === cat.id
                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                : "bg-white border-slate-200 text-slate-600 hover:border-slate-300"
            }`}
          >
            {cat.iconUrl ? (
              <img
                src={cat.iconUrl}
                className="w-3.5 h-3.5 rounded-full object-cover border border-white/20"
                alt={cat.name}
              />
            ) : (
              <span className="text-[11px] leading-none">{cat.iconEmoji || "🖼️"}</span>
            )}
            <span>{cat.name}</span>
          </button>
        ))}
        {/* Add custom category button */}
        <button
          onClick={() => setIsCategoryModalOpen(true)}
          className="flex items-center justify-center w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 border border-dashed border-slate-300 transition-colors flex-shrink-0"
          title="Add Custom Category"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3" data-tutorial="library-card-grid">
        {styleCards?.map((card, idx) => {
          const config = RARITY_CONFIG[card.tier]
          const cardCategory = categories.find((c) => c.id === card.category)
          return (
            <div
              key={card.id}
              data-tutorial={idx === 0 ? "library-card" : undefined}
              onClick={(e) => {
                togglePin(card, e)
                advanceIfStep("card-to-hand")
              }}
              className={`group bg-white border-2 rounded-lg shadow-sm cursor-pointer overflow-hidden transition-all hover:scale-[1.02] active:scale-[0.98] ${config?.borderClass || "border-slate-200"
                } ${config?.glowClass || ""}`}
            >
              <CardThumbnail
                imageUrl={card.thumbnailData}
                thumbnailImages={card.selectedThumbnails}
                alt={card.name}
                tier={card.tier}
                isPinned={card.isPinned}
                usageCount={card.usageCount}
                onPinClick={(e) => togglePin(card, e)}
                onEditClick={(e) => {
                  e.stopPropagation()
                  onOpenDetailCard(card)
                }}
                onInjectClick={(e) => {
                  e.stopPropagation()
                  handleCardClick(card)
                }}
                category={cardCategory}
              />
              <div className={`p-2 border-t ${config.borderClass} bg-opacity-5 ${config.bgClass}`}>
                <p className="text-xs font-bold text-slate-800 truncate">{card.name}</p>
              </div>
            </div>
          )
        })}
      </div>

      {isCategoryModalOpen && (
        <CategoryManagerModal
          onClose={() => setIsCategoryModalOpen(false)}
          addLog={addLog}
        />
      )}
    </div>
  )
}