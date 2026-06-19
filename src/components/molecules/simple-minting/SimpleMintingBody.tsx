import React from "react"

import type { PromptSegment } from "../../../shared/lib/db-schema"
import { CategorySelect } from "./CategorySelect"
import { CustomNameInput } from "./CustomNameInput"
import { KeywordSuggestions } from "./KeywordSuggestions"
import { PromptEditorSection } from "./PromptEditorSection"
import { ThumbnailPreview } from "./ThumbnailPreview"

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
