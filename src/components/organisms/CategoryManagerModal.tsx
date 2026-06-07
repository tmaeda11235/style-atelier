import { Edit2, Image as ImageIcon, Trash2, X } from "lucide-react"
import React from "react"

import { useCategoryManager } from "../../hooks/useCategoryManager"
import { Button } from "../atoms/Button"
import { Input } from "../atoms/Input"

interface CategoryManagerModalProps {
  onClose: () => void
  addLog: (msg: string) => void
}

const SYSTEM_CATEGORY_IDS = [
  "style",
  "character",
  "landscape",
  "lighting",
  "camera",
  "abstract",
  "other"
]

export function CategoryManagerModal({
  onClose,
  addLog
}: CategoryManagerModalProps) {
  const {
    activeTab,
    setActiveTab,
    editingCategory,
    name,
    setName,
    emoji,
    iconUrl,
    setIconUrl,
    iconCardId,
    isSelectingCard,
    setIsSelectingCard,
    categories,
    libraryCards,
    handleEmojiChange,
    handleSelectCard,
    handleStartEdit,
    handleCancelEdit,
    handleDelete,
    handleSave,
    t
  } = useCategoryManager({ onClose, addLog })

  return (
    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex flex-col justify-end">
      {/* Drawer Container */}
      <div className="bg-white rounded-t-xl max-h-[85%] flex flex-col shadow-2xl transition-all duration-300 transform translate-y-0">
        {/* Header */}
        <div className="p-4 border-b flex items-center justify-between">
          {isSelectingCard ? (
            <h3 className="text-xs font-bold text-slate-800">
              {t.selectCardIcon}
            </h3>
          ) : (
            <div className="flex gap-4">
              <button
                onClick={() => {
                  setActiveTab("create")
                }}
                className={`text-xs font-bold pb-1 border-b-2 transition-all ${
                  activeTab === "create" && !editingCategory
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}>
                {t.addCategory}
              </button>
              <button
                onClick={() => {
                  setActiveTab("manage")
                  if (editingCategory) handleCancelEdit()
                }}
                className={`text-xs font-bold pb-1 border-b-2 transition-all ${
                  activeTab === "manage"
                    ? "border-blue-600 text-blue-600"
                    : "border-transparent text-slate-400 hover:text-slate-600"
                }`}>
                {t.manageCategories}
              </button>
              {editingCategory && (
                <span className="text-xs font-bold pb-1 border-b-2 border-blue-600 text-blue-600">
                  {t.editCategoryName.replace("{name}", editingCategory.name)}
                </span>
              )}
            </div>
          )}
          <button
            onClick={
              isSelectingCard ? () => setIsSelectingCard(false) : onClose
            }
            className="p-1 rounded-full text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
            aria-label={t.cancel}>
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4">
          {isSelectingCard ? (
            <div>
              <p className="text-[11px] text-slate-500 mb-3">
                {t.clickToUseThumb}
              </p>
              {libraryCards.length === 0 ? (
                <p className="text-xs text-slate-400 italic text-center py-6">
                  {t.noCardsFound}
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {libraryCards.map((card) => (
                    <div
                      key={card.id}
                      onClick={() =>
                        handleSelectCard(card.id, card.thumbnailData)
                      }
                      className={`relative aspect-square cursor-pointer overflow-hidden rounded border transition-all ${
                        iconCardId === card.id
                          ? "border-blue-500 ring-2 ring-blue-100 shadow-sm"
                          : "border-slate-200 hover:border-slate-400"
                      }`}>
                      <img
                        src={card.thumbnailData}
                        className="w-full h-full object-cover"
                        alt={card.name}
                      />
                      <div className="absolute inset-0 bg-black/40 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[10px] text-white font-bold px-1 py-0.5 bg-blue-500/80 rounded">
                          {t.select}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : activeTab === "create" ? (
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">
                  {t.categoryName}
                </label>
                <Input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={t.placeholderName}
                  className="text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    {t.emojiIcon}
                  </label>
                  <Input
                    type="text"
                    value={emoji}
                    onChange={(e) => handleEmojiChange(e.target.value)}
                    placeholder={t.placeholderEmoji}
                    className="text-xs text-center"
                    disabled={!!iconUrl}
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 mb-1">
                    {t.libraryIcon}
                  </label>
                  <Button
                    type="button"
                    variant={iconUrl ? "primary" : "secondary"}
                    size="sm"
                    className="w-full flex items-center justify-center gap-1.5 h-9"
                    onClick={() => setIsSelectingCard(true)}>
                    <ImageIcon className="w-4 h-4" />
                    {iconUrl ? t.changeIcon : t.selectImage}
                  </Button>
                </div>
              </div>

              {/* Icon Preview */}
              {(emoji || iconUrl) && (
                <div className="p-3 border rounded-lg bg-slate-50 flex flex-col items-center justify-center space-y-2">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">
                    {t.iconPreview}
                  </span>
                  <div className="w-10 h-10 rounded-full bg-slate-200 border border-slate-300 flex items-center justify-center overflow-hidden shadow-sm">
                    {iconUrl ? (
                      <img
                        src={iconUrl}
                        className="w-full h-full object-cover"
                        alt="Category Icon Preview"
                      />
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
                      className="text-[10px] text-red-500 hover:underline font-bold">
                      {t.clearImage}
                    </button>
                  )}
                </div>
              )}

              <div className="pt-2 flex justify-end gap-2">
                {editingCategory ? (
                  <>
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={handleCancelEdit}>
                      {t.cancelEdit}
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white">
                      {t.saveChanges}
                    </Button>
                  </>
                ) : (
                  <>
                    <Button type="button" variant="ghost" onClick={onClose}>
                      {t.cancel}
                    </Button>
                    <Button
                      type="submit"
                      className="bg-blue-600 hover:bg-blue-700 text-white">
                      {t.createCategory}
                    </Button>
                  </>
                )}
              </div>
            </form>
          ) : (
            <div className="space-y-2">
              <p className="text-[11px] text-slate-500 mb-3">
                {t.listDescription}
              </p>
              <div className="space-y-1.5 max-h-[300px] overflow-y-auto pr-1">
                {categories.map((cat) => {
                  const isSystem = SYSTEM_CATEGORY_IDS.includes(cat.id)
                  return (
                    <div
                      key={cat.id}
                      className="flex items-center justify-between p-2 border rounded-lg bg-white shadow-sm border-slate-100 hover:border-slate-200 transition-all">
                      <div className="flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center overflow-hidden shadow-inner flex-shrink-0">
                          {cat.iconUrl ? (
                            <img
                              src={cat.iconUrl}
                              className="w-full h-full object-cover"
                              alt={cat.name}
                            />
                          ) : (
                            <span className="text-sm leading-none">
                              {cat.iconEmoji || "📁"}
                            </span>
                          )}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-700 leading-tight">
                            {cat.name}
                          </p>
                          {isSystem && (
                            <span className="text-[9px] text-slate-400 font-semibold uppercase tracking-wider">
                              {t.systemDefault}
                            </span>
                          )}
                        </div>
                      </div>
                      {!isSystem && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEdit(cat)}
                            className="p-1 rounded text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition-colors"
                            title={t.editTooltip}>
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(cat.id, cat.name)}
                            className="p-1 rounded text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title={t.deleteTooltip}>
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
