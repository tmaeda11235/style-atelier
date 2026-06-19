import React from "react"

import { HelpTooltip } from "~components/atoms/HelpTooltip"
import { Input } from "~components/atoms/Input"
import { TagEditor } from "~components/molecules/TagEditor"
import type { CustomCategory } from "~shared/lib/db-schema"

const DEFAULT_CATEGORY_ICON = "🖼️"

interface IdentitySectionProps {
  t: any
  expertFeatures: any
  name: string
  setName: (v: string) => void
  category: string
  setCategory: (v: string) => void
  categoriesList: CustomCategory[]
  dominantColor?: string
  accentColor?: string
  tags: string[]
  setTags: (tags: string[]) => void
}

function CardNameInput({
  t,
  expertFeatures,
  name,
  setName
}: {
  t: any
  expertFeatures: any
  name: string
  setName: (v: string) => void
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-1">
        {t.cardDetail.cardName}
      </label>
      <Input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder={t.cardDetail.cardNamePlaceholder}
        className="font-bold text-slate-800 text-sm"
        disabled={!expertFeatures.cardEditing}
      />
    </div>
  )
}

function CategorySelect({
  t,
  expertFeatures,
  category,
  setCategory,
  categoriesList
}: {
  t: any
  expertFeatures: any
  category: string
  setCategory: (v: string) => void
  categoriesList: CustomCategory[]
}) {
  if (!expertFeatures.categories) return null
  return (
    <div>
      <label className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-1">
        {t.cardDetail.category}
        <HelpTooltip content={t.helpTooltips.categories} position="top-left" />
      </label>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        className="w-full text-sm border rounded bg-white p-2"
        disabled={!expertFeatures.cardEditing}>
        <option value="">{t.cardDetail.noCategory}</option>
        {categoriesList.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.iconEmoji || DEFAULT_CATEGORY_ICON} {cat.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function NameAndCategorySection(props: {
  t: any
  expertFeatures: any
  name: string
  setName: (v: string) => void
  category: string
  setCategory: (v: string) => void
  categoriesList: CustomCategory[]
}) {
  return (
    <>
      <CardNameInput {...props} />
      <CategorySelect {...props} />
    </>
  )
}

function PaletteSection({
  t,
  dominantColor,
  accentColor
}: {
  t: any
  dominantColor?: string
  accentColor?: string
}) {
  if (!dominantColor && !accentColor) return null
  return (
    <div>
      <label className="block text-xs font-medium text-slate-500 mb-2">
        {t.cardDetail.detectedPalette}
      </label>
      <div className="flex items-center gap-4 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
        {dominantColor && (
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full border border-slate-300 shadow-sm"
              style={{ backgroundColor: dominantColor }}
              title="Dominant Color"
            />
            <span className="text-xs font-bold text-slate-700">
              {t.cardDetail.dominant} ({dominantColor})
            </span>
          </div>
        )}
        {accentColor && (
          <div className="flex items-center gap-2">
            <div
              className="w-5 h-5 rounded-full border border-slate-300 shadow-sm"
              style={{ backgroundColor: accentColor }}
              title="Accent Color"
            />
            <span className="text-xs font-bold text-slate-700">
              {t.cardDetail.accent} ({accentColor})
            </span>
          </div>
        )}
      </div>
    </div>
  )
}

const ReadOnlyTags: React.FC<{ tags: string[]; noTagsText: string }> = ({
  tags,
  noTagsText
}) => (
  <div className="flex flex-wrap gap-1.5">
    {tags.map((tg) => (
      <span
        key={tg}
        className="inline-flex items-center bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
        {tg}
      </span>
    ))}
    {tags.length === 0 && (
      <span className="text-xs text-slate-400 italic">{noTagsText}</span>
    )}
  </div>
)

function TagsSection({
  t,
  expertFeatures,
  tags,
  setTags
}: {
  t: any
  expertFeatures: any
  tags: string[]
  setTags: (tags: string[]) => void
}) {
  const [newTagInput, setNewTagInput] = React.useState("")

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = newTagInput.trim().toLowerCase()
    if (trimmed && !tags.includes(trimmed)) {
      setTags([...tags, trimmed])
    }
    setNewTagInput("")
  }

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter((t) => t !== tagToRemove))
  }

  if (!expertFeatures.tags) return null
  return (
    <div>
      <label className="flex items-center gap-1 text-xs font-medium text-slate-500 mb-1.5">
        {t.cardDetail.tags}
        <HelpTooltip content={t.helpTooltips.tags} position="top-left" />
      </label>
      {expertFeatures.cardEditing ? (
        <TagEditor
          tags={tags}
          newTagInput={newTagInput}
          onNewTagInputChange={setNewTagInput}
          onAddTag={handleAddTag}
          onRemoveTag={handleRemoveTag}
          t={t}
        />
      ) : (
        <ReadOnlyTags tags={tags} noTagsText={t.cardDetail.noTags} />
      )}
    </div>
  )
}

export function IdentitySection(props: IdentitySectionProps) {
  const { t, expertFeatures } = props
  return (
    <div className="p-4 bg-white border rounded-lg shadow-sm space-y-4">
      <h3 className="flex items-center gap-1 text-xs font-bold uppercase tracking-wider text-slate-500">
        {t.cardDetail.identity}
        {expertFeatures.cardEditing && (
          <HelpTooltip
            content={t.helpTooltips.cardEditing}
            position="bottom-left"
          />
        )}
      </h3>
      <NameAndCategorySection {...props} />
      <PaletteSection {...props} />
      <TagsSection {...props} />
    </div>
  )
}
