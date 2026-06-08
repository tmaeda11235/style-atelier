import type { StyleAtelierDatabase } from "../db"
import type { StyleCard } from "../db-schema"

export async function deleteStyleCardAndCleanup(
  db: StyleAtelierDatabase,
  cardId: string
): Promise<void> {
  return db.transaction("rw", [db.styleCards, db.categories], async () => {
    const affectedCategories = await db.categories
      .filter((cat) => cat.iconCardId === cardId)
      .toArray()

    for (const cat of affectedCategories) {
      await db.categories.update(cat.id, {
        iconCardId: undefined,
        iconUrl: undefined,
        updatedAt: Date.now()
      })
    }

    const card = await db.styleCards.get(cardId)
    if (card) {
      await db.styleCards.update(cardId, {
        isDeleted: true,
        thumbnailData: "",
        images: [],
        selectedThumbnails: [],
        updatedAt: Date.now()
      })
    }
  })
}

export async function deleteCategory(
  db: StyleAtelierDatabase,
  id: string
): Promise<void> {
  return db.transaction("rw", [db.styleCards, db.categories], async () => {
    await db.categories.update(id, {
      isDeleted: true,
      updatedAt: Date.now()
    })

    await db.styleCards
      .where("category")
      .equals(id)
      .modify((card) => {
        delete card.category
        card.updatedAt = Date.now()
      })
  })
}

export async function mergeStyleCards(
  db: StyleAtelierDatabase,
  representativeId: string,
  materials: StyleCard[],
  consumeStates: Record<string, boolean>
): Promise<void> {
  return db.transaction("rw", [db.styleCards, db.categories], async () => {
    const representative = await db.styleCards.get(representativeId)
    if (!representative) throw new Error("Representative card not found")

    const mergedImages = [...(representative.images || [])]
    if (
      representative.thumbnailData &&
      !mergedImages.includes(representative.thumbnailData)
    ) {
      mergedImages.push(representative.thumbnailData)
    }

    const mergedJobIds = [...(representative.associatedJobIds || [])]
    if (representative.jobId && !mergedJobIds.includes(representative.jobId)) {
      mergedJobIds.push(representative.jobId)
    }

    const extraUsageCount = await processMergeMaterials(
      db,
      materials,
      consumeStates,
      mergedImages,
      mergedJobIds
    )

    await db.styleCards.update(representativeId, {
      images: mergedImages,
      associatedJobIds: mergedJobIds,
      usageCount: (representative.usageCount || 0) + extraUsageCount,
      updatedAt: Date.now()
    })
  })
}

async function processMergeMaterials(
  db: StyleAtelierDatabase,
  materials: StyleCard[],
  consumeStates: Record<string, boolean>,
  mergedImages: string[],
  mergedJobIds: string[]
): Promise<number> {
  let extraUsageCount = 0

  for (const mat of materials) {
    mergeImagesFromMaterial(mergedImages, mat)
    mergeJobIdsFromMaterial(mergedJobIds, mat)

    const isConsumed = consumeStates[mat.id]
    if (isConsumed) {
      extraUsageCount += mat.usageCount || 0
      await deleteStyleCardAndCleanup(db, mat.id)
    }
  }

  return extraUsageCount
}

function mergeImagesFromMaterial(mergedImages: string[], mat: StyleCard): void {
  if (mat.images && mat.images.length > 0) {
    mat.images.forEach((img) => {
      if (!mergedImages.includes(img)) mergedImages.push(img)
    })
  } else if (mat.thumbnailData && !mergedImages.includes(mat.thumbnailData)) {
    mergedImages.push(mat.thumbnailData)
  }
}

function mergeJobIdsFromMaterial(mergedJobIds: string[], mat: StyleCard): void {
  if (mat.jobId && !mergedJobIds.includes(mat.jobId)) {
    mergedJobIds.push(mat.jobId)
  }
  if (mat.associatedJobIds && mat.associatedJobIds.length > 0) {
    mat.associatedJobIds.forEach((jid) => {
      if (!mergedJobIds.includes(jid)) mergedJobIds.push(jid)
    })
  }
}
