import React from "react"

interface ThemeSelectionFieldProps {
  t: any
  theme: string
  setTheme: (v: string) => void
}

export function ThemeSelectionField({
  t,
  theme,
  setTheme
}: ThemeSelectionFieldProps) {
  return (
    <div>
      <label className="block text-xs font-semibold text-slate-500 mb-1">
        {t.skinTheme || "Skin Theme"}
      </label>
      <select
        value={theme}
        onChange={(e) => setTheme(e.target.value)}
        data-testid="category-theme-select"
        className="w-full text-xs border rounded-md p-2 bg-white text-slate-700 focus:outline-none focus:ring-1 focus:ring-blue-500">
        <option value="">{t.systemDefault || "System Default"}</option>
        <option value="classic">
          {t.themes?.classic || "Classic Atelier"}
        </option>
        <option value="magic">{t.themes?.magic || "Magic Library"}</option>
        <option value="cyberpunk">
          {t.themes?.cyberpunk || "Cyberpunk Synth"}
        </option>
        <option value="minimal">{t.themes?.minimal || "Minimal Dark"}</option>
      </select>
    </div>
  )
}
