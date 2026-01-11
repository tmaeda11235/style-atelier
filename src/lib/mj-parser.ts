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