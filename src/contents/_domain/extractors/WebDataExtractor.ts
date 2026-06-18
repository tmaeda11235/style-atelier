import {
  cleanPromptBody,
  extractJobIdFromUrl,
  extractParameters
} from "../../../lib/mj-parser"
import type { HistoryItem } from "../../../shared/lib/db-schema"
import type { IExtractor } from "../interfaces"

interface ImageReferences {
  imagePrompts: string[]
  srefImageUrls: string[]
  crefImageUrls: string[]
}

export class WebDataExtractor implements IExtractor {
  extract(element: HTMLElement): HistoryItem | null {
    const img = element as HTMLImageElement
    if (img.tagName !== "IMG") return null

    const jobId = this.extractJobId(img, img.closest("a"))
    if (!jobId) return null

    const prompt = this.extractPrompt(img)
    const imageUrl = this.extractImageUrl(img, img.closest("a"))

    return {
      id: jobId,
      fullCommand: prompt,
      imageUrl,
      timestamp: Date.now()
    }
  }

  private extractPrompt(img: HTMLImageElement): string {
    let prompt = this.getPromptFromContainer(img)

    if (
      (!prompt || !prompt.includes("--")) &&
      img.alt &&
      img.alt.includes("--")
    ) {
      prompt = img.alt
    } else if (!prompt) {
      prompt = img.alt || ""
    }
    return prompt
  }

  private extractJobId(
    img: HTMLImageElement,
    parentLink: HTMLAnchorElement | null
  ): string {
    return (
      this.getJobIdFromDataAttr(img) ||
      this.getJobIdFromParentLink(parentLink) ||
      this.getJobIdFromUnitContainer(img) ||
      this.getJobIdFromModalContainer(img) ||
      this.getJobIdFromWindowUrl()
    )
  }

  private getJobIdFromDataAttr(img: HTMLImageElement): string {
    const dataJobIdEl = img.closest("[data-job-id]")
    return (dataJobIdEl && dataJobIdEl.getAttribute("data-job-id")) || ""
  }

  private getJobIdFromParentLink(parentLink: HTMLAnchorElement | null): string {
    if (parentLink && parentLink.href) {
      return extractJobIdFromUrl(parentLink.href) || ""
    }
    return ""
  }

  private getJobIdFromUnitContainer(img: HTMLImageElement): string {
    const unitContainer =
      img.closest("#pageScroll > div") ||
      img.closest(".absolute") ||
      img.closest(".group")
    if (unitContainer) {
      const jobLink = unitContainer.querySelector("a[href*='/jobs/']")
      if (jobLink && (jobLink as HTMLAnchorElement).href) {
        return extractJobIdFromUrl((jobLink as HTMLAnchorElement).href) || ""
      }
    }
    return ""
  }

  private getJobIdFromModalContainer(img: HTMLImageElement): string {
    const modalContainer =
      img.closest(".fixed") ||
      img.closest("[draggable='true']") ||
      (typeof document !== "undefined" ? document.body : null)
    if (modalContainer) {
      const jobLink = modalContainer.querySelector("a[href*='/jobs/']")
      if (jobLink && (jobLink as HTMLAnchorElement).href) {
        return extractJobIdFromUrl((jobLink as HTMLAnchorElement).href) || ""
      }
    }
    return ""
  }

  private getJobIdFromWindowUrl(): string {
    if (typeof window !== "undefined") {
      return extractJobIdFromUrl(window.location.href) || ""
    }
    return ""
  }

  private extractImageUrl(
    img: HTMLImageElement,
    parentLink: HTMLAnchorElement | null
  ): string {
    if (!parentLink) {
      const unitContainer =
        img.closest("#pageScroll > div") ||
        img.closest(".absolute") ||
        img.closest(".group")
      if (unitContainer) {
        const mainImg = unitContainer.querySelector("a[href*='/jobs/'] img")
        if (mainImg && (mainImg as HTMLImageElement).src) {
          return (mainImg as HTMLImageElement).src
        }
      }
    }
    return img.src
  }

  private getPromptFromContainer(img: HTMLImageElement): string {
    // Strategy 1: Look for common container under #pageScroll
    const unitContainer =
      img.closest("#pageScroll > div") ||
      img.closest(".absolute") ||
      img.closest(".group")
    if (unitContainer) {
      const result = this.extractFromContainer(unitContainer)
      if (result) return result
    }

    // Strategy 2: Traverse up 5 levels (Fallback)
    let current: HTMLElement | null = img.parentElement
    for (let i = 0; i < 5; i++) {
      if (!current) break
      if (current.querySelector(".break-word")) {
        const result = this.extractFromContainer(current)
        if (result) return result
      }
      current = current.parentElement
    }
    return ""
  }

  private extractFromContainer(container: Element): string | null {
    const breakWordDiv = container.querySelector(".break-word")
    if (!breakWordDiv) return null

    const body = cleanPromptBody(breakWordDiv)

    // Look in parent container to ensure we catch parameters if they are outside break-word
    const parent =
      breakWordDiv.parentElement?.closest(".overflow-clip") ||
      breakWordDiv.parentElement?.closest(".group") ||
      container
    const paramContainer = parent || breakWordDiv

    const fullText =
      (paramContainer as HTMLElement).innerText ||
      paramContainer.textContent ||
      ""
    const params = extractParameters(fullText)

    const { imagePrompts, srefImageUrls, crefImageUrls } =
      this.extractImageUrlsFromButtons(paramContainer)
    const mergedParams = this.mergeParameters(
      params,
      srefImageUrls,
      crefImageUrls
    )
    const finalBody = this.assembleFinalBody(body, imagePrompts)

    return [finalBody, ...mergedParams].filter(Boolean).join(" ").trim()
  }

  private extractImageUrlsFromButtons(
    paramContainer: Element
  ): ImageReferences {
    const imageButtons = paramContainer.querySelectorAll("button")
    const imagePrompts: string[] = []
    const srefImageUrls: string[] = []
    const crefImageUrls: string[] = []

    imageButtons.forEach((btn) => {
      const title = btn.title || ""
      const btnImg = btn.querySelector("img")
      if (!btnImg) return

      const url = btnImg.alt || btnImg.src || ""
      if (!url) return

      const cleanUrl = url.split("?")[0]
      const lowerTitle = title.toLowerCase()

      if (lowerTitle.includes("image prompt")) {
        if (!imagePrompts.includes(cleanUrl)) {
          imagePrompts.push(cleanUrl)
        }
      } else if (
        lowerTitle.includes("style reference") ||
        lowerTitle.includes("sref")
      ) {
        if (!srefImageUrls.includes(cleanUrl)) {
          srefImageUrls.push(cleanUrl)
        }
      } else if (
        lowerTitle.includes("character reference") ||
        lowerTitle.includes("cref")
      ) {
        if (!crefImageUrls.includes(cleanUrl)) {
          crefImageUrls.push(cleanUrl)
        }
      }
    })

    return { imagePrompts, srefImageUrls, crefImageUrls }
  }

  private mergeParameters(
    params: string[],
    srefUrls: string[],
    crefUrls: string[]
  ): string[] {
    const paramMap = new Map<string, string[]>()
    params.forEach((p) => {
      const parts = p.trim().split(/\s+/)
      if (parts.length > 0) {
        const key = parts[0]
        const values = parts.slice(1)
        paramMap.set(key, values)
      }
    })

    this.appendUrlsToParamMap(paramMap, "--sref", srefUrls)
    this.appendUrlsToParamMap(paramMap, "--cref", crefUrls)

    const mergedParams: string[] = []
    paramMap.forEach((values, key) => {
      if (values.length > 0) {
        mergedParams.push(`${key} ${values.join(" ")}`)
      } else {
        mergedParams.push(key)
      }
    })
    return mergedParams
  }

  private appendUrlsToParamMap(
    paramMap: Map<string, string[]>,
    key: string,
    urls: string[]
  ): void {
    if (urls.length === 0) return
    if (!paramMap.has(key)) {
      paramMap.set(key, [])
    }
    const current = paramMap.get(key)!
    urls.forEach((url) => {
      if (!current.includes(url)) {
        current.push(url)
      }
    })
  }

  private assembleFinalBody(body: string, imagePrompts: string[]): string {
    return imagePrompts.length > 0
      ? [...imagePrompts, body].filter(Boolean).join(" ")
      : body
  }
}
