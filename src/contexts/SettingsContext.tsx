import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState
} from "react"

export interface ExpertFeatures {
  stack: boolean // Stack（カード統合）
  slot: boolean // Slot（変数穴あけ）
  rarity: boolean // レアリティ選択
  tags: boolean // タグ機能
  categories: boolean // カテゴリ管理
  multiCard: boolean // 複数カード同時使用
  cardEditing: boolean // カード編集機能
  multiImage: boolean // カードサムネイルへの複数画像選択
}

export const DEFAULT_EXPERT_FEATURES: ExpertFeatures = {
  stack: true,
  slot: true,
  rarity: true,
  tags: true,
  categories: true,
  multiCard: true,
  cardEditing: true,
  multiImage: true
}

export type Theme = "light" | "dark" | "system"

interface SettingsContextType {
  isEasyMode: boolean
  toggleEasyMode: (enabled: boolean) => void
  expertFeatures: ExpertFeatures
  updateExpertFeature: (key: keyof ExpertFeatures, enabled: boolean) => void
  showTipsBar: boolean
  toggleTipsBar: (enabled: boolean) => void
  theme: Theme
  changeTheme: (theme: Theme) => void
}

export const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
)

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({
  children
}) => {
  const [isEasyMode, setIsEasyMode] = useState<boolean>(false)
  const [expertFeatures, setExpertFeatures] = useState<ExpertFeatures>(
    DEFAULT_EXPERT_FEATURES
  )
  const [showTipsBar, setShowTipsBar] = useState<boolean>(true)
  const [theme, setTheme] = useState<Theme>("system")

  // Load settings from localStorage on mount
  useEffect(() => {
    const easyMode = localStorage.getItem("style-atelier-easy-mode") === "true"
    setIsEasyMode(easyMode)

    const savedTipsBar = localStorage.getItem("style-atelier-show-tips-bar")
    setShowTipsBar(savedTipsBar !== "false")

    const savedTheme = localStorage.getItem("style-atelier-theme") as Theme
    if (
      savedTheme === "light" ||
      savedTheme === "dark" ||
      savedTheme === "system"
    ) {
      setTheme(savedTheme)
    } else {
      setTheme("system")
    }

    const savedFeatures = localStorage.getItem("style-atelier-expert-features")
    if (savedFeatures) {
      try {
        const parsed = JSON.parse(savedFeatures)
        setExpertFeatures({
          ...DEFAULT_EXPERT_FEATURES,
          ...parsed
        })
      } catch (e) {
        console.error("Failed to parse expert features from localStorage", e)
        setExpertFeatures(DEFAULT_EXPERT_FEATURES)
      }
    } else {
      setExpertFeatures(DEFAULT_EXPERT_FEATURES)
    }
  }, [])

  const toggleEasyMode = useCallback((enabled: boolean) => {
    setIsEasyMode(enabled)
    localStorage.setItem("style-atelier-easy-mode", enabled ? "true" : "false")
  }, [])

  const toggleTipsBar = useCallback((enabled: boolean) => {
    setShowTipsBar(enabled)
    localStorage.setItem(
      "style-atelier-show-tips-bar",
      enabled ? "true" : "false"
    )
  }, [])

  const changeTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme)
    localStorage.setItem("style-atelier-theme", newTheme)
  }, [])

  const updateExpertFeature = useCallback(
    (key: keyof ExpertFeatures, enabled: boolean) => {
      setExpertFeatures((prev) => {
        const updated = { ...prev, [key]: enabled }
        localStorage.setItem(
          "style-atelier-expert-features",
          JSON.stringify(updated)
        )
        return updated
      })
    },
    []
  )

  // Effect to apply theme CSS class to document root
  useEffect(() => {
    const root = window.document.documentElement

    const applyTheme = () => {
      const isDark =
        theme === "dark" ||
        (theme === "system" &&
          window.matchMedia("(prefers-color-scheme: dark)").matches)

      if (isDark) {
        root.classList.add("dark")
      } else {
        root.classList.remove("dark")
      }
    }

    applyTheme()

    if (theme === "system") {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
      const listener = () => applyTheme()
      mediaQuery.addEventListener("change", listener)
      return () => {
        mediaQuery.removeEventListener("change", listener)
      }
    }
  }, [theme])

  return (
    <SettingsContext.Provider
      value={{
        isEasyMode,
        toggleEasyMode,
        expertFeatures,
        updateExpertFeature,
        showTipsBar,
        toggleTipsBar,
        theme,
        changeTheme
      }}>
      {children}
    </SettingsContext.Provider>
  )
}

export const useSettings = () => {
  const context = useContext(SettingsContext)
  if (context === undefined) {
    throw new Error("useSettings must be used within a SettingsProvider")
  }
  return context
}
