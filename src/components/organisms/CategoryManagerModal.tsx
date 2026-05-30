import React, { useState } from "react"
import { useLiveQuery } from "dexie-react-hooks"
import { db } from "../../lib/db"
import { Button } from "../atoms/Button"
import { Input } from "../atoms/Input"
import { X, Plus, Image as ImageIcon } from "lucide-react"

interface CategoryManagerModalProps {
  onClose: () => void
  addLog: (msg: string) => void
}

export function CategoryManagerModal({ onClose, addLog }: CategoryManagerModalProps) {
  const [name, setName] = useState("")
  const [emoji, setEmoji] = useState("")
  const [iconUrl, setIconUrl] = useState("")
  const [iconCardId, setIconCardId] = useState("")
  const [isSelectingCard, setIsSelectingCard] = useState(false)

  // Fetch library cards to choose icons from
  const libraryCards = useLiveQuery(() => db.styleCards.filter(c => !c.isVariable).toArray()) || []

  const handleSelectCard = (cardId: string, thumbData: string) => {
    setIconCardId(cardId)
    setIconUrl(thumbData)
    setIsSelectingCard(false)
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    const trimmedName = name.trim()
    if (!trimmedName) {
      alert("Please enter a category name.")
      return
    }

    const id = trimmedName.toLowerCase().replace(/[^a-z0-9]+/g, "-")
    const existing = await db.categories.get(id)
    if (existing) {
      alert("A category with this name already exists.")
      return
    }

    try {
      await db.categories.add({
        id,
        name: trimmedName,
        iconEmoji: emoji.trim() || undefined,
        iconUrl: iconUrl || undefined,
        iconCardId: iconCardId || undefined,
        createdAt: Date.now(),
      })
      addLog(`Created category "${trimmedName}"`)
      onClose()
    } catch (err) {
      console.error("Failed to add category:", err)
      alert("Failed to add category. Please try again.")
    }
  }

  return (
    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex flex-col justify-end">
      {/* Drawer Container */}
      <div className="bg-white rounded-t-xl max-h-[85%] flex flex-col shadow-2xl transition-all duration-300 transform translate-y-0">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-800">
            {isSelectingCard ? "Select Card Icon" : "Add Custom Category"}
          </h3>
          <button
            onClick={isSelectingCard ? () => setIsSelectingCard(false) : onClose}
            className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isSelectingCard ? (
            <div>
              <p className="text-[11px] text-slate-500 mb-3">
                Click on a Style Card below to use its thumbnail as the icon for this category.
              </p>
              {libraryCards.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  No cards found in Library.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {libraryCards.map((card) => (
                    <div
                      key={card.id}
                      onClick={() => handleSelectCard(card.id, card.thumbnailData)}
                      className={`relative aspect-square cursor-pointer overflow-hidden rounded border transition-all ${
                        iconCardId === card.id ? "border-blue-500 ring-2 ring-blue-100 shadow-sm" : "border-slate-200 hover:border-slate-400"
                      }`}
                    >
                      <img src={card.thumbnailData} className="w-full h-full object-cover" alt={card.name} />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] text-white font-bold px-1 py-0.5 bg-blue-500/80 rounded">Select</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Category Name</label>
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Cyberpunk, Retro"
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Emoji Icon</label>
                  <Input
                    type="text"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    placeholder="e.g. 🎨, 🛸"
                    maxLength={2}
                    className="text-xs text-center"
                    disabled={!!iconUrl}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">Library Icon</label>
                  <Button
                    type="button"
                    variant={iconUrl ? "primary" : "secondary"}
                    size="sm"
                    className="w-full flex items-center justify-center gap-1.5 h-9"
                    onClick={() => setIsSelectingCard(true)}
                  >
                    <ImageIcon className="w-4 h-4" />
                    {iconUrl ? "Change Icon" : "Select Image"}
                  </Button>
                </div>
              </div>

              {/* Icon Preview */}
              {(emoji || iconUrl) && (
                <div className="p-3 border rounded-lg bg-slate-50 flex flex-col items-center justify-center space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Icon Preview</span>
                  <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden shadow-sm">
                    {iconUrl ? (
                      <img src={iconUrl} className="w-full h-full object-cover" alt="Category Icon Preview" />
                    ) : (
                      <span className="text-lg">{emoji}</span>
                    )}
                  </div>
                  {iconUrl && (
                    <button
                      type="button"
                      onClick={() => {
                        setIconUrl("")
                        setIconCardId("")
                      }}
                      className="text-[10px] text-red-500 hover:underline font-bold"
                    >
                      Clear Image
                    </button>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                <Button type="button" variant="ghost" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white">
                  Create Category
                </Button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
