export const extractJobIdFromUrl = (url: string): string | undefined => {
  const uuidPattern =
    /([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/

  // 1. Check for /jobs/ path
  if (url.includes("/jobs/")) {
    const match = url.match(uuidPattern)
    if (match) return match[1]
  }

  // 2. Check for MJ CDN URL host
  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    return undefined
  }

  const allowedHosts = ["cdn.midjourney.com"]
  if (allowedHosts.includes(parsedUrl.hostname.toLowerCase())) {
    const match = url.match(uuidPattern)
    if (match) return match[1]
  }

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

  matches.forEach((match) => {
    const rawParam = match[0]

    // Split into key and value by the first space
    const spaceIndex = rawParam.indexOf(" ")
    const fullKey =
      spaceIndex === -1 ? rawParam : rawParam.substring(0, spaceIndex)
    const keyName = fullKey.substring(2) // e.g. sref

    let value = ""
    if (spaceIndex !== -1) {
      value = rawParam.substring(spaceIndex + 1).trim()

      if (value) {
        // Clean up repetition
        const repetitionRegex = new RegExp(`\\s+${keyName}\\b.*$`, "i")
        value = value.replace(repetitionRegex, "").trim()
      }
    }

    if (!paramMap.has(fullKey)) {
      paramMap.set(fullKey, [])
    }

    if (value) {
      paramMap.get(fullKey).push(value)
    }
  })

  // Reconstruct merged parameters
  const results: string[] = []
  paramMap.forEach((values, key) => {
    if (values.length > 0) {
      results.push(`${key} ${values.join(" ")}`)
    } else {
      results.push(key)
    }
  })

  return results
}

/**
 * Clean up text by removing extra whitespace and newlines
 */
export const normalizeText = (text: string): string => {
  return text.replace(/\s+/g, " ").trim()
}

/**
 * Extracts the main prompt body from the job card.
 */
export const cleanPromptBody = (element: Element): string => {
  const clone = element.cloneNode(true) as HTMLElement

  // Remove buttons which typically contain parameters or actions
  const buttons = clone.querySelectorAll(
    "button, a, img, .hidden, [aria-hidden='true']"
  )
  buttons.forEach((b) => b.remove())

  let text = clone.textContent || ""

  // Remove known UI noise
  text = text.replace(/\+\s*use text/gi, "")

  return normalizeText(text)
}
