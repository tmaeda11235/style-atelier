import { useEffect, useState } from "react"

import { db } from "../lib/db"
import type { PromptSegment, StyleCard } from "../lib/db-schema"
import { createThumbnailDataUrl } from "../lib/image-utils"

interface FormFields {
  name: string
  tier: string
  promptSegments: PromptSegment[]
  parameters: StyleCard["parameters"]
  isSrefHidden: boolean
  isPHidden: boolean
  category: string
  tags: string[]
  selectedThumbs: string[]
}

function getInitialFields(card: StyleCard): FormFields {
  return {
    name: card.name,
    tier: card.tier || "",
    promptSegments: card.promptSegments || [],
    parameters: card.parameters || {},
    isSrefHidden: card.masking?.isSrefHidden || false,
    isPHidden: card.masking?.isPHidden || false,
    category: card.category || "",
    tags: card.tags || [],
    selectedThumbs:
      card.selectedThumbnails ||
      (card.thumbnailData ? [card.thumbnailData] : [])
  }
}

function useParents(card: StyleCard) {
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

  return parents
}

function useCardFormState(card: StyleCard) {
  const [fields, setFields] = useState<FormFields>(() => getInitialFields(card))

  useEffect(() => {
    setFields(getInitialFields(card))
  }, [card])

  const setField = <K extends keyof FormFields>(
    key: K,
    value: FormFields[K]
  ) => {
    setFields((prev) => ({ ...prev, [key]: value }))
  }

  return {
    ...fields,
    fields,
    setName: (val: string) => setField("name", val),
    setTier: (val: string) => setField("tier", val),
    setPromptSegments: (val: PromptSegment[]) =>
      setField("promptSegments", val),
    setParameters: (val: StyleCard["parameters"]) =>
      setField("parameters", val),
    setIsSrefHidden: (val: boolean) => setField("isSrefHidden", val),
    setIsPHidden: (val: boolean) => setField("isPHidden", val),
    setCategory: (val: string) => setField("category", val),
    setTags: (val: string[]) => setField("tags", val),
    setSelectedThumbs: (val: string[]) => setField("selectedThumbs", val)
  }
}

async function getThumbnailData(primaryThumb: string): Promise<string> {
  try {
    return await createThumbnailDataUrl(primaryThumb)
  } catch (err) {
    console.error("Failed to convert thumbnail to Base64:", err)
    return primaryThumb
  }
}

function buildVersionHistory(
  card: StyleCard,
  newValues: { name: string; promptSegments: any[]; parameters: any }
) {
  const isChanged =
    card.name !== newValues.name ||
    JSON.stringify(card.promptSegments || []) !==
      JSON.stringify(newValues.promptSegments) ||
    JSON.stringify(card.parameters || {}) !==
      JSON.stringify(newValues.parameters)

  const history = card.versionHistory ? [...card.versionHistory] : []
  if (!isChanged) return history

  const newVersion = {
    id: crypto.randomUUID
      ? crypto.randomUUID()
      : Math.random().toString(36).substring(2, 11),
    timestamp: card.updatedAt || card.createdAt,
    name: card.name,
    promptSegments: card.promptSegments || [],
    parameters: card.parameters || {}
  }
  return [newVersion, ...history].slice(0, 10)
}

async function buildUpdatedCard(
  card: StyleCard,
  formValues: FormFields & { images: string[] }
): Promise<StyleCard> {
  const primaryThumb =
    formValues.selectedThumbs[0] || formValues.images[0] || "assets/icon.png"
  const thumbnailData = await getThumbnailData(primaryThumb)
  const versionHistory = buildVersionHistory(card, formValues)

  return {
    ...card,
    name: formValues.name,
    tier: formValues.tier,
    promptSegments: formValues.promptSegments,
    parameters: formValues.parameters,
    tags: formValues.tags,
    images: formValues.images,
    selectedThumbnails: formValues.selectedThumbs,
    thumbnailData,
    category: formValues.category || undefined,
    masking: {
      isSrefHidden: formValues.isSrefHidden,
      isPHidden: formValues.isPHidden
    },
    versionHistory,
    updatedAt: Date.now()
  }
}

export function useCardDetailsForm(
  card: StyleCard,
  onSave: (updatedCard: StyleCard) => Promise<void>
) {
  const state = useCardFormState(card)
  const parents = useParents(card)

  const images =
    card.images && card.images.length > 0
      ? card.images
      : [card.thumbnailData].filter(Boolean)

  const handleToggleThumbnail = (imgUrl: string) => {
    const thumbs = state.selectedThumbs
    const nextThumbs = thumbs.includes(imgUrl)
      ? thumbs.filter((url) => url !== imgUrl)
      : thumbs.length < 4
        ? [...thumbs, imgUrl]
        : [...thumbs.slice(1), imgUrl]
    state.setSelectedThumbs(nextThumbs)
  }

  const handleSaveChanges = async () => {
    try {
      const updated = await buildUpdatedCard(card, {
        ...state.fields,
        images
      })
      await onSave(updated)
    } catch (err) {
      console.error("Failed to save style card updates:", err)
    }
  }

  const handleRollback = (version: any) => {
    state.setName(version.name)
    state.setPromptSegments(version.promptSegments || [])
    state.setParameters(version.parameters || {})
  }

  return {
    ...state,
    parents,
    images,
    handleToggleThumbnail,
    handleSaveChanges,
    handleRollback
  }
}
