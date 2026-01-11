export interface ParsedData {
  src: string;
  prompt: string;
  jobId?: string;
  source?: string;
}

export const extractJobIdFromUrl = (url: string): string | undefined => {
  const uuidPattern = /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/
  
  // 1. Check for /jobs/ path
  if (url.includes("/jobs/")) {
    const match = url.match(uuidPattern)
    if (match) return match[1]
  }

  // 2. Check for MJ CDN URL
  if (url.includes("cdn.midjourney.com")) {
    const match = url.match(uuidPattern)
    if (match) return match[1]
  }

  // 3. Fallback: Just look for UUID pattern if it looks like a MJ related string
  // (Optional, but kept specific to avoid false positives in random text)
  
  return undefined
}

// Regex to match Midjourney parameters
const PARAM_REGEX = /(--[a-z0-9-]+)([^\r\n]*?)(?=\s--|$|[\r\n])/g

/**
 * Parses text to extract Midjourney parameters.
 * @param text The full text content to search
 * @returns Array of parameter strings (e.g. ["--ar 16:9", "--v 6.0"])
 */
export const extractParameters = (text: string): string[] => {
  const matches = [...text.matchAll(PARAM_REGEX)]
  const paramMap = new Map<string, string[]>()

  matches.forEach(match => {
    const rawParam = match[0].trim()

    // Split into key and value
    // key is --name, value is the rest
    const parts = rawParam.split(/\s+/)
    const fullKey = parts[0] // e.g. --sref
    const keyName = fullKey.substring(2) // e.g. sref

    let value = ""
    if (parts.length > 1) {
      value = rawParam.substring(fullKey.length).trim()

      // Clean up repetition: if the value contains the key name again, cut it off.
      // Example: "--sref 123 sref 123" -> value "123 sref 123"
      // We want to remove " sref 123"

      // Regex to find the key name as a whole word
      const repetitionRegex = new RegExp(`\\s+${keyName}\\b.*$`, "i")
      value = value.replace(repetitionRegex, "").trim()
    }

    if (!paramMap.has(fullKey)) {
      paramMap.set(fullKey, [])
    }

    if (value) {
      paramMap.get(fullKey)?.push(value)
    }
  })

  // Reconstruct merged parameters
  const results: string[] = []
  paramMap.forEach((values, key) => {
    if (values.length > 0) {
      // Join multiple values for the same key with space
      // e.g. --sref A and --sref B -> --sref A B
      results.push(`${key} ${values.join(" ")}`)
    } else {
      // Flag-only parameter (e.g. --tile)
      results.push(key)
    }
  })

  return results
}

/**
 * Clean up text by removing extra whitespace and newlines
 */
export const normalizeText = (text: string): string => {
  return text.replace(/[\n\r]+/g, " ").replace(/\s+/g, " ").trim()
}

/**
 * Extracts the main prompt body from the job card.
 */
export const cleanPromptBody = (element: Element): string => {
  const clone = element.cloneNode(true) as HTMLElement

  // Remove buttons which typically contain parameters or actions
  const buttons = clone.querySelectorAll("button, a, img, .hidden, [aria-hidden='true']")
  buttons.forEach(b => b.remove())

  let text = clone.textContent || ""

  // Remove known UI noise
  text = text.replace(/\+\s*use text/gi, "")

  return normalizeText(text)
}

export const parseDroppedData = (dataTransfer: DataTransfer): ParsedData | null => {
  // Priority 1: Custom JSON Data (from Content Script)
  const jsonData = dataTransfer.getData("application/json")
  if (jsonData) {
    try {
      const data = JSON.parse(jsonData)
      if (data.src) {
        return {
          src: data.src,
          prompt: data.prompt || "No prompt available",
          jobId: data.jobId,
          source: data.source || "unknown"
        }
      }
    } catch (err) {
      console.error("Failed to parse JSON data:", err)
    }
  }

  // Priority 2: Standard URL (Fallback for job links)
  const url = dataTransfer.getData("text/uri-list") || dataTransfer.getData("text/plain")
  if (url) {
    // Check if it is a Job URL
    if (url.includes("/jobs/")) {
      const jobId = extractJobIdFromUrl(url)
      if (jobId) {
        const imageUrl = `https://cdn.midjourney.com/${jobId}/0_0.webp`
        return {
          src: imageUrl,
          prompt: "Prompt not available from URL",
          jobId: jobId,
          source: "url-job"
        }
      }
    }

    // Direct Image URL
    if (url.match(/\.(webp|png|jpg|jpeg|gif)$/i) || url.includes("cdn.midjourney.com")) {
       const jobId = extractJobIdFromUrl(url)

       return {
         src: url,
         prompt: "Prompt not available from URL",
         jobId: jobId,
         source: "url-image"
       }
    }
  }

  return null
}