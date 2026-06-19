import React from "react"

import type { PromptSegment, StyleCard } from "../../../shared/lib/db-schema"
import { WorkbenchCard } from "../../organisms/WorkbenchCard"

interface WorkbenchCardListProps {
  workbenchCards: StyleCard[]
  selectedCardId: string | null
  setSelectedCardId: (id: string | null) => void
  toggleCardSelection: (id: string) => Promise<void> | void
  updateCardWeight: (id: string, weight: number) => Promise<void> | void
  onStartWeightAdjustment?: () => Promise<void> | void
  handleExtractPortion: (
    name: string,
    segments: PromptSegment[],
    params: any
  ) => Promise<void> | void
}

export const WorkbenchCardList: React.FC<WorkbenchCardListProps> = ({
  workbenchCards,
  selectedCardId,
  setSelectedCardId,
  toggleCardSelection,
  updateCardWeight,
  onStartWeightAdjustment,
  handleExtractPortion
}) => (
  <>
    {workbenchCards.map((card, idx) => (
      <WorkbenchCard
        key={card.id}
        card={card}
        idx={idx}
        selectedCardId={selectedCardId}
        setSelectedCardId={setSelectedCardId}
        toggleCardSelection={toggleCardSelection}
        updateCardWeight={updateCardWeight}
        onStartWeightAdjustment={onStartWeightAdjustment}
        handleExtractPortion={handleExtractPortion}
      />
    ))}
  </>
)
