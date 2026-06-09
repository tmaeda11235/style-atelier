import { StyleAtelierDatabase } from "../db"

/**
 * 物理パージ関数 purgeDeletedRecords
 *
 * 指定された閾値 (thresholdMs) より前に論理削除された (isDeleted: true) レコード（カードおよびカテゴリ）を
 * IndexedDBから物理削除 (delete) する。
 *
 * @param db データベースインスタンス
 * @param thresholdMs 経過時間の閾値 (ミリ秒)。例えば60日分なら 60 * 24 * 60 * 60 * 1000
 */
export async function purgeDeletedRecords(
  db: StyleAtelierDatabase,
  thresholdMs: number
): Promise<void> {
  // Guard for mocked/stubbed DB in test environments
  if (
    typeof db.styleCards?.toCollection !== "function" ||
    typeof db.categories?.toCollection !== "function"
  ) {
    return
  }

  const boundaryTime = Date.now() - thresholdMs

  // 1. StyleCards の物理削除
  const cardsToPurge = await db.styleCards
    .toCollection()
    .filter((card) => !!card.isDeleted && card.updatedAt < boundaryTime)
    .toArray()

  if (cardsToPurge.length > 0) {
    const cardIds = cardsToPurge.map((card) => card.id)
    await db.styleCards.bulkDelete(cardIds)
  }

  // 2. Categories の物理削除
  const categoriesToPurge = await db.categories
    .toCollection()
    .filter((cat) => {
      if (!cat.isDeleted) return false
      const updatedAt = cat.updatedAt || cat.createdAt
      return updatedAt < boundaryTime
    })
    .toArray()

  if (categoriesToPurge.length > 0) {
    const categoryIds = categoriesToPurge.map((cat) => cat.id)
    await db.categories.bulkDelete(categoryIds)
  }
}
