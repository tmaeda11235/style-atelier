import React from "react"

import { getStyleCardById } from "../../../lib/style-card-store"
import { CardDetailView } from "../CardDetailView"
import { MintingView } from "../MintingView"

function MintingOverlay({ minting }: { minting: any }) {
  if (!minting.mintingItem && !minting.variationBase) return null
  return (
    <MintingView
      mintingItem={minting.mintingItem}
      editedSegments={minting.editedSegments}
      setEditedSegments={minting.setEditedSegments}
      isSrefHidden={minting.isSrefHidden}
      setIsSrefHidden={minting.setIsSrefHidden}
      isPHidden={minting.isPHidden}
      setIsPHidden={minting.setIsPHidden}
      onCancelMinting={() => {
        minting.setMintingItem(null)
        minting.setVariationBase(null)
      }}
      onSaveMintedCard={minting.handleSaveMintedCard}
      selectedRarity={minting.selectedRarity}
      setSelectedRarity={minting.setSelectedRarity}
      suggestedKeywords={minting.suggestedKeywords}
      selectedKeywords={minting.selectedKeywords}
      setSelectedKeywords={minting.setSelectedKeywords}
      customName={minting.customName}
      setCustomName={minting.setCustomName}
      selectedCategory={minting.selectedCategory}
      setSelectedCategory={minting.setSelectedCategory}
      customTags={minting.customTags}
      setCustomTags={minting.setCustomTags}
      detectedDominantColor={minting.detectedDominantColor}
      detectedAccentColor={minting.detectedAccentColor}
      detectedColorTags={minting.detectedColorTags}
      mutationNote={minting.mutationNote}
      setMutationNote={minting.setMutationNote}
    />
  )
}

function CardDetailOverlay({ expertView }: { expertView: any }) {
  if (!expertView.activeDetailCard) return null
  return (
    <CardDetailView
      card={expertView.activeDetailCard}
      onClose={() => expertView.setActiveDetailCard(null)}
      onInject={expertView.handleInjectPrompt}
      onSave={expertView.handleSaveCardDetails}
      setAlertType={expertView.setAlertType}
      onCardSelect={async (cardId) => {
        const targetCard = await getStyleCardById(cardId)
        if (targetCard) {
          expertView.setActiveDetailCard(targetCard)
        } else {
          expertView.addLog("Warning: Selected parent card could not be found.")
        }
      }}
      onDelete={expertView.handleDeleteCard}
      onSendToWorkbench={expertView.handleSendToWorkbench}
    />
  )
}

export function ExpertModeOverlayManager({ expertView }: { expertView: any }) {
  return (
    <>
      <MintingOverlay minting={expertView.minting} />
      <CardDetailOverlay expertView={expertView} />
    </>
  )
}
