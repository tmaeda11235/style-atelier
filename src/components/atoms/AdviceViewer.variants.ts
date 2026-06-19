import { cva } from "class-variance-authority"

export const adviceViewerVariants = {
  container: cva(
    "prose prose-invert max-w-none text-slate-700 dark:text-slate-300 space-y-2 font-sans"
  ),
  heading: cva(
    "font-bold text-slate-800 dark:text-indigo-300 text-[11px] pt-1.5 border-b border-slate-200/50 dark:border-indigo-950/30 pb-0.5 mb-1.5 first:pt-0"
  ),
  listItem: cva("pl-3.5 relative mb-1"),
  bullet: cva("absolute left-1 top-1.5 w-1 h-1 rounded-full bg-indigo-500"),
  strong: cva("text-slate-800 dark:text-slate-200"),
  paragraph: cva("mb-1")
}
