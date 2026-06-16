import React from "react"

import { useLanguage } from "../../contexts/LanguageContext"
import { useTutorial } from "../../contexts/TutorialContext"
import { useCategories } from "../../hooks/useCategories"
import type { HistoryItem, PromptSegment } from "../../lib/db-schema"
import {
  FooterActions,
  SimpleMintingBody,
  SimpleMintingHeader
} from "./SimpleMintingComponents"

interface SimpleMintingViewProps {
  mintingItem: HistoryItem | null
  editedSegments: PromptSegment[]
  setEditedSegments: (segments: PromptSegment[]) => void
  onCancelMinting: () => void
  onSaveMintedCard: () => Promise<void>
  suggestedKeywords: string[]
  selectedKeywords: string[]
  setSelectedKeywords: (keywords: string[]) => void
  customName: string
  setCustomName: (name: string) => void
  selectedCategory?: string
  setSelectedCategory?: (category: string) => void
}

function useSimpleMinting(
  props: SimpleMintingViewProps,
  categoriesList: any[],
  advanceIfStep: (step: string) => void,
  t: any
) {
  const selectedCategory = props.selectedCategory || ""
  const { setSelectedCategory } = props

  // Ensure a category is always selected if categories exist
  React.useEffect(() => {
    if (categoriesList.length > 0 && !selectedCategory && setSelectedCategory) {
      setSelectedCategory(categoriesList[0].id)
    }
  }, [categoriesList, selectedCategory, setSelectedCategory])

  const toggleKeyword = (keyword: string) => {
    if (props.selectedKeywords.includes(keyword)) {
      props.setSelectedKeywords(
        props.selectedKeywords.filter((k) => k !== keyword)
      )
    } else {
      props.setSelectedKeywords([...props.selectedKeywords, keyword])
    }
    advanceIfStep("title-input")
  }

  const currentName =
    props.selectedKeywords.length > 0
      ? `${props.selectedKeywords.join(" ")}${props.customName ? ` (${props.customName})` : ""}`
      : props.customName || t.minting.newCardDefault

  return { toggleKeyword, currentName }
}

export function SimpleMintingView(props: SimpleMintingViewProps) {
  const categoriesList = useCategories()
  const { t } = useLanguage()
  const { advanceIfStep } = useTutorial()

  const { toggleKeyword, currentName } = useSimpleMinting(
    props,
    categoriesList,
    advanceIfStep,
    t
  )

  return (
    <div
      data-testid="simple-minting-view-container"
      className="absolute inset-0 bg-slate-900/95 backdrop-blur-md z-20 flex flex-col items-center justify-center p-4 font-sans">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[90vh]">
        <SimpleMintingHeader t={t} />

        <SimpleMintingBody
          {...props}
          t={t}
          toggleKeyword={toggleKeyword}
          currentName={currentName}
          advanceIfStep={advanceIfStep}
          selectedCategory={props.selectedCategory || ""}
          setSelectedCategory={props.setSelectedCategory || (() => {})}
          categoriesList={categoriesList}
        />

        <FooterActions
          onCancelMinting={props.onCancelMinting}
          onSaveMintedCard={props.onSaveMintedCard}
          t={t}
        />
      </div>
    </div>
  )
}
