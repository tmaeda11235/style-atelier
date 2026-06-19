import React from "react"

import { HelpTooltip } from "~components/atoms/HelpTooltip"
import { Input } from "~components/atoms/Input"
import { KeywordChip } from "~components/molecules/KeywordChip"
import { AiStyleAnalysisSection } from "~components/organisms/AiStyleAnalysisSection"
import type { CustomCategory } from "~shared/lib/db-schema"

import { CustomTagsBox, DetectedPaletteBox } from "./CardIdentitySubSections"

const DEFAULT_CATEGORY_ICON = "🖼️"

interface CardIdentitySectionProps {
  props: any
  t: any
  expertFeatures: any
  categoriesList: CustomCategory[]
  currentName: string
  toggleKeyword: (keyword: string) => void
  advanceIfStep: (v: string) => void
}

function PreviewNameBox({ t, currentName }: { t: any; currentName: string }) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-text-secondary mb-1">
        {t.minting.previewName}
      </label>
      <div className="p-2 bg-muted rounded border border-border-primary text-sm font-bold text-text-primary min-h-[2.5rem] flex items-center">
        {currentName}
      </div>
    </div>
  )
}

function KeywordsSelector({
  t,
  suggestedKeywords,
  selectedKeywords,
  toggleKeyword
}: {
  t: any
  suggestedKeywords: string[]
  selectedKeywords: string[]
  toggleKeyword: (keyword: string) => void
}) {
  return (
    <div className="mb-4">
      <label className="block text-xs font-medium text-text-secondary mb-2">
        {t.minting.selectKeywords}
      </label>
      <div className="flex flex-wrap gap-2">
        {suggestedKeywords.map((kw, i) => (
          <KeywordChip
            key={i}
            label={kw}
            isSelected={selectedKeywords.includes(kw)}
            onClick={() => toggleKeyword(kw)}
          />
        ))}
      </div>
    </div>
  )
}

function PreviewAndKeywords({ t, currentName, props, toggleKeyword }: any) {
  return (
    <>
      <PreviewNameBox t={t} currentName={currentName} />
      <KeywordsSelector
        t={t}
        suggestedKeywords={props.suggestedKeywords}
        selectedKeywords={props.selectedKeywords}
        toggleKeyword={toggleKeyword}
      />
    </>
  )
}

function CustomNameField({
  t,
  customName,
  setCustomName,
  advanceIfStep
}: {
  t: any
  customName: string
  setCustomName: (name: string) => void
  advanceIfStep: (v: string) => void
}) {
  return (
    <div className="mb-4" data-tutorial="title-input">
      <label className="block text-xs font-medium text-text-secondary mb-1">
        {t.minting.customName}
      </label>
      <Input
        type="text"
        value={customName}
        onChange={(e) => {
          setCustomName(e.target.value)
          advanceIfStep("title-input")
        }}
        placeholder={t.minting.addDetailsPlaceholder}
      />
    </div>
  )
}

function CategorySelectorBox({
  t,
  expertFeatures,
  selectedCategory,
  setSelectedCategory,
  categoriesList
}: {
  t: any
  expertFeatures: any
  selectedCategory: string
  setSelectedCategory: (category: string) => void
  categoriesList: CustomCategory[]
}) {
  if (!expertFeatures.categories) {
    return null
  }
  return (
    <div className="mb-4">
      <label className="flex items-center gap-1 text-xs font-medium text-text-secondary mb-1">
        {t.minting.category}
        <HelpTooltip content={t.helpTooltips.categories} position="top-left" />
      </label>
      <select
        value={selectedCategory}
        onChange={(e) => setSelectedCategory(e.target.value)}
        className="w-full text-sm border border-border-primary rounded bg-surface text-text-primary p-2">
        <option value="">{t.minting.noCategory}</option>
        {categoriesList.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.iconEmoji || DEFAULT_CATEGORY_ICON}{" "}
            {(t.defaultCategories as Record<string, string>)[cat.id] ||
              cat.name}
          </option>
        ))}
      </select>
    </div>
  )
}

function AiAnalysisBlock({ props }: { props: any }) {
  const promptText = props.editedSegments
    .map((s: any) => (s.type === "slot" ? s.default : s.value))
    .join(" ")
  return (
    <div className="mb-4">
      <AiStyleAnalysisSection
        promptText={promptText}
        customTags={props.customTags}
        setCustomTags={props.setCustomTags}
        setCustomName={props.setCustomName}
        setMutationNote={props.setMutationNote}
      />
    </div>
  )
}

export function CardIdentitySection({
  props,
  t,
  expertFeatures,
  categoriesList,
  currentName,
  toggleKeyword,
  advanceIfStep
}: CardIdentitySectionProps) {
  return (
    <div className="mb-6 p-4 border border-border-primary rounded-lg bg-surface shadow-sm">
      <h3 className="text-sm font-bold mb-3 text-text-primary uppercase tracking-wider">
        {t.minting.cardIdentity}
      </h3>
      <PreviewAndKeywords
        t={t}
        currentName={currentName}
        props={props}
        toggleKeyword={toggleKeyword}
      />
      <CustomNameField
        t={t}
        customName={props.customName}
        setCustomName={props.setCustomName}
        advanceIfStep={advanceIfStep}
      />

      <AiAnalysisBlock props={props} />

      <CategorySelectorBox
        t={t}
        expertFeatures={expertFeatures}
        selectedCategory={props.selectedCategory}
        setSelectedCategory={props.setSelectedCategory}
        categoriesList={categoriesList}
      />

      <CustomTagsBox
        t={t}
        expertFeatures={expertFeatures}
        customTags={props.customTags}
        setCustomTags={props.setCustomTags}
      />

      <DetectedPaletteBox
        t={t}
        detectedDominantColor={props.detectedDominantColor}
        detectedAccentColor={props.detectedAccentColor}
        detectedColorTags={props.detectedColorTags}
      />
    </div>
  )
}
