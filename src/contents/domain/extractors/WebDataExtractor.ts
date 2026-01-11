import type { IExtractor } from "../interfaces"
import type { HistoryItem } from "../../../lib/db-schema";
import { extractJobIdFromUrl, cleanPromptBody, extractParameters } from "../../../lib/mj-parser"

export class WebDataExtractor implements IExtractor {
  extract(element: HTMLElement): HistoryItem | null {
    const img = element as HTMLImageElement
    if (img.tagName !== "IMG") return null

    // Attempt to extract prompt
    let prompt = this.getPromptFromContainer(img)
    
    // Fallback logic: If extracted prompt seems missing parameters (no '--') 
    // but alt text has them, prefer alt text.
    if ((!prompt || !prompt.includes('--')) && img.alt && img.alt.includes('--')) {
        prompt = img.alt
    } else if (!prompt) {
        prompt = img.alt || ""
    }
    
    // Attempt to extract Job ID from parent link
    let jobId = ""
    const parentLink = img.closest("a")
    if (parentLink && parentLink.href) {
        const id = extractJobIdFromUrl(parentLink.href)
        if (id) jobId = id
    }

    if (!jobId) {
      return null;
    }

    return {
      id: jobId,
      fullCommand: prompt,
      imageUrl: img.src,
      timestamp: Date.now(),
    }
  }

  private getPromptFromContainer(img: HTMLImageElement): string {
    // Helper to extract using mj-parser functions
    const extractFromContainer = (container: Element): string | null => {
        const breakWordDiv = container.querySelector(".break-word")
        if (!breakWordDiv) return null

        // 1. Get Prompt Body
        const body = cleanPromptBody(breakWordDiv)

        // 2. Get Parameters
        // Look in parent container to ensure we catch parameters if they are outside break-word
        const parent = breakWordDiv.closest('.overflow-clip') || breakWordDiv.closest('.group') || breakWordDiv.parentElement
        const paramContainer = parent || breakWordDiv
        
        // Use innerText to preserve formatting/newlines which regex relies on
        // and to get automatic spacing between block elements.
        const fullText = (paramContainer as HTMLElement).innerText || param.textContent || ""
        const params = extractParameters(fullText)

        return [body, ...params].filter(Boolean).join(" ").trim()
    }

    // Strategy 1: Look for common container under #pageScroll
    const unitContainer = img.closest("#pageScroll > div") || img.closest(".absolute") || img.closest(".group")
    if (unitContainer) {
        const result = extractFromContainer(unitContainer)
        if (result) return result
    }

    // Strategy 2: Traverse up 5 levels (Fallback)
    let current: HTMLElement | null = img.parentElement
    for (let i = 0; i < 5; i++) {
        if (!current) break
        // Check if this container has .break-word inside it
        if (current.querySelector(".break-word")) {
            const result = extractFromContainer(current)
            if (result) return result
        }
        current = current.parentElement
    }
    return ""
  }
}