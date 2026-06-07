import { useLiveQuery } from "dexie-react-hooks"
import { useMemo } from "react"

import { db } from "../lib/db"
import type { StyleCard } from "../lib/db-schema"
import { buildPromptString } from "../lib/prompt-utils"

export function useWorkbench() {
  // 手札（Hand）にあるカードを取得
  const handCards = useLiveQuery(() =>
    db.styleCards.filter((c) => !!c.isPinned).toArray()
  )

  // ワークベンチに配置されたカードは手札と100%同期
  const workbenchCards = handCards || []

  const selectedCardIds = useMemo(() => {
    return workbenchCards.map((c) => c.id)
  }, [workbenchCards])

  const toggleCardSelection = async (cardId: string) => {
    try {
      const card = await db.styleCards.get(cardId)
      if (card) {
        if (card.isVariable) {
          await db.styleCards.delete(cardId)
        } else {
          await db.styleCards.update(cardId, { isPinned: !card.isPinned })
        }
      }
    } catch (err) {
      console.error("Failed to toggle card selection:", err)
    }
  }

  const clearWorkbench = async () => {
    if (!handCards) return
    try {
      await Promise.all(
        handCards.map((card) =>
          card.isVariable
            ? db.styleCards.delete(card.id)
            : db.styleCards.update(card.id, { isPinned: false })
        )
      )
    } catch (err) {
      console.error("Failed to clear workbench:", err)
    }
  }

  // 統合されたプロンプト文字列の生成
  const mergedPrompt = useMemo(() => {
    if (workbenchCards.length === 0) return ""

    // 単純な結合ロジック
    const promptParts = workbenchCards.map((card) => {
      const maskedKeys: (keyof StyleCard["parameters"])[] = []
      if (card.masking?.isSrefHidden) maskedKeys.push("sref")
      if (card.masking?.isPHidden) maskedKeys.push("p")
      return buildPromptString(card.promptSegments, card.parameters, maskedKeys)
    })

    return promptParts.join(", ")
  }, [workbenchCards])

  // slotHistory の Dexie リアルタイムクエリ
  const rawSlotHistory = useLiveQuery(() => db.getAllSlotHistory())
  const slotHistory = useMemo(() => rawSlotHistory || {}, [rawSlotHistory])

  const saveSlotHistory = async (label: string, values: string[]) => {
    try {
      await db.saveSlotHistory(label, values)
    } catch (err) {
      console.error("Failed to save slot history:", err)
    }
  }

  const addCard = async (card: any) => {
    try {
      return await db.addCard(card)
    } catch (err) {
      console.error("Failed to add card:", err)
      throw err
    }
  }

  const incrementCardUsage = async (cardId: string) => {
    try {
      const card = await db.styleCards.get(cardId)
      if (card) {
        await db.styleCards.update(cardId, {
          usageCount: (card.usageCount || 0) + 1
        })
      }
    } catch (err) {
      console.error("Failed to increment card usage:", err)
    }
  }

  return {
    handCards: handCards || [],
    workbenchCards,
    selectedCardIds,
    toggleCardSelection,
    clearWorkbench,
    mergedPrompt,
    slotHistory,
    saveSlotHistory,
    addCard,
    incrementCardUsage
  }
}
