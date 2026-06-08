import { useEffect, useState } from "react"

import { db } from "../lib/db"
import type { PromptSegment, StyleCard } from "../lib/db-schema"
import { createThumbnailDataUrl } from "../lib/image-utils"

export function useCardDetailsForm(
  card: StyleCard,
  onSave: (updatedCard: StyleCard) => Promise<void>
) {
  const [name, setName] = useState(card.name)
  const [tier, setTier] = useState(card.tier)
  const [promptSegments, setPromptSegments] = useState<PromptSegment[]>(
    card.promptSegments || []
  )
  const [parameters, setParameters] = useState<StyleCard["parameters"]>(
    card.parameters || {}
  )
  const [isSrefHidden, setIsSrefHidden] = useState(
    card.masking?.isSrefHidden || false
  )
  const [isPHidden, setIsPHidden] = useState(card.masking?.isPHidden || false)
  const [category, setCategory] = useState(card.category || "")
  const [tags, setTags] = useState<string[]>(card.tags || [])

  const images =
    card.images && card.images.length > 0
      ? card.images
      : [card.thumbnailData].filter(Boolean)

  const [selectedThumbs, setSelectedThumbs] = useState<string[]>(
    card.selectedThumbnails || (card.thumbnailData ? [card.thumbnailData] : [])
  )

  const [parents, setParents] = useState<(StyleCard | null)[]>([])

  useEffect(() => {
    const fetchParents = async () => {
      if (card.genealogy?.parentIds && card.genealogy.parentIds.length > 0) {
        try {
          const fetched = await Promise.all(
            card.genealogy.parentIds.map(async (id) => {
              const parent = await db.getCard(id)
              return parent || null
            })
          )
          setParents(fetched)
        } catch (err) {
          console.error("Failed to fetch parent cards:", err)
          setParents(card.genealogy.parentIds.map(() => null))
        }
      } else {
        setParents([])
      }
    }

    fetchParents()
  }, [card])

  useEffect(() => {
    setName(card.name)
    setTier(card.tier)
    setPromptSegments(card.promptSegments || [])
    setParameters(card.parameters || {})
    setIsSrefHidden(card.masking?.isSrefHidden || false)
    setIsPHidden(card.masking?.isPHidden || false)
    setCategory(card.category || "")
    setTags(card.tags || [])
    setSelectedThumbs(
      card.selectedThumbnails ||
        (card.thumbnailData ? [card.thumbnailData] : [])
    )
  }, [card])

  const handleToggleThumbnail = (imgUrl: string) => {
    if (selectedThumbs.includes(imgUrl)) {
      setSelectedThumbs(selectedThumbs.filter((url) => url !== imgUrl))
    } else {
      if (selectedThumbs.length < 4) {
        setSelectedThumbs([...selectedThumbs, imgUrl])
      } else {
        setSelectedThumbs([...selectedThumbs.slice(1), imgUrl])
      }
    }
  }

  const handleSaveChanges = async () => {
    const primaryThumb = selectedThumbs[0] || images[0] || "assets/icon.png"
    let thumbnailData = primaryThumb
    try {
      thumbnailData = await createThumbnailDataUrl(primaryThumb)
    } catch (err) {
      console.error("Failed to convert thumbnail to Base64:", err)
    }

    const isSegmentsEqual = (a: PromptSegment[], b: PromptSegment[]) => {
      return JSON.stringify(a) === JSON.stringify(b)
    }

    const isParamsEqual = (
      a: StyleCard["parameters"],
      b: StyleCard["parameters"]
    ) => {
      return JSON.stringify(a) === JSON.stringify(b)
    }

    const isChanged =
      card.name !== name ||
      !isSegmentsEqual(card.promptSegments || [], promptSegments) ||
      !isParamsEqual(card.parameters || {}, parameters)

    let updatedVersionHistory = card.versionHistory
      ? [...card.versionHistory]
      : []

    if (isChanged) {
      const newVersion = {
        id: crypto.randomUUID
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 11),
        timestamp: card.updatedAt || card.createdAt,
        name: card.name,
        promptSegments: card.promptSegments || [],
        parameters: card.parameters || {}
      }
      updatedVersionHistory = [newVersion, ...updatedVersionHistory].slice(
        0,
        10
      )
    }

    const updatedCard: StyleCard = {
      ...card,
      name,
      tier,
      promptSegments,
      parameters,
      tags,
      images,
      selectedThumbnails: selectedThumbs,
      thumbnailData,
      category: category || undefined,
      masking: {
        isSrefHidden,
        isPHidden
      },
      versionHistory: updatedVersionHistory,
      updatedAt: Date.now()
    }

    try {
      await onSave(updatedCard)
    } catch (err) {
      console.error("Failed to save style card updates:", err)
    }
  }

  const handleRollback = (version: any) => {
    setName(version.name)
    setPromptSegments(version.promptSegments || [])
    setParameters(version.parameters || {})
  }

  return {
    name,
    setName,
    tier,
    setTier,
    promptSegments,
    setPromptSegments,
    parameters,
    setParameters,
    isSrefHidden,
    setIsSrefHidden,
    isPHidden,
    setIsPHidden,
    category,
    setCategory,
    tags,
    setTags,
    selectedThumbs,
    setSelectedThumbs,
    parents,
    images,
    handleToggleThumbnail,
    handleSaveChanges,
    handleRollback
  }
}
