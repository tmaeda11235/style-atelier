import React from "react"

import type { RarityTier } from "../../../lib/rarity-config"
import type { HistoryItem, PromptSegment } from "../../../shared/lib/db-schema"
import { HelpTooltip } from "../../atoms/HelpTooltip"
import { PromptBubble } from "../../molecules/PromptBubble"
import { RaritySelector } from "../../molecules/RaritySelector"
import { PromptBubbleEditor } from "../PromptBubbleEditor"
import { CardIdentitySection } from "./CardIdentitySection"

interface MintingViewProps {
  mintingItem: HistoryItem | null
  editedSegments: PromptSegment[]
  setEditedSegments: (segments: PromptSegment[]) => void
  isSrefHidden: boolean
  setIsSrefHidden: (hidden: boolean) => void
  isPHidden: boolean
  setIsPHidden: (hidden: boolean) => void
  onCancelMinting: () => void
  onSaveMintedCard: () => Promise<void>
  selectedRarity: RarityTier
  setSelectedRarity: (rarity: RarityTier) => void
  suggestedKeywords: string[]
  selectedKeywords: string[]
  setSelectedKeywords: (keywords: string[]) => void
  customName: string
  setCustomName: (name: string) => void
  selectedCategory?: string
  setSelectedCategory?: (category: string) => void
  customTags?: string[]
  setCustomTags?: (tags: string[]) => void
  detectedDominantColor?: string
  detectedAccentColor?: string
  detectedColorTags?: string[]
  mutationNote?: string
  setMutationNote?: (note: string) => void
}

function PromptSegmentsSection({
  t,
  expertFeatures,
  editedSegments,
  setEditedSegments,
  selectedRarity
}: {
  t: any
  expertFeatures: any
  editedSegments: PromptSegment[]
  setEditedSegments: (segments: PromptSegment[]) => void
  selectedRarity: RarityTier
}) {
  return (
    <div className="mb-6 p-4 border rounded-lg bg-white shadow-sm">
      <h3 className="flex items-center gap-1 text-sm font-bold mb-3 text-slate-700 uppercase tracking-wider">
        {t.minting.promptSegments}
        {expertFeatures.slot && (
          <HelpTooltip content={t.helpTooltips.slot} position="top-left" />
        )}
      </h3>
      <div data-tutorial="prompt-segment-bubble" className="bg-white">
        {expertFeatures.cardEditing ? (
          <PromptBubbleEditor
            initialSegments={editedSegments}
            onChange={setEditedSegments}
            tier={selectedRarity}
          />
        ) : (
          <div className="flex flex-wrap gap-2 p-3 bg-slate-50 border border-slate-200 rounded-lg min-h-[50px] items-start content-start">
            {editedSegments.map((segment, index) => (
              <PromptBubble
                key={index}
                segment={segment}
                tier={segment.type === "text" ? undefined : selectedRarity}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function RarityFrameSection({
  t,
  expertFeatures,
  selectedRarity,
  setSelectedRarity
}: {
  t: any
  expertFeatures: any
  selectedRarity: RarityTier
  setSelectedRarity: (rarity: RarityTier) => void
}) {
  if (!expertFeatures.rarity) {
    return null
  }
  return (
    <div
      className="mt-6 p-4 border rounded-lg bg-white shadow-sm"
      data-tutorial="rarity-section">
      <h3 className="flex items-center gap-1 text-sm font-bold mb-3 text-slate-700 uppercase tracking-wider">
        {t.minting.rarityFrame}
        <HelpTooltip content={t.helpTooltips.rarity} position="top-left" />
      </h3>
      <RaritySelector selected={selectedRarity} onSelect={setSelectedRarity} />
    </div>
  )
}

interface MintingViewContentProps {
  props: MintingViewProps
  t: any
  expertFeatures: any
  categoriesList: any[]
  currentName: string
  toggleKeyword: (kw: string) => void
  advanceIfStep: (step: string) => void
}

export function MintingViewContent({
  props,
  t,
  expertFeatures,
  categoriesList,
  currentName,
  toggleKeyword,
  advanceIfStep
}: MintingViewContentProps) {
  if (!props.mintingItem) {
    return null
  }
  return (
    <>
      <img
        src={props.mintingItem.imageUrl}
        className="w-full h-auto rounded-lg mb-4 shadow-md"
      />

      <CardIdentitySection
        props={props}
        t={t}
        expertFeatures={expertFeatures}
        categoriesList={categoriesList}
        currentName={currentName}
        toggleKeyword={toggleKeyword}
        advanceIfStep={advanceIfStep}
      />

      <PromptSegmentsSection
        t={t}
        expertFeatures={expertFeatures}
        editedSegments={props.editedSegments}
        setEditedSegments={props.setEditedSegments}
        selectedRarity={props.selectedRarity}
      />

      <RarityFrameSection
        t={t}
        expertFeatures={expertFeatures}
        selectedRarity={props.selectedRarity}
        setSelectedRarity={props.setSelectedRarity}
      />
    </>
  )
}
