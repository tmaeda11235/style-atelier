import type { StyleCard } from "../../shared/lib/db-schema"
import { computeHash } from "../../shared/lib/db/migration-helpers"
import { db } from "../db"
import {
  archiveCardInNotion,
  sendCardToNotion,
  updateCardInNotion
} from "./client"

// Helper to compute card hash for lastSyncedHash
async function calculateCardHash(card: StyleCard): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(JSON.stringify(card))
  return computeHash(data.buffer)
}

export class NotionSyncQueueManager {
  private processing = false
  private delayMs = 400 // 1秒間に最大3回に対応するため、400ms以上の間隔を空ける
  private maxRetries = 3

  async start(): Promise<void> {
    if (this.processing) {
      return
    }
    this.processing = true
    try {
      await this.processLoop()
    } finally {
      this.processing = false
    }
  }

  private async processLoop(): Promise<void> {
    while (this.processing) {
      const nextItem = await db.notionSyncQueue
        .where("status")
        .anyOf("pending", "processing")
        .first()

      if (!nextItem) {
        break
      }

      await db.notionSyncQueue.update(nextItem.cardId, {
        status: "processing",
        updatedAt: Date.now()
      })

      const card = await db.styleCards.get(nextItem.cardId)
      if (!card || card.isDeleted) {
        await this.deleteCardFromNotion(nextItem)
        await this.delay(this.delayMs)
        continue
      }

      await this.syncCard(nextItem, card)
      await this.delay(this.delayMs)
    }
  }

  private async deleteCardFromNotion(nextItem: any): Promise<void> {
    try {
      const syncState = await db.notionSyncStates.get(nextItem.cardId)
      if (syncState && syncState.notionPageId) {
        await archiveCardInNotion(syncState.notionPageId)
      }

      await db.transaction(
        "rw",
        [db.notionSyncQueue, db.notionSyncStates],
        async () => {
          await db.notionSyncQueue.update(nextItem.cardId, {
            status: "completed",
            updatedAt: Date.now()
          })

          await db.notionSyncStates.delete(nextItem.cardId)
        }
      )
    } catch (error: any) {
      console.error(`Notion archive failed for card ${nextItem.cardId}:`, error)
      const newRetryCount = nextItem.retryCount + 1
      const isMaxRetries = newRetryCount >= this.maxRetries

      await db.notionSyncQueue.update(nextItem.cardId, {
        status: isMaxRetries ? "failed" : "pending",
        retryCount: newRetryCount,
        error: error instanceof Error ? error.message : String(error),
        updatedAt: Date.now()
      })
    }
  }

  private async syncCard(nextItem: any, card: StyleCard): Promise<void> {
    try {
      const syncState = await db.notionSyncStates.get(card.id)
      const hash = await calculateCardHash(card)

      if (syncState && syncState.lastSyncedHash === hash) {
        await db.notionSyncQueue.update(nextItem.cardId, {
          status: "completed",
          updatedAt: Date.now()
        })
        return
      }

      let pageId = syncState?.notionPageId

      if (pageId) {
        await updateCardInNotion(pageId, card)
      } else {
        const result = await sendCardToNotion(card)
        pageId = result.pageId
      }

      await db.transaction(
        "rw",
        [db.notionSyncQueue, db.notionSyncStates],
        async () => {
          await db.notionSyncQueue.update(nextItem.cardId, {
            status: "completed",
            updatedAt: Date.now()
          })

          await db.notionSyncStates.put({
            cardId: card.id,
            notionPageId: pageId,
            lastSyncedAt: Date.now(),
            lastSyncedHash: hash
          })
        }
      )
    } catch (error: any) {
      console.error(`Notion sync failed for card ${nextItem.cardId}:`, error)
      const newRetryCount = nextItem.retryCount + 1
      const isMaxRetries = newRetryCount >= this.maxRetries

      await db.notionSyncQueue.update(nextItem.cardId, {
        status: isMaxRetries ? "failed" : "pending",
        retryCount: newRetryCount,
        error: error instanceof Error ? error.message : String(error),
        updatedAt: Date.now()
      })
    }
  }

  async enqueue(cardId: string): Promise<void> {
    const existing = await db.notionSyncQueue.get(cardId)
    if (existing && existing.status === "pending") {
      return
    }

    const now = Date.now()
    await db.notionSyncQueue.put({
      cardId,
      status: "pending",
      retryCount: 0,
      createdAt: now,
      updatedAt: now
    })

    // 非同期で処理開始
    this.start()
  }

  async resume(): Promise<void> {
    const processingItems = await db.notionSyncQueue
      .where("status")
      .equals("processing")
      .toArray()

    const now = Date.now()
    for (const item of processingItems) {
      await db.notionSyncQueue.update(item.cardId, {
        status: "pending",
        updatedAt: now
      })
    }

    await this.start()
  }

  stop(): void {
    this.processing = false
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}

export const notionSyncQueueManager = new NotionSyncQueueManager()
