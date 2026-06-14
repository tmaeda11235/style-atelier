import { Image as ImageIcon } from "lucide-react"
import React from "react"

import type { CustomCategory } from "../../../lib/db-schema"
import { Button } from "../../atoms/Button"
import { Input } from "../../atoms/Input"
import { CoverSettingsFields } from "./CoverSettingsFields"
import { ThemeSelectionField } from "./ThemeSelectionField"

interface CategoryFormProps {
  t: any
  name: string
  setName: (v: string) => void
  parentId: string
  setParentId: (v: string) => void
  emoji: string
  handleEmojiChange: (v: string) => void
  iconUrl: string
  setIsSelectingCard: (v: boolean) => void
  parentOptions: CustomCategory[]
  editingCategory: CustomCategory | null
  handleCancelEdit: () => void
  handleClearImage: () => void
  handleSave: (e: React.FormEvent) => void
  onClose: () => void
  coverImageUrl: string
  setCoverImageUrl: (v: string) => void
  theme: string
  setTheme: (v: string) => void
  setSelectionType: (v: "icon" | "cover" | null) => void
  handleClearCoverImage: () => void
}

function CategoryNameField({
  t,
  name,
  setName
}: {
  t: any
  name: string
  setName: (v: string) => void
}) {
  return (
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
  )
}

function ParentCategoryField({
  t,
  parentId,
  setParentId,
  parentOptions
}: {
  t: any
  parentId: string
  setParentId: (v: string) => void
  parentOptions: CustomCategory[]
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">
        {t.parentCategory}
      </label>
      <select
        value={parentId}
        onChange={(e) => setParentId(e.target.value)}
        className="w-full text-xs border rounded-md p-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
        <option value="">{t.rootCategory}</option>
        {parentOptions.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function IconPreviewBox({
  t,
  emoji,
  iconUrl,
  handleClearImage
}: {
  t: any
  emoji: string
  iconUrl: string
  handleClearImage: () => void
}) {
  if (!emoji && !iconUrl) return null
  return (
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
          onClick={handleClearImage}
          className="text-[10px] text-red-500 hover:underline font-bold">
          {t.clearImage}
        </button>
      )}
    </div>
  )
}

function EmojiInput({
  t,
  emoji,
  handleEmojiChange,
  disabled
}: {
  t: any
  emoji: string
  handleEmojiChange: (v: string) => void
  disabled: boolean
}) {
  return (
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
        disabled={disabled}
      />
    </div>
  )
}

function LibraryIconButton({
  t,
  iconUrl,
  onClick
}: {
  t: any
  iconUrl: string
  onClick: () => void
}) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">
        {t.libraryIcon}
      </label>
      <Button
        type="button"
        variant={iconUrl ? "primary" : "secondary"}
        size="sm"
        className="w-full flex items-center justify-center gap-1.5 h-9"
        onClick={onClick}>
        <ImageIcon className="w-4 h-4" />
        {iconUrl ? t.changeIcon : t.selectImage}
      </Button>
    </div>
  )
}

function IconSettingsFields({
  t,
  emoji,
  handleEmojiChange,
  iconUrl,
  setIsSelectingCard,
  handleClearImage,
  setSelectionType
}: {
  t: any
  emoji: string
  handleEmojiChange: (v: string) => void
  iconUrl: string
  setIsSelectingCard: (v: boolean) => void
  handleClearImage: () => void
  setSelectionType: (v: "icon" | "cover" | null) => void
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-4">
        <EmojiInput
          t={t}
          emoji={emoji}
          handleEmojiChange={handleEmojiChange}
          disabled={!!iconUrl}
        />
        <LibraryIconButton
          t={t}
          iconUrl={iconUrl}
          onClick={() => {
            setSelectionType("icon")
            setIsSelectingCard(true)
          }}
        />
      </div>

      <IconPreviewBox
        t={t}
        emoji={emoji}
        iconUrl={iconUrl}
        handleClearImage={handleClearImage}
      />
    </>
  )
}

function FormActionButtons({
  t,
  editingCategory,
  handleCancelEdit,
  onClose
}: {
  t: any
  editingCategory: CustomCategory | null
  handleCancelEdit: () => void
  onClose: () => void
}) {
  return (
    <div className="pt-2 flex justify-end gap-2">
      {editingCategory ? (
        <>
          <Button type="button" variant="ghost" onClick={handleCancelEdit}>
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
  )
}

export function CategoryForm(props: CategoryFormProps) {
  const { handleSave } = props
  return (
    <form onSubmit={handleSave} className="space-y-4">
      <CategoryNameField {...props} />
      <ParentCategoryField {...props} />
      <IconSettingsFields {...props} />
      <CoverSettingsFields {...props} />
      <ThemeSelectionField {...props} />
      <FormActionButtons {...props} />
    </form>
  )
}
