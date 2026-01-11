import type { IExtractor, IMJElementData } from "../interfaces"

export class WebDataExtractor implements IExtractor {
  extract(element: HTMLElement): IMJElementData | null {
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
        const match = parentLink.href.match(/jobs\/([a-f0-9-]{36})/)
        if (match) jobId = match[1]
    }

    return {
      src: img.src,
      prompt: prompt,
      jobId: jobId,
      source: "midjourney-web"
    }
  }

  private getPromptFromContainer(img: HTMLImageElement): string {
    // Strategy 1: Look for common container under #pageScroll (User provided selector)
    const unitContainer = img.closest("#pageScroll > div") || img.closest(".absolute") || img.closest(".group")
    
    if (unitContainer) {
        const breakWordDiv = unitContainer.querySelector(".break-word")
        
        if (breakWordDiv) {
            let fullText = ""

            // 1. Get Prompt Text (Clean prompt without buttons/params)
            // Clone spans to safely remove button elements (parameters) before extracting text
            const spans = Array.from(breakWordDiv.querySelectorAll(":scope > span"))
            spans.forEach(span => {
                if (span.querySelector("img")) return // Skip thumbnail

                const clone = span.cloneNode(true) as HTMLElement
                // Remove buttons (parameters) to get pure prompt text
                const buttons = clone.querySelectorAll("button")
                buttons.forEach(b => b.remove())
                
                const text = clone.textContent?.trim()
                if (text) fullText += text + " "
            })

            fullText = fullText.trim()

            // 2. Get Parameters from Buttons (Structure based extraction)
            // Search in the common parent to cover both responsive layouts
            const parent = breakWordDiv.closest('.overflow-clip') || breakWordDiv.closest('.group') || breakWordDiv.parentElement
            if (parent) {
                const allButtons = parent.querySelectorAll("button")
                allButtons.forEach(btn => {
                    // Midjourney parameter buttons typically have this structure:
                    // span.opacity-80 (Label: --ar)
                    // span.line-clamp-2 (Value: 16:9)
                    const labelSpan = btn.querySelector("span.opacity-80") || btn.querySelector("span.text-light-500") // Fallback class
                    const valueSpan = btn.querySelector("span.line-clamp-2")
                    
                    if (labelSpan && valueSpan) {
                        const label = labelSpan.textContent?.trim()
                        const value = valueSpan.textContent?.trim()
                        if (label && value) {
                            // Clean up label (remove -- if duplicated, though usually it's correct)
                            fullText += ` ${label} ${value}`
                        }
                    } else {
                        // Fallback: Try to extract parameter from button text if structure doesn't match
                        // This handles cases like --sref where the structure might be different
                        const rawText = btn.textContent?.trim() || ""
                        // Simple heuristic: if it contains "--", treat it as a parameter
                        if (rawText.includes('--')) {
                            // Remove newlines and excessive spaces
                            const cleanText = rawText.replace(/\s+/g, ' ').trim()
                            // Avoid duplicates if we can, but appending is safer than missing it
                            if (!fullText.includes(cleanText)) {
                                fullText += ` ${cleanText}`
                            }
                        }
                    }
                })
            }

            if (fullText) return fullText.trim()
        }
    }

    // Strategy 2: Traverse up 5 levels (Fallback)
    let current: HTMLElement | null = img.parentElement
    for (let i = 0; i < 5; i++) {
        if (!current) break
        const breakWordDiv = current.querySelector(".break-word")
        if (breakWordDiv) {
            let fullText = ""
            
            const spans = Array.from(breakWordDiv.querySelectorAll(":scope > span"))
            spans.forEach(span => {
                if (span.querySelector("img")) return

                const clone = span.cloneNode(true) as HTMLElement
                const buttons = clone.querySelectorAll("button")
                buttons.forEach(b => b.remove())
                
                const text = clone.textContent?.trim()
                if (text) fullText += text + " "
            })

            fullText = fullText.trim()

            const parent = breakWordDiv.closest('.overflow-clip') || breakWordDiv.closest('.group') || breakWordDiv.parentElement
            if (parent) {
                const allButtons = parent.querySelectorAll("button")
                allButtons.forEach(btn => {
                    const labelSpan = btn.querySelector("span.opacity-80") || btn.querySelector("span.text-light-500")
                    const valueSpan = btn.querySelector("span.line-clamp-2")
                    
                    if (labelSpan && valueSpan) {
                        const label = labelSpan.textContent?.trim()
                        const value = valueSpan.textContent?.trim()
                        if (label && value) {
                            fullText += ` ${label} ${value}`
                        }
                    } else {
                        // Fallback for Strategy 2
                        const rawText = btn.textContent?.trim() || ""
                        if (rawText.includes('--')) {
                            const cleanText = rawText.replace(/\s+/g, ' ').trim()
                            if (!fullText.includes(cleanText)) {
                                fullText += ` ${cleanText}`
                            }
                        }
                    }
                })
            }

            if (fullText) return fullText.trim()
        }
        current = current.parentElement
    }
    return ""
  }
}