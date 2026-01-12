import { useMemo } from "react";
import { useLiveQuery } from "dexie-react-hooks";
import { db } from "../lib/db";
import type { StyleCard } from "../lib/db-schema";
import { buildPromptString } from "../lib/prompt-utils";
import { useWorkbenchContext } from "../contexts/WorkbenchContext";

export function useWorkbench() {
  const { selectedCardIds, toggleCardSelection, clearWorkbench } = useWorkbenchContext();
  
  // 手札（Hand）にあるカードを取得
  const handCards = useLiveQuery(() => db.styleCards.filter(c => !!c.isPinned).toArray());

  // ワークベンチに配置されたカード
  const workbenchCards = useMemo(() => {
    if (!handCards) return [];
    return selectedCardIds
      .map(id => handCards.find(c => c.id === id))
      .filter((c): c is StyleCard => !!c);
  }, [handCards, selectedCardIds]);

  // 統合されたプロンプト文字列の生成
  const mergedPrompt = useMemo(() => {
    if (workbenchCards.length === 0) return "";
    
    // 単純な結合ロジック
    const promptParts = workbenchCards.map(card => {
        const maskedKeys: (keyof StyleCard["parameters"])[] = [];
        if (card.masking.isSrefHidden) maskedKeys.push("sref");
        if (card.masking.isPHidden) maskedKeys.push("p");
        return buildPromptString(card.promptSegments, card.parameters, maskedKeys);
    });

    return promptParts.join(", ");
  }, [workbenchCards]);

  return {
    handCards: handCards || [],
    workbenchCards,
    selectedCardIds,
    toggleCardSelection,
    clearWorkbench,
    mergedPrompt,
  };
}