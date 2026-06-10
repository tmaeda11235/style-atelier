console.log("WebLLM Worker context initialized.")

let downloadTimer: any = null

self.onmessage = (event) => {
  console.log("WebLLM Worker received message:", event.data)
  const { action } = event.data

  if (action === "start-download") {
    if (downloadTimer) {
      clearInterval(downloadTimer)
    }
    let progress = 0
    // Notify start
    self.postMessage({ status: "downloading", progress: 0 })

    downloadTimer = setInterval(() => {
      progress += 10
      if (progress >= 100) {
        clearInterval(downloadTimer)
        downloadTimer = null
        self.postMessage({ status: "ready" })
      } else {
        self.postMessage({ status: "downloading", progress })
      }
    }, 200) // 200ms per 10%
  } else {
    self.postMessage({
      status: "success",
      info: "Worker echo: " + JSON.stringify(event.data)
    })
  }
}
