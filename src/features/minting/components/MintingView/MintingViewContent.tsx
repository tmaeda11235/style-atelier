/* eslint-disable max-lines-per-function */
import React from "react"

import { HelpTooltip } from "~components/atoms/HelpTooltip"
import { PromptBubble } from "~components/molecules/PromptBubble"
import { RaritySelector } from "~components/molecules/RaritySelector"
import { PromptBubbleEditor } from "~components/organisms/PromptBubbleEditor"
import type { RarityTier } from "~lib/rarity-config"
import type {
  ClipSettings,
  HistoryItem,
  PromptSegment
} from "~shared/lib/db-schema"

import { ClipAdjuster } from "../ClipAdjuster"
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
  clipSettings?: ClipSettings
  setClipSettings?: (clip?: ClipSettings) => void
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
  const [showAdjuster, setShowAdjuster] = React.useState(false)

  if (!props.mintingItem) {
    return null
  }

  const clip = props.clipSettings
  const previewStyle: React.CSSProperties | undefined = clip
    ? {
        transform: `scale(${clip.zoom}) translate(${-clip.xOffset * 100}%, ${-clip.yOffset * 100}%)`,
        transformOrigin: "center center",
        transition: "transform 0.2s ease-out"
      }
    : undefined

  return (
    <>
      <div
        onClick={() => setShowAdjuster(true)}
        className="relative w-full aspect-square bg-slate-900 rounded-lg mb-4 shadow-md overflow-hidden cursor-pointer group"
        data-testid="minting-preview-container">
        <img
          src={props.mintingItem.imageUrl}
          className="w-full h-full object-cover transition-transform duration-200"
          style={previewStyle}
          alt="Card Preview"
        />
        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
          <span className="text-white text-sm font-bold bg-slate-900/80 px-3 py-1.5 rounded-full flex items-center gap-1.5 shadow-lg border border-white/10">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="lucide lucide-crop">
              <path d="M6 2v14a2 2 0 0 0 2 2h14" />
              <path d="M18 22V8a2 2 0 0 0-2-2H2" />
            </svg>
            画像を調整
          </span>
        </div>
      </div>

      {showAdjuster && (
        <ClipAdjuster
          imageUrl={props.mintingItem.imageUrl}
          clipSettings={props.clipSettings}
          onChange={(newClip) => {
            if (props.setClipSettings) {
              props.setClipSettings(newClip)
            }
          }}
          onClose={() => setShowAdjuster(false)}
        />
      )}

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
