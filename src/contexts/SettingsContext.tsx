import React, { createContext, useContext, useState, useEffect, useCallback } from "react";

export interface ExpertFeatures {
  stack: boolean;         // Stack（カード統合）
  slot: boolean;          // Slot（変数穴あけ）
  rarity: boolean;        // レアリティ選択
  tags: boolean;          // タグ機能
  categories: boolean;    // カテゴリ管理
  multiCard: boolean;     // 複数カード同時使用
  cardEditing: boolean;   // カード編集機能
  multiImage: boolean;    // カードサムネイルへの複数画像選択
}

export const DEFAULT_EXPERT_FEATURES: ExpertFeatures = {
  stack: true,
  slot: true,
  rarity: true,
  tags: true,
  categories: true,
  multiCard: true,
  cardEditing: true,
  multiImage: true,
};

interface SettingsContextType {
  isEasyMode: boolean;
  toggleEasyMode: (enabled: boolean) => void;
  expertFeatures: ExpertFeatures;
  updateExpertFeature: (key: keyof ExpertFeatures, enabled: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isEasyMode, setIsEasyMode] = useState<boolean>(false);
  const [expertFeatures, setExpertFeatures] = useState<ExpertFeatures>(DEFAULT_EXPERT_FEATURES);

  // Load settings from localStorage on mount
  useEffect(() => {
    const easyMode = localStorage.getItem("style-atelier-easy-mode") === "true";
    setIsEasyMode(easyMode);

    const savedFeatures = localStorage.getItem("style-atelier-expert-features");
    if (savedFeatures) {
      try {
        const parsed = JSON.parse(savedFeatures);
        setExpertFeatures({
          ...DEFAULT_EXPERT_FEATURES,
          ...parsed,
        });
      } catch (e) {
        console.error("Failed to parse expert features from localStorage", e);
        setExpertFeatures(DEFAULT_EXPERT_FEATURES);
      }
    } else {
      setExpertFeatures(DEFAULT_EXPERT_FEATURES);
    }
  }, []);

  const toggleEasyMode = useCallback((enabled: boolean) => {
    setIsEasyMode(enabled);
    localStorage.setItem("style-atelier-easy-mode", enabled ? "true" : "false");
  }, []);

  const updateExpertFeature = useCallback((key: keyof ExpertFeatures, enabled: boolean) => {
    setExpertFeatures((prev) => {
      const updated = { ...prev, [key]: enabled };
      localStorage.setItem("style-atelier-expert-features", JSON.stringify(updated));
      return updated;
    });
  }, []);

  return (
    <SettingsContext.Provider
      value={{
        isEasyMode,
        toggleEasyMode,
        expertFeatures,
        updateExpertFeature,
      }}
    >
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider");
  }
  return context;
};
