import type { PromptSegment } from "../../shared/lib/db-schema"

export async function sendToWorkbench(
  value: string,
  label: string,
  addCard: (card: any) => Promise<any>,
  addLog?: (msg: string) => void
) {
  const trimmed = value.trim()
  if (!trimmed) return
  try {
    await addCard({
      id: crypto.randomUUID(),
      name: trimmed,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      promptSegments: [{ type: "text" as const, value: trimmed }],
      parameters: {},
      masking: { isSrefHidden: false, isPHidden: false },
      tier: "Common" as const,
      isFavorite: false,
      isPinned: true,
      usageCount: 0,
      tags: [label.toLowerCase()],
      dominantColor: "#cbd5e1",
      thumbnailData: "",
      frameId: "default",
      genealogy: { generation: 1, parentIds: [] },
      isVariable: true,
      associatedJobIds: []
    })
    addLog?.(`Sent "${trimmed}" to Workbench under tag "${label}"`)
  } catch (err) {
    console.error("Failed to send card to Workbench:", err)
  }
}

export async function extractPortion(
  name: string,
  segments: PromptSegment[],
  params: any,
  addCard: (card: any) => Promise<any>,
  addLog?: (msg: string) => void
) {
  try {
    await addCard({
      id: crypto.randomUUID(),
      name: `[Portion] ${name}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      promptSegments: segments,
      parameters: params,
      masking: { isSrefHidden: false, isPHidden: false },
      tier: "Common" as const,
      isFavorite: false,
      isPinned: true,
      usageCount: 0,
      tags: ["extracted"],
      dominantColor: "#cbd5e1",
      thumbnailData: "",
      frameId: "default",
      genealogy: { generation: 1, parentIds: [] },
      isVariable: true
    })
    addLog?.(`Extracted portion: "${name}" to Hand`)
  } catch (err) {
    console.error("Failed to extract portion:", err)
  }
}

export function mintVariation(
  onStartVariationMinting: ((base: any) => void) | undefined,
  setIsBlending: (b: boolean) => void,
  workbenchCards: any[],
  editedSegments: PromptSegment[],
  editedParams: any
) {
  if (!onStartVariationMinting) return
  setIsBlending(true)
  setTimeout(() => {
    setIsBlending(false)
    const maxGen = Math.max(
      ...workbenchCards.map((c) => c.genealogy?.generation || 1),
      0
    )
    onStartVariationMinting({
      promptSegments: editedSegments,
      parameters: editedParams,
      genealogy: {
        generation: maxGen + 1,
        parentIds: workbenchCards.map((c) => c.id),
        originCreatorId: "user",
        mutationNote: `Blended from: ${workbenchCards.map((c) => c.name).join(", ")}`
      },
      thumbnailData: workbenchCards[0]?.thumbnailData || "assets/icon.png",
      images: workbenchCards.flatMap((c) => c.images || []).filter(Boolean),
      selectedThumbnails: workbenchCards
        .flatMap((c) => c.selectedThumbnails || [])
        .filter(Boolean)
    })
  }, 1200)
}

export async function evolveTargetCard(
  targetCard: any,
  evolveCard: (id: string) => Promise<any>,
  setEvolvedCardData: (data: any) => void,
  setIsEvolutionSuccessOpen: (open: boolean) => void,
  addLog?: (msg: string) => void,
  setAlertType?: (type: any) => void
) {
  if (!targetCard) return
  try {
    const oldTier = targetCard.tier
    const nextTier = await evolveCard(targetCard.id)
    setEvolvedCardData({
      name: targetCard.name,
      thumbnailData: targetCard.thumbnailData,
      selectedThumbnails: targetCard.selectedThumbnails,
      oldTier,
      newTier: nextTier
    })
    setIsEvolutionSuccessOpen(true)
    addLog?.(`Evolved card "${targetCard.name}" from ${oldTier} to ${nextTier}`)
  } catch (err: any) {
    console.error("Evolution failed:", err)
    setAlertType?.("db_error")
  }
}
