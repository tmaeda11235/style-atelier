/* eslint-disable no-undef */

// LiteRT-LM Offline Debug Dashboard Mock Logic
;(function () {
  let mockDownloadInterval = null
  let inferenceInterval = null

  const mockResponses = [
    "### 🔮 AI Cauldron Recipe Advice\n\nBased on your selected cards, here is the visual blend analysis:\n\n1. **Visual Harmony**: The intense luminescence of *Cyberpunk Glow* (neon blue) blends exceptionally well with *Watercolor Rain* (pink).\n\n2. **Blending Ratio**: Recommend **60% Cyberpunk Glow / 40% Watercolor Rain**. This maintains the sleek sci-fi highlights while letting the soft pink watercolor wash dominate the background.",
    "3. **Suggested Prompt**:\n> `a futuristic rainy alleyway, watercolor painting style with neon blue holograms, glowing wet pavements, pastel pink washes, intricate detail, high contrast --ar 16:9` \n\nThis blending leverages the rich depth of OPFS image caching for smooth, high-fidelity asset rendering."
  ]

  function runDownloadTicker(progress, updateCallback, finishCallback) {
    let currentProgress = progress
    mockDownloadInterval = setInterval(() => {
      currentProgress += Math.floor(Math.random() * 5) + 2
      if (currentProgress >= 100) {
        currentProgress = 100
        clearInterval(mockDownloadInterval)
        finishCallback()
      } else {
        const speed = (Math.random() * 5 + 15).toFixed(1)
        const remaining = 2 * 1024 * 1024 * 1024 * (1 - currentProgress / 100)
        const eta = Math.ceil(remaining / (speed * 1024 * 1024))
        updateCallback(currentProgress, speed, eta)
      }
    }, 300)
  }

  function typeOutput(textNode, finishCallback) {
    let responseIndex = 0
    let typedText = ""

    function typeNextPart() {
      if (responseIndex >= mockResponses.length) {
        if (inferenceInterval) clearInterval(inferenceInterval)
        finishCallback()
        return
      }

      const targetText = mockResponses[responseIndex]
      let charIndex = 0
      const charInterval = setInterval(() => {
        typedText += targetText.charAt(charIndex)
        textNode.textContent = typedText
        charIndex++

        if (charIndex >= targetText.length) {
          clearInterval(charInterval)
          responseIndex++
          typedText += "\n\n"
          setTimeout(typeNextPart, 500)
        }
      }, 15)
    }
    typeNextPart()
  }

  window.LiteRTMock = {
    startDownload(progress, updateCallback, finishCallback) {
      if (mockDownloadInterval) clearInterval(mockDownloadInterval)
      runDownloadTicker(progress, updateCallback, finishCallback)
    },
    stopDownload() {
      if (mockDownloadInterval) clearInterval(mockDownloadInterval)
    },
    runInference(textNode, updateTimeCallback, finishCallback) {
      if (inferenceInterval) clearInterval(inferenceInterval)
      let seconds = 0
      inferenceInterval = setInterval(() => {
        seconds += 0.1
        updateTimeCallback(seconds.toFixed(1))
      }, 100)

      typeOutput(textNode, (elapsed) => {
        clearInterval(inferenceInterval)
        finishCallback(elapsed)
      })
    },
    stopInference() {
      if (inferenceInterval) clearInterval(inferenceInterval)
    },
    setup(el, updateUIState, log, getModelState) {
      el("slider-progress").oninput = (e) => {
        const val = e.target.value
        el("lbl-mock-progress").textContent = `${val}%`
        const state = getModelState()
        if (state === "downloading" || state === "loading") {
          el("progress-bar").style.width = `${val}%`
          el("progress-val").textContent = `${val}%`
        }
      }

      const stopAndSet = (state) => {
        if (mockDownloadInterval) clearInterval(mockDownloadInterval)
        updateUIState(state)
      }

      el("btn-mock-downloading").onclick = () => {
        stopAndSet("downloading")
        el("progress-bar").style.width = "0%"
        el("progress-val").textContent = "0%"
      }
      el("btn-mock-initializing").onclick = () => {
        stopAndSet("loading")
        el("progress-bar").style.width = "30%"
        el("progress-val").textContent = "Loading..."
      }
      el("btn-mock-ready").onclick = () => {
        stopAndSet("ready")
        el("progress-bar").style.width = "100%"
        el("progress-val").textContent = "Ready"
      }
      el("btn-mock-error-vram").onclick = () => {
        stopAndSet("error")
        log("Simulated Error: WebGPU VRAM allocation failed.", "error")
      }
      el("btn-mock-error-net").onclick = () => {
        stopAndSet("error")
        log("Simulated Error: Network timeout.", "error")
      }
    }
  }
})()
