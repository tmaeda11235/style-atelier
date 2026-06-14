export interface ThemeStyle {
  container: string
  title: string
  subfoldersGrid: string
  cardSlot: string
}

export const THEME_STYLES: Record<string, ThemeStyle> = {
  classic: {
    container:
      "bg-amber-50/80 border-double border-4 border-amber-700/40 p-4 rounded-xl shadow-inner font-serif",
    title: "text-amber-900 font-bold font-serif",
    subfoldersGrid: "border-amber-700/20 bg-amber-100/30",
    cardSlot:
      "border-amber-600/30 shadow-[0_4px_6px_-1px_rgba(180,83,9,0.1)] hover:border-amber-600/80 transition-colors bg-amber-50/50"
  },
  magic: {
    container:
      "bg-gradient-to-br from-purple-950 via-slate-900 to-indigo-950 border border-purple-500/50 p-4 rounded-xl shadow-[0_0_15px_rgba(168,85,247,0.4)] text-indigo-100 font-serif",
    title:
      "text-purple-300 font-bold font-serif drop-shadow-[0_0_6px_rgba(168,85,247,0.6)]",
    subfoldersGrid: "border-purple-500/30 bg-purple-950/40",
    cardSlot:
      "border-purple-500/30 shadow-[0_0_8px_rgba(168,85,247,0.2)] hover:shadow-[0_0_12px_rgba(236,72,153,0.5)] hover:border-pink-500/60 transition-all bg-slate-900"
  },
  cyberpunk: {
    container:
      "bg-slate-950 border-2 border-cyan-400 border-r-pink-500 border-b-pink-500 p-4 rounded-lg shadow-[0_0_10px_#06b6d4] text-cyan-300 font-mono",
    title:
      "text-pink-500 font-extrabold font-mono tracking-widest uppercase drop-shadow-[0_0_5px_#ec4899]",
    subfoldersGrid: "border-cyan-500/40 bg-zinc-900/80",
    cardSlot:
      "border-cyan-500 hover:border-pink-500 shadow-[0_0_5px_#06b6d4] hover:shadow-[0_0_8px_#ec4899] transition-all bg-zinc-950"
  },
  minimal: {
    container:
      "bg-zinc-900 border border-zinc-800 p-4 rounded-xl text-zinc-100 font-sans",
    title: "text-zinc-100 font-medium font-sans",
    subfoldersGrid: "border-zinc-800 bg-zinc-950",
    cardSlot:
      "border-zinc-800 hover:border-zinc-700 hover:bg-zinc-800/40 transition-colors shadow-none bg-zinc-900"
  }
}
