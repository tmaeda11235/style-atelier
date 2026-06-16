import { http, passthrough } from "msw"

export const handlers = [
  http.get("https://huggingface.co/*", async ({ request }) => {
    const url = new URL(request.url)
    // Map the huggingface.co path directly to localhost:8888
    const localUrl = new URL(url.pathname + url.search, "http://localhost:8888")

    console.log(`[MSW Cache Redirect]: Intercepted ${request.url}`)

    try {
      // Fetch from the local cache server, passing through headers (e.g. Range headers)
      const localResponse = await fetch(localUrl.toString(), {
        method: request.method,
        headers: request.headers
      })

      if (localResponse.ok || localResponse.status === 206) {
        console.log(
          `[MSW Cache Redirect]: Cache HIT! Serving from ${localUrl.toString()}`
        )
        return localResponse
      }

      console.log(
        `[MSW Cache Redirect]: Cache MISS (status ${localResponse.status}). Falling back to network...`
      )
    } catch (err: any) {
      console.log(
        `[MSW Cache Redirect]: Cache MISS (error: ${err.message}). Falling back to network...`
      )
    }

    return passthrough()
  })
]
