export function setupWorkerCache() {
  const useCache =
    typeof process !== "undefined" && process.env
      ? process.env.PLASMO_PUBLIC_USE_LOCAL_CACHE === "true"
      : false
  if (useCache) {
    console.log("Worker caching redirect enabled.")
    const originalFetch = self.fetch
    self.fetch = async (
      input: RequestInfo | URL,
      init?: RequestInit
    ): Promise<Response> => {
      const urlStr =
        typeof input === "string"
          ? input
          : input instanceof URL
            ? input.toString()
            : input.url
      if (urlStr.startsWith("https://huggingface.co/")) {
        const url = new URL(urlStr)
        const localUrl = new URL(
          url.pathname + url.search,
          "http://localhost:8888"
        )
        console.log(
          `[Worker Local Cache Redirect]: ${urlStr} -> ${localUrl.toString()}`
        )
        try {
          const response = await originalFetch(localUrl.toString(), init)
          if (response.ok || response.status === 206) {
            console.log(
              `[Worker Local Cache Redirect]: Cache HIT! Serving from cache server.`
            )
            return response
          }
          console.warn(
            `[Worker Local Cache Redirect]: Cache MISS (status ${response.status}). Falling back to live network...`
          )
        } catch (err: any) {
          console.warn(
            `[Worker Local Cache Redirect]: Cache MISS (error: ${err.message}). Falling back to live network...`
          )
        }
      }
      return originalFetch(input, init)
    }
  }
}
