import type { IExtractor, IMJElementData } from "../interfaces"
import { extractJobIdFromUrl } from "../../../lib/mj-parser"

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
        const id = extractJobIdFromUrl(parentLink.href)
        if (id) jobId = id
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
            // Clone the entire container to safely remove button elements (parameters) before extracting text
            const clone = breakWordDiv.cloneNode(true) as HTMLElement
            
            // Aggressively remove non-text elements that might be parameters or duplicates
            // Including 'a' tags because parameters can be links
            // Including '.hidden' to avoid extracting hidden text (responsive duplicates)
            const unwantedSelectors = [
                "button", 
                "a", 
                "img", 
                ".hidden", 
                "[aria-hidden='true']"
            ]
            const unwanted = clone.querySelectorAll(unwantedSelectors.join(","))
            unwanted.forEach(el => el.remove())
            
            fullText = clone.textContent?.trim() || ""

            // 2. Get Parameters from Buttons (Structure based extraction)
            // Search in the common parent to cover both responsive layouts
            const parent = breakWordDiv.closest('.overflow-clip') || breakWordDiv.closest('.group') || breakWordDiv.parentElement
            if (parent) {
                const allButtons = parent.querySelectorAll("button")
                const processedParams = new Set<string>()

                allButtons.forEach(btn => {
                    // Midjourney parameter buttons typically have this structure:
                    // span.opacity-80 (Label: --ar)
                    // span.line-clamp-2 (Value: 16:9)
                    const labelSpan = btn.querySelector("span.opacity-80") || btn.querySelector("span.text-light-500") // Fallback class
                    const valueSpan = btn.querySelector("span.line-clamp-2")
                    
                    if (labelSpan && valueSpan) {
                        let label = labelSpan.textContent?.trim()
                        const value = valueSpan.textContent?.trim()
                        if (label && value) {
                            // Ensure label starts with --
                            if (!label.startsWith("--")) {
                                label = "--" + label
                            }
                            // Clean up duplicate -- just in case
                            if (label.startsWith("----")) {
                                label = label.substring(2)
                            }
                            
                            const paramKey = `${label}:${value}`
                            if (processedParams.has(paramKey)) return // Skip duplicate button
                            processedParams.add(paramKey)

                            const paramText = `${label} ${value}`
                            // Avoid simple duplicates if the exact string is already in fullText
                            if (!fullText.includes(paramText)) {
                                fullText += ` ${paramText}`
                            }
                        }
                    } else {
                        // Fallback: Try to extract parameter from button text if structure doesn't match
                        const rawText = btn.textContent?.trim() || ""
                        if (rawText.includes('--')) {
                            const cleanText = rawText.replace(/\s+/g, ' ').trim()
                            
                            if (processedParams.has(cleanText)) return
                            processedParams.add(cleanText)

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
            
            // 1. Get Prompt Text (Clean prompt without buttons/params)
            const clone = breakWordDiv.cloneNode(true) as HTMLElement
            
            const unwantedSelectors = [
                "button", 
                "a", 
                "img", 
                ".hidden", 
                "[aria-hidden='true']"
            ]
            const unwanted = clone.querySelectorAll(unwantedSelectors.join(","))
            unwanted.forEach(el => el.remove())
            
            fullText = clone.textContent?.trim() || ""

            const parent = breakWordDiv.closest('.overflow-clip') || breakWordDiv.closest('.group') || breakWordDiv.parentElement
            if (parent) {
                const allButtons = parent.querySelectorAll("button")
                const processedParams = new Set<string>()

                allButtons.forEach(btn => {
                    const labelSpan = btn.querySelector("span.opacity-80") || btn.querySelector("span.text-light-500")
                    const valueSpan = btn.querySelector("span.line-clamp-2")
                    
                    if (labelSpan && valueSpan) {
                        let label = labelSpan.textContent?.trim()
                        const value = valueSpan.textContent?.trim()
                        if (label && value) {
                            if (!label.startsWith("--")) {
                                label = "--" + label
                            }
                            if (label.startsWith("----")) {
                                label = label.substring(2)
                            }

                            const paramKey = `${label}:${value}`
                            if (processedParams.has(paramKey)) return
                            processedParams.add(paramKey)

                            const paramText = `${label} ${value}`
                            if (!fullText.includes(paramText)) {
                                fullText += ` ${paramText}`
                            }
                        }
                    } else {
                        // Fallback for Strategy 2
                        const rawText = btn.textContent?.trim() || ""
                        if (rawText.includes('--')) {
                            const cleanText = rawText.replace(/\s+/g, ' ').trim()
                            
                            if (processedParams.has(cleanText)) return
                            processedParams.add(cleanText)

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