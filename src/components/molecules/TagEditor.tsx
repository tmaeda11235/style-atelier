import { X } from "lucide-react"
import React from "react"

import { Button } from "../atoms/Button"
import { Input } from "../atoms/Input"

/**
 * Props for the TagEditor component.
 */
export interface TagEditorProps {
  /** The array of current tag strings */
  tags: string[]
  /** The value of the new tag input field */
  newTagInput: string
  /** Callback when the new tag input field changes */
  onNewTagInputChange: (value: string) => void
  /** Callback to add a new tag */
  onAddTag: (e: React.FormEvent) => void
  /** Callback to remove a tag */
  onRemoveTag: (tag: string) => void
  /** Translation dictionary */
  t: any
}

const TagList: React.FC<{
  tags: string[]
  onRemoveTag: (tag: string) => void
  noTagsYetText: string
}> = ({ tags, onRemoveTag, noTagsYetText }) => (
  <div className="flex flex-wrap gap-1.5 mb-2">
    {tags.map((tag, idx) => (
      <span
        key={idx}
        className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-medium border border-slate-200">
        {tag}
        <button
          type="button"
          aria-label={`Remove ${tag}`}
          onClick={() => onRemoveTag(tag)}
          className="text-slate-400 hover:text-red-500 text-[10px]">
          <X className="w-2.5 h-2.5" />
        </button>
      </span>
    ))}
    {tags.length === 0 && (
      <span className="text-xs text-slate-400 italic">{noTagsYetText}</span>
    )}
  </div>
)

/**
 * TagEditor component manages card tags, displaying current tag chips
 * with deletion buttons and an input field to add new tags.
 */
export const TagEditor: React.FC<TagEditorProps> = ({
  tags,
  newTagInput,
  onNewTagInputChange,
  onAddTag,
  onRemoveTag,
  t
}) => {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-medium text-slate-500 mb-1">
        {t.cardDetail.tags}
      </label>
      <TagList
        tags={tags}
        onRemoveTag={onRemoveTag}
        noTagsYetText={t.minting.noTagsYet}
      />
      <form onSubmit={onAddTag} className="flex gap-2">
        <Input
          type="text"
          value={newTagInput}
          onChange={(e) => onNewTagInputChange(e.target.value)}
          placeholder={t.minting.tagsPlaceholder}
          size="sm"
        />
        <Button type="submit" size="xs" variant="secondary">
          {t.minting.add}
        </Button>
      </form>
    </div>
  )
}
