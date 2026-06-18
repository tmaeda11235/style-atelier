import {
  deleteOpfsFile,
  listOpfsFiles
} from "../../shared/lib/db/migration-helpers"
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

/**
 * OPFS上の画像ファイルをスキャンし、IndexedDBのアクティブなレコードから
 * 参照されていない（または isDeleted: true となっている）画像ファイルを削除する。
 */
async function getActiveImagePaths(
  db: StyleAtelierDatabase
): Promise<Set<string>> {
  const activeCards = await db.styleCards.filter((c) => !c.isDeleted).toArray()
  const activeCategories = await db.categories
    .filter((c) => !c.isDeleted)
    .toArray()

  const referencedPaths = new Set<string>()
  for (const card of activeCards) {
    if (card.thumbnailPath) {
      referencedPaths.add(card.thumbnailPath)
    }
  }
  for (const cat of activeCategories) {
    if (cat.coverImagePath) {
      referencedPaths.add(cat.coverImagePath)
    }
  }
  return referencedPaths
}

/**
 * OPFS上の画像ファイルをスキャンし、IndexedDBのアクティブなレコードから
 * 参照されていない（または isDeleted: true となっている）画像ファイルを削除する。
 */
export async function cleanupOrphanedImages(
  db: StyleAtelierDatabase
): Promise<void> {
  if (
    typeof navigator === "undefined" ||
    !navigator.storage ||
    !navigator.storage.getDirectory
  ) {
    return
  }

  const referencedPaths = await getActiveImagePaths(db)
  const root = await navigator.storage.getDirectory()
  let imagesDir: FileSystemDirectoryHandle

  try {
    imagesDir = await root.getDirectoryHandle("images", { create: false })
  } catch (err: any) {
    if (err.name === "NotFoundError") {
      return // images ディレクトリがなければクリーンアップするものもない
    }
    throw err
  }

  const files = await listOpfsFiles(imagesDir)
  for (const file of files) {
    const fullPath = `images/${file.filePath}`
    if (!referencedPaths.has(fullPath)) {
      await deleteOpfsFile(fullPath).catch((err) => {
        console.warn(
          `[OPFS GC] Failed to delete orphaned image ${fullPath}:`,
          err
        )
      })
    }
  }
}
