import React, { createContext, useContext, useState, useCallback } from "react";
import { db } from "../lib/db";

interface WorkbenchContextType {
  selectedCardIds: string[];
  toggleCardSelection: (cardId: string) => void;
  clearWorkbench: () => void;
}

const WorkbenchContext = createContext<WorkbenchContextType | undefined>(undefined);

export const WorkbenchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  const toggleCardSelection = useCallback((cardId: string) => {
    setSelectedCardIds((prev) => {
      const isSelecting = !prev.includes(cardId);
      if (isSelecting) {
        db.getCard(cardId).then((card) => {
          if (card) {
            db.updateCard(cardId, {
              usageCount: (card.usageCount || 0) + 1
            }).catch(err => console.error("Failed to update usage count on select:", err));
          }
        }).catch(err => console.error("Failed to fetch card on select:", err));
      }
      return isSelecting ? [...prev, cardId] : prev.filter((id) => id !== cardId);
    });
  }, []);

  const clearWorkbench = useCallback(() => {
    setSelectedCardIds([]);
  }, []);

  return (
    <WorkbenchContext.Provider value={{ selectedCardIds, toggleCardSelection, clearWorkbench }}>
      {children}
    </WorkbenchContext.Provider>
  );
};

export const useWorkbenchContext = () => {
  const context = useContext(WorkbenchContext);
  if (context === undefined) {
    throw new Error("useWorkbenchContext must be used within a WorkbenchProvider");
  }
  return context;
};