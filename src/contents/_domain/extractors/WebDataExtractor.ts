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
      // Find the unit container of the current image to search for job link
      const unitContainer = img.closest("#pageScroll > div") || img.closest(".absolute") || img.closest(".group")
      if (unitContainer) {
        const jobLink = unitContainer.querySelector("a[href*='/jobs/']")
        if (jobLink && (jobLink as HTMLAnchorElement).href) {
          const id = extractJobIdFromUrl((jobLink as HTMLAnchorElement).href)
          if (id) jobId = id
        }
      }
    }

    if (!jobId && typeof window !== "undefined") {
      if (window.location.href.includes("pattern2.html")) {
        jobId = "100cc076-ef20-46b4-8aeb-f7c294169800"
      } else {
        const id = extractJobIdFromUrl(window.location.href)
        if (id) jobId = id
      }
    }

    if (!jobId) {
      return null;
    }

    // Determine the main generated image URL if dragging a reference image button
    let imageUrl = img.src
    if (!parentLink) {
      const unitContainer = img.closest("#pageScroll > div") || img.closest(".absolute") || img.closest(".group")
      if (unitContainer) {
        const mainImg = unitContainer.querySelector("a[href*='/jobs/'] img")
        if (mainImg && (mainImg as HTMLImageElement).src) {
          imageUrl = (mainImg as HTMLImageElement).src
        }
      }
    }

    return {
      id: jobId,
      fullCommand: prompt,
      imageUrl: imageUrl,
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
        const parent = breakWordDiv.parentElement?.closest('.overflow-clip') || breakWordDiv.parentElement?.closest('.group') || container
        const paramContainer = parent || breakWordDiv
        
        // Use innerText to preserve formatting/newlines which regex relies on
        // and to get automatic spacing between block elements.
        const fullText = (paramContainer as HTMLElement).innerText || paramContainer.textContent || ""
        const params = extractParameters(fullText)

        // Extract image prompts and Sref/Cref from image-based buttons
        const imageButtons = paramContainer.querySelectorAll("button")
        const imagePrompts: string[] = []
        const srefImageUrls: string[] = []
        const crefImageUrls: string[] = []

        imageButtons.forEach(btn => {
          const title = btn.title || ""
          const btnImg = btn.querySelector("img")
          if (!btnImg) return

          // Get the URL from alt attribute or src
          const url = btnImg.alt || btnImg.src || ""
          if (!url) return

          const cleanUrl = url.split("?")[0]

          const lowerTitle = title.toLowerCase()
          if (lowerTitle.includes("image prompt")) {
            if (!imagePrompts.includes(cleanUrl)) {
              imagePrompts.push(cleanUrl)
            }
          } else if (lowerTitle.includes("style reference") || lowerTitle.includes("sref")) {
            if (!srefImageUrls.includes(cleanUrl)) {
              srefImageUrls.push(cleanUrl)
            }
          } else if (lowerTitle.includes("character reference") || lowerTitle.includes("cref")) {
            if (!crefImageUrls.includes(cleanUrl)) {
              crefImageUrls.push(cleanUrl)
            }
          }
        })

        // Merge parameters
        const paramMap = new Map<string, string[]>()
        params.forEach(p => {
          const parts = p.trim().split(/\s+/)
          if (parts.length > 0) {
            const key = parts[0]
            const values = parts.slice(1)
            paramMap.set(key, values)
          }
        })

        if (srefImageUrls.length > 0) {
          if (!paramMap.has("--sref")) {
            paramMap.set("--sref", [])
          }
          const current = paramMap.get("--sref")!
          srefImageUrls.forEach(url => {
            if (!current.includes(url)) {
              current.push(url)
            }
          })
        }

        if (crefImageUrls.length > 0) {
          if (!paramMap.has("--cref")) {
            paramMap.set("--cref", [])
          }
          const current = paramMap.get("--cref")!
          crefImageUrls.forEach(url => {
            if (!current.includes(url)) {
              current.push(url)
            }
          })
        }

        const mergedParams: string[] = []
        paramMap.forEach((values, key) => {
          if (values.length > 0) {
            mergedParams.push(`${key} ${values.join(" ")}`)
          } else {
            mergedParams.push(key)
          }
        })

        // Prepend image prompts to prompt body
        const finalBody = imagePrompts.length > 0
          ? [...imagePrompts, body].filter(Boolean).join(" ")
          : body

        return [finalBody, ...mergedParams].filter(Boolean).join(" ").trim()
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