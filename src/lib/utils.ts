import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const LAYOUT_CLASS_PATTERNS = [
  /^-?(m[trblxy]?)-/, // margins (including negative margins)
  /^(w|h)-/, // width and height
  /^(min|max)-(w|h)-/, // min/max width/height
  /^-?(top|right|bottom|left|inset)-/, // positioning coordinates (including negative coordinates)
  /^(absolute|relative|fixed|sticky|static)$/, // positioning
  /^z-/, // z-index
  /^(flex|grid|inline-flex|inline-grid|block|inline-block|hidden)$/, // display
  /^(flex|grid)-/, // flex/grid config
  /^(col|row)-/, // grid col/row
  /^(self|justify-self|align-self|place-self)-/, // alignment overrides
  /^(grow|shrink|order)-/, // flex item config
  /^shrink$/,
  /^grow$/,
  /^aspect-/ // aspect ratio
]

/**
 * Filters the provided className to keep only layout-related classes,
 * preventing external styles from breaking component design encapsulation.
 */
export function extractLayoutClasses(className?: string): string {
  if (!className) return ""
  return className
    .split(/\s+/)
    .filter((c) => LAYOUT_CLASS_PATTERNS.some((pattern) => pattern.test(c)))
    .join(" ")
}
