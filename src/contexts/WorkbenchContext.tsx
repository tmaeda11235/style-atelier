import React, { createContext, useContext, useState, useCallback } from "react";

interface WorkbenchContextType {
  selectedCardIds: string[];
  toggleCardSelection: (cardId: string) => void;
  clearWorkbench: () => void;
}

const WorkbenchContext = createContext<WorkbenchContextType | undefined>(undefined);

export const WorkbenchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedCardIds, setSelectedCardIds] = useState<string[]>([]);

  const toggleCardSelection = useCallback((cardId: string) => {
    setSelectedCardIds((prev) =>
      prev.includes(cardId) ? prev.filter((id) => id !== cardId) : [...prev, cardId]
    );
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