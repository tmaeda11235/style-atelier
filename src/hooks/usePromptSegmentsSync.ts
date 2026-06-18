import { useEffect } from "react"

import { mergeReferences } from "../lib/prompt-reference-utils"
import type { PromptSegment } from "../shared/lib/db-schema"
import { mergePromptSegments } from "../shared/lib/prompt-utils"

function mergeSegmentsWithWeights(workbenchCards: any[]): PromptSegment[] {
  const segmentsWithWeights = workbenchCards.flatMap((card) => {
    const segs = card.promptSegments || []
    const cardWeight = card.weight !== undefined ? card.weight : 1.0
    return segs.map((seg: any) => {
      const segWeight = seg.weight !== undefined ? seg.weight : 1.0
      const finalWeight = parseFloat((segWeight * cardWeight).toFixed(2))
      return {
        ...seg,
        weight: finalWeight !== 1.0 ? finalWeight : undefined
      }
    })
  })
  return mergePromptSegments(segmentsWithWeights)
}

function mergeParameters(workbenchCards: any[]): any {
  const nextParams = { ...workbenchCards[0].parameters }

  const srefList = workbenchCards
    .filter((p) => p.parameters?.sref)
    .map((p) => ({ items: p.parameters.sref!, cardWeight: p.weight }))
  nextParams.sref = mergeReferences(srefList).slice(0, 5)

  const crefList = workbenchCards
    .filter((p) => p.parameters?.cref)
    .map((p) => ({ items: p.parameters.cref!, cardWeight: p.weight }))
  nextParams.cref = mergeReferences(crefList).slice(0, 5)

  workbenchCards.slice(1).forEach((parent) => {
    if (parent.parameters?.imagePrompts) {
      nextParams.imagePrompts = Array.from(
        new Set([
          ...(parent.parameters.imagePrompts || []),
          ...(nextParams.imagePrompts || [])
        ])
      ).slice(0, 5)
    }
    if (parent.parameters?.p) {
      nextParams.p = Array.from(
        new Set([...(parent.parameters.p || []), ...(nextParams.p || [])])
      ).slice(0, 5)
    }
  })
  return nextParams
}

export function usePromptSegmentsSync(
  workbenchCards: any[],
  setEditedSegments: (seg: PromptSegment[]) => void,
  setEditedParams: (p: any) => void,
  setSlotValues: (vals: Record<string, string>) => void
) {
  useEffect(() => {
    if (workbenchCards.length === 0) {
      setEditedSegments([])
      setEditedParams({})
      setSlotValues({})
      return
    }

    let nextSegments: PromptSegment[]
    let nextParams: any

    if (workbenchCards.length === 1) {
      const target = workbenchCards[0]
      nextSegments = target.promptSegments || []
      nextParams = target.parameters || {}
    } else {
      nextSegments = mergeSegmentsWithWeights(workbenchCards)
      nextParams = mergeParameters(workbenchCards)
    }

    setEditedSegments(nextSegments)
    setEditedParams(nextParams)

    const initialSlotValues: Record<string, string> = {}
    nextSegments.forEach((seg) => {
      if (seg.type === "slot") {
        initialSlotValues[seg.label] = seg.default || ""
      }
    })
    setSlotValues(initialSlotValues)
  }, [workbenchCards, setEditedSegments, setEditedParams, setSlotValues])
}
