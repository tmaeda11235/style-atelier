import React from "react"

import { Button } from "~components/atoms/Button"
import { HelpTooltip } from "~components/atoms/HelpTooltip"
import { Input } from "~components/atoms/Input"

const CHAR_CLOSE = "×"
const EMOJI_PALETTE = "🎨"

function TagList({
  customTags = [],
  setCustomTags,
  t
}: {
  customTags?: string[]
  setCustomTags: (tags: string[]) => void
  t: any
}) {
  return (
    <div className="flex flex-wrap gap-1.5 mb-2">
      {customTags.map((tg, idx) => (
        <span
          key={idx}
          className="inline-flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-[11px] font-medium border border-blue-100">
          {tg}
          <button
            type="button"
            onClick={() =>
              setCustomTags(customTags.filter((tag) => tag !== tg))
            }
            className="text-blue-400 hover:text-red-500 text-[10px]">
            {CHAR_CLOSE}
          </button>
        </span>
      ))}
      {customTags.length === 0 && (
        <span className="text-xs text-slate-400 italic">
          {t.minting.noCustomTags}
        </span>
      )}
    </div>
  )
}

function TagInputField({
  t,
  handleAddTag
}: {
  t: any
  handleAddTag: (val: string) => void
}) {
  return (
    <div className="flex gap-2">
      <Input
        type="text"
        id="custom-tag-input"
        placeholder={t.minting.pressEnterToAdd}
        size="sm"
        onKeyDown={(e) => {
          if (e.key === "Enter") {
            e.preventDefault()
            handleAddTag(e.currentTarget.value)
            e.currentTarget.value = ""
          }
        }}
      />
      <Button
        type="button"
        size="xs"
        variant="secondary"
        onClick={() => {
          const input = document.getElementById(
            "custom-tag-input"
          ) as HTMLInputElement
          if (input) {
            handleAddTag(input.value)
            input.value = ""
          }
        }}>
        {t.minting.add}
      </Button>
    </div>
  )
}

export function CustomTagsBox({
  t,
  expertFeatures,
  customTags = [],
  setCustomTags
}: {
  t: any
  expertFeatures: any
  customTags?: string[]
  setCustomTags: (tags: string[]) => void
}) {
  if (!expertFeatures.tags) {
    return null
  }

  const handleAddTag = (value: string) => {
    const trimmed = value.trim().toLowerCase()
    if (trimmed && !customTags.includes(trimmed)) {
      setCustomTags([...customTags, trimmed])
    }
  }

  return (
    <div className="mb-4">
      <label className="flex items-center gap-1 text-xs font-medium text-text-secondary mb-1">
        {t.minting.customTags}
        <HelpTooltip content={t.helpTooltips.tags} position="top-left" />
      </label>
      <TagList customTags={customTags} setCustomTags={setCustomTags} t={t} />
      <TagInputField t={t} handleAddTag={handleAddTag} />
    </div>
  )
}

function ColorIndicator({ label, color }: { label: string; color: string }) {
  return (
    <div className="flex items-center gap-2">
      <div
        className="w-5 h-5 rounded-full border border-border-primary shadow-sm"
        style={{ backgroundColor: color }}
        title={`${label} Color`}
      />
      <span className="text-xs font-bold text-text-primary">{label}</span>
    </div>
  )
}

export function DetectedPaletteBox({
  t,
  detectedDominantColor = "",
  detectedAccentColor = "",
  detectedColorTags = []
}: {
  t: any
  detectedDominantColor?: string
  detectedAccentColor?: string
  detectedColorTags?: string[]
}) {
  return (
    <div className="mb-2">
      <label className="block text-xs font-medium text-text-secondary mb-2">
        {t.minting.detectedPalette}
      </label>
      <div className="flex items-center gap-4 bg-muted p-2.5 rounded-lg border border-border-primary">
        <ColorIndicator
          label={t.minting.dominant}
          color={detectedDominantColor}
        />
        <ColorIndicator label={t.minting.accent} color={detectedAccentColor} />
        {detectedColorTags.length > 0 && (
          <div className="flex flex-wrap gap-1 ml-auto">
            {detectedColorTags.map((colName, i) => (
              <span
                key={i}
                className="bg-muted text-text-primary border border-border-primary px-1.5 py-0.5 rounded text-[10px] font-bold flex items-center gap-0.5">
                <span>{EMOJI_PALETTE}</span>
                <span>{colName}</span>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
