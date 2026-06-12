import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useSettings } from "../../contexts/SettingsContext"
import { useTutorial } from "../../contexts/TutorialContext"
import { useCategories } from "../../hooks/useCategories"
import { useHand } from "../../hooks/useHand"
import type { HistoryItem, PromptSegment } from "../../lib/db-schema"
import type { RarityTier } from "../../lib/rarity-config"
import { Button } from "../atoms/Button"
import { MintingViewContent } from "./MintingView/MintingViewContent"

const STEP_TITLE_INPUT = "title-input"
const STEP_SAVE_CARD = "save-card"

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

function MintingHeader({ t }: { t: any }) {
  return (
    <div className="p-4 bg-white shadow-sm">
      <h2 className="text-lg font-bold text-slate-800">{t.minting.title}</h2>
    </div>
  )
}

function SealingOptionsBox({
  t,
  isSrefHidden,
  setIsSrefHidden,
  isPHidden,
  setIsPHidden
}: {
  t: any
  isSrefHidden: boolean
  setIsSrefHidden: (hidden: boolean) => void
  isPHidden: boolean
  setIsPHidden: (hidden: boolean) => void
}) {
  return (
    <div className="mt-4 p-4 border rounded-lg bg-white">
      <h3 className="text-sm font-bold mb-2">{t.minting.sealingOptions}</h3>
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="hide-sref"
          checked={isSrefHidden}
          onChange={(e) => setIsSrefHidden(e.target.checked)}
        />
        <label htmlFor="hide-sref" className="text-sm">
          {t.minting.hideSref}
        </label>
      </div>
      <div className="flex items-center gap-2 mt-2">
        <input
          type="checkbox"
          id="hide-p"
          checked={isPHidden}
          onChange={(e) => setIsPHidden(e.target.checked)}
        />
        <label htmlFor="hide-p" className="text-sm">
          {t.minting.hideP}
        </label>
      </div>
    </div>
  )
}

function FooterActionButtons({
  t,
  onCancelMinting,
  onSaveMintedCard,
  advanceIfStep
}: {
  t: any
  onCancelMinting: () => void
  onSaveMintedCard: () => Promise<void>
  advanceIfStep: (v: string) => void
}) {
  return (
    <div
      className="p-4 bg-white shadow-t-sm flex justify-end gap-2"
      data-tutorial="mint-save-footer">
      <Button variant="ghost" onClick={onCancelMinting}>
        {t.minting.cancel}
      </Button>
      <Button
        onClick={async () => {
          await onSaveMintedCard()
          advanceIfStep(STEP_SAVE_CARD)
        }}>
        {t.minting.saveCard}
      </Button>
    </div>
  )
}

function useMintingLogic(
  props: MintingViewProps,
  t: any,
  advanceIfStep: (v: string) => void
) {
  const toggleKeyword = (keyword: string) => {
    if (props.selectedKeywords.includes(keyword)) {
      props.setSelectedKeywords(
        props.selectedKeywords.filter((k) => k !== keyword)
      )
    } else {
      props.setSelectedKeywords([...props.selectedKeywords, keyword])
    }
    advanceIfStep(STEP_TITLE_INPUT)
  }

  const currentName =
    props.selectedKeywords.length > 0
      ? `${props.selectedKeywords.join(" ")}${
          props.customName ? ` (${props.customName})` : ""
        }`
      : props.customName || t.minting.newCardDefault

  return { toggleKeyword, currentName }
}

export function MintingView(props: MintingViewProps) {
  const { pinnedCards } = useHand()
  const hasPinnedCards = pinnedCards.length > 0
  const { advanceIfStep } = useTutorial()
  const { expertFeatures } = useSettings()
  const { t } = useLanguage()

  const categoriesList = useCategories()
  const { toggleKeyword, currentName } = useMintingLogic(
    props,
    t,
    advanceIfStep
  )

  return (
    <div
      data-testid="minting-view-container"
      className={`absolute inset-0 bg-slate-50 z-20 flex flex-col ${
        hasPinnedCards ? "pb-[110px]" : ""
      }`}>
      <MintingHeader t={t} />
      <div className="flex-1 overflow-y-auto p-4">
        <MintingViewContent
          props={props}
          t={t}
          expertFeatures={expertFeatures}
          categoriesList={categoriesList}
          currentName={currentName}
          toggleKeyword={toggleKeyword}
          advanceIfStep={advanceIfStep}
        />
        <SealingOptionsBox
          t={t}
          isSrefHidden={props.isSrefHidden}
          setIsSrefHidden={props.setIsSrefHidden}
          isPHidden={props.isPHidden}
          setIsPHidden={props.setIsPHidden}
        />
      </div>
      <FooterActionButtons
        t={t}
        onCancelMinting={props.onCancelMinting}
        onSaveMintedCard={props.onSaveMintedCard}
        advanceIfStep={advanceIfStep}
      />
    </div>
  )
}
