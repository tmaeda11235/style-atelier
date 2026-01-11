export interface ParsedData {
  src: string;
  prompt: string;
  jobId?: string;
  source?: string;
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
      const match = url.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/)
      if (match) {
        const jobId = match[1]
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
       // Try to extract Job ID from MJ CDN URL
       // Format: https://cdn.midjourney.com/93a93e8d-8386-4e50-967a-e4909a3493e8/0_0.webp
       const jobIdMatch = url.match(/([a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12})/)
       const jobId = jobIdMatch ? jobIdMatch[1] : undefined

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