import React from "react"

import type { PromptSegment } from "../../lib/db-schema"
import { Button } from "../atoms/Button"
import { Input } from "../atoms/Input"
import { PromptBubbleEditor } from "./PromptBubbleEditor"

const DEFAULT_ICON_EMOJI = "🖼️"
const TIER_COMMON = "Common"

interface SimpleMintingHeaderProps {
  t: any
}

export const SimpleMintingHeader: React.FC<SimpleMintingHeaderProps> = ({
  t
}) => (
  <div className="p-4 border-b border-slate-100 bg-gradient-to-r from-blue-50 to-indigo-50 flex items-center justify-between">
    <div>
      <h2 className="text-sm font-black text-slate-800 tracking-tight">
        {t.minting.quickCardCreator}
      </h2>
      <p className="text-[10px] text-slate-500 font-medium">
        {t.minting.mintInstantly}
      </p>
    </div>
    <span className="text-xs bg-blue-600/10 text-blue-600 px-2 py-0.5 rounded-full font-bold">
      {t.minting.easyMode}
    </span>
  </div>
)

interface ThumbnailPreviewProps {
  imageUrl: string
  altText: string
}

export const ThumbnailPreview: React.FC<ThumbnailPreviewProps> = ({
  imageUrl,
  altText
}) => (
  <div className="relative group rounded-xl overflow-hidden shadow-md border border-slate-100 aspect-video bg-slate-950">
    <img
      src={imageUrl}
      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
      alt={altText}
    />
    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/40 to-transparent" />
  </div>
)

interface KeywordSuggestionsProps {
  suggestedKeywords: string[]
  selectedKeywords: string[]
  toggleKeyword: (kw: string) => void
  t: any
}

export const KeywordSuggestions: React.FC<KeywordSuggestionsProps> = ({
  suggestedKeywords,
  selectedKeywords,
  toggleKeyword,
  t
}) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
      {t.minting.quickKeywords}
    </label>
    <div className="flex flex-wrap gap-1">
      {suggestedKeywords.map((kw, i) => {
        const isSelected = selectedKeywords.includes(kw)
        return (
          <button
            key={i}
            type="button"
            onClick={() => toggleKeyword(kw)}
            className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition-all duration-150 ${
              isSelected
                ? "bg-blue-600 border-blue-600 text-white shadow-sm"
                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
            }`}>
            {kw}
          </button>
        )
      })}
    </div>
  </div>
)

interface CustomNameInputProps {
  customName: string
  setCustomName: (name: string) => void
  currentName: string
  advanceIfStep: (step: string) => void
  t: any
}

export const CustomNameInput: React.FC<CustomNameInputProps> = ({
  customName,
  setCustomName,
  currentName,
  advanceIfStep,
  t
}) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
      {t.minting.cardName}
    </label>
    <Input
      type="text"
      value={customName}
      onChange={(e) => {
        setCustomName(e.target.value)
        advanceIfStep("title-input")
      }}
      placeholder={t.minting.enterCustomName}
      className="h-9 text-xs focus-visible:ring-blue-600 rounded-xl"
    />
    <div className="mt-1.5 text-xs text-slate-500 font-medium">
      {t.minting.preview}:{" "}
      <span className="font-bold text-slate-800 bg-slate-50 px-2 py-0.5 rounded border border-slate-100/80 inline-block mt-0.5">
        {currentName}
      </span>
    </div>
  </div>
)

interface CategorySelectProps {
  selectedCategory: string
  setSelectedCategory: (cat: string) => void
  categoriesList: any[]
  t: any
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
  selectedCategory,
  setSelectedCategory,
  categoriesList,
  t
}) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
      {t.minting.categoryRequired}
    </label>
    <select
      value={selectedCategory}
      onChange={(e) => setSelectedCategory(e.target.value)}
      className="w-full text-xs border border-slate-200 rounded-xl bg-white p-2 h-9 font-medium text-slate-700 focus:outline-none focus:border-blue-600 focus:ring-1 focus:ring-blue-600">
      {categoriesList.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.iconEmoji || DEFAULT_ICON_EMOJI}{" "}
          {(t.defaultCategories as Record<string, string>)[cat.id] || cat.name}
        </option>
      ))}
    </select>
  </div>
)

interface PromptEditorSectionProps {
  editedSegments: PromptSegment[]
  setEditedSegments: (segments: PromptSegment[]) => void
  t: any
}

export const PromptEditorSection: React.FC<PromptEditorSectionProps> = ({
  editedSegments,
  setEditedSegments,
  t
}) => (
  <div>
    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
      {t.minting.promptSegments}
    </label>
    <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50 p-2">
      <PromptBubbleEditor
        initialSegments={editedSegments}
        onChange={setEditedSegments}
        tier={TIER_COMMON}
      />
    </div>
  </div>
)

interface FooterActionsProps {
  onCancelMinting: () => void
  onSaveMintedCard: () => Promise<void>
  t: any
}

export const FooterActions: React.FC<FooterActionsProps> = ({
  onCancelMinting,
  onSaveMintedCard,
  t
}) => (
  <div className="p-4 border-t border-slate-100 bg-slate-50 flex gap-2 justify-end">
    <Button
      variant="ghost"
      onClick={onCancelMinting}
      className="h-9 text-xs rounded-xl hover:bg-slate-200/50">
      {t.minting.cancel}
    </Button>
    <Button
      onClick={onSaveMintedCard}
      className="h-9 text-xs bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-xl shadow-md hover:from-blue-700 hover:to-indigo-700 font-bold px-4">
      {t.minting.saveToLibrary}
    </Button>
  </div>
)

interface SimpleMintingBodyProps {
  mintingItem: any
  t: any
  suggestedKeywords: string[]
  selectedKeywords: string[]
  toggleKeyword: (kw: string) => void
  customName: string
  setCustomName: (name: string) => void
  currentName: string
  advanceIfStep: (step: string) => void
  selectedCategory: string
  setSelectedCategory: (cat: string) => void
  categoriesList: any[]
  editedSegments: PromptSegment[]
  setEditedSegments: (segments: PromptSegment[]) => void
}

export const SimpleMintingBody: React.FC<SimpleMintingBodyProps> = (props) => {
  if (!props.mintingItem) return <div className="flex-1" />

  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-4">
      <ThumbnailPreview
        imageUrl={props.mintingItem.imageUrl}
        altText={props.t.minting.preview}
      />

      <div className="space-y-3">
        {props.suggestedKeywords.length > 0 && (
          <KeywordSuggestions
            suggestedKeywords={props.suggestedKeywords}
            selectedKeywords={props.selectedKeywords}
            toggleKeyword={props.toggleKeyword}
            t={props.t}
          />
        )}

        <CustomNameInput
          customName={props.customName}
          setCustomName={props.setCustomName}
          currentName={props.currentName}
          advanceIfStep={props.advanceIfStep}
          t={props.t}
        />

        <CategorySelect
          selectedCategory={props.selectedCategory}
          setSelectedCategory={props.setSelectedCategory}
          categoriesList={props.categoriesList}
          t={props.t}
        />
      </div>

      <PromptEditorSection
        editedSegments={props.editedSegments}
        setEditedSegments={props.setEditedSegments}
        t={props.t}
      />
    </div>
  )
}
