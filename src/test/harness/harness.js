/* eslint-disable no-undef */
import { initHarnessCache } from "./mockSetup"

// LiteRT-LM Offline Debug Dashboard & Profiler Controller
const el = (id) => document.getElementById(id)
let currentMode = "mock"
let modelState = "unloaded"
let activeWorker = null
let inferenceStartTime = 0

function log(msg, type = "info") {
  const time = new Date().toLocaleTimeString()
  const entry = document.createElement("div")
  entry.className = "log-entry"
  entry.innerHTML = `<span class="log-time">[${time}]</span> <span class="log-msg log-${type}">${msg}</span>`
  el("event-logs").appendChild(entry)
  el("event-logs").scrollTop = el("event-logs").scrollHeight
}

function updateUIState(state = modelState) {
  modelState = state
  el("status-indicator").className = `status-badge state-${state}`
  el("status-text").textContent = state.toUpperCase()
  if (state === "unloaded") {
    el("progress-bar").style.width = "0%"
    el("progress-val").textContent = "0%"
    el("metric-speed").textContent = "-"
    el("metric-eta").textContent = "-"
    el("metric-vram").textContent = "-"
    el("metric-memory").textContent = "-"
  }
  el("btn-run-inference").disabled = state !== "ready"
}

function setMode(mode) {
  currentMode = mode
  if (mode === "mock") {
    el("btn-mode-mock").classList.add("active")
    el("btn-mode-real").classList.remove("active")
    el("mock-controls-card").classList.remove("hide")
    log("Switched to Mock Mode. Simulated actions active.", "info")
    if (activeWorker) {
      activeWorker.terminate()
      activeWorker = null
      log("Real Worker terminated.", "warning")
    }
  } else {
    el("btn-mode-mock").classList.remove("active")
    el("btn-mode-real").classList.add("active")
    el("mock-controls-card").classList.add("hide")
    log("Switched to Real Mode. Real WebGPU active.", "info")
    initRealWorker()
  }
  updateUIState()
}

async function updateOPFSInfo() {
  if (!navigator.storage || !navigator.storage.getDirectory) {
    el("opfs-quota").textContent = "OPFS Not Supported"
    return
  }
  try {
    const estimate = await navigator.storage.estimate()
    el("opfs-quota").textContent =
      `${(estimate.usage / (1024 * 1024)).toFixed(1)} MB / ${(estimate.quota / (1024 * 1024 * 1024)).toFixed(1)} GB`
    const root = await navigator.storage.getDirectory()
    const opfsDir = await root.getDirectoryHandle("litert_models")
    const fileHandle = await opfsDir.getFileHandle(
      "gemma-4-E2B-it-web.litertlm"
    )
    const file = await fileHandle.getFile()
    el("opfs-model-exists").textContent = "Found"
    el("opfs-model-exists").className = "value badge badge-success"
    el("opfs-model-size").textContent =
      `${(file.size / (1024 * 1024 * 1024)).toFixed(2)} GB`
  } catch {
    el("opfs-model-exists").textContent = "Not Found"
    el("opfs-model-exists").className = "value badge badge-error"
    el("opfs-model-size").textContent = "-"
  }
}

function startMockDownload() {
  updateUIState("downloading")
  log("Starting simulated download...", "info")
  LiteRTMock.startDownload(
    0,
    (prog, speed, eta) => {
      el("progress-bar").style.width = `${prog}%`
      el("progress-val").textContent = `${prog}%`
      el("metric-speed").textContent = `${speed} MB/s`
      el("metric-eta").textContent = `${eta}s`
    },
    () => {
      el("progress-bar").style.width = "100%"
      el("progress-val").textContent = "100%"
      log("Simulated download finished.", "success")
      startMockLoading()
    }
  )
}

function startMockLoading() {
  updateUIState("loading")
  log("Simulating Wasm initialization...", "info")
  el("progress-bar").style.width = "80%"
  el("progress-val").textContent = "Loading..."
  setTimeout(() => {
    updateUIState("ready")
    log("Simulated engine is ready.", "success")
    el("progress-bar").style.width = "100%"
    el("progress-val").textContent = "Ready"
    el("metric-vram").textContent = "480 MB"
    el("metric-memory").textContent = "1.2 GB"
    updateOPFSInfo()
  }, 2000)
}

function startMockInference() {
  log("Simulating inference...", "info")
  el("btn-run-inference").disabled = true
  el("btn-cancel-inference").disabled = false
  el("inference-time-badge").classList.remove("hide")
  el("inference-output").textContent = ""
  el("inference-output").classList.remove("placeholder")
  inferenceStartTime = Date.now()
  LiteRTMock.runInference(
    el("inference-output"),
    (timeVal) => {
      el("inference-time").textContent = timeVal
    },
    (elapsed) => {
      el("btn-run-inference").disabled = false
      el("btn-cancel-inference").disabled = true
      log(`Simulated inference completed in ${elapsed}s.`, "success")
    }
  )
}

function updateMetrics(metrics) {
  if (!metrics) return
  const { latencyMs, tokensPerSec, estimatedTokens, vramBytes } = metrics
  el("inference-time").textContent = (latencyMs / 1000).toFixed(2)
  el("metric-speed").textContent = `${tokensPerSec} t/s`
  el("metric-vram").textContent =
    `${(vramBytes / (1024 * 1024 * 1024)).toFixed(2)} GB`
  el("metric-memory").textContent = `${estimatedTokens} tokens`
}

function handleWorkerMessage(event) {
  const data = event.data
  if (!data) return
  log(`Worker event: status=${data.status}`, "info")
  switch (data.status) {
    case "downloading": {
      updateUIState("downloading")
      el("progress-bar").style.width = `${data.progress}%`
      el("progress-val").textContent = `${data.progress}%`
      el("metric-speed").textContent = data.speed ? `${data.speed} MB/s` : "-"
      el("metric-eta").textContent = data.eta ? `${data.eta}s` : "-"
      break
    }
    case "engine-initializing": {
      updateUIState("loading")
      el("progress-bar").style.width = `${data.progress}%`
      el("progress-val").textContent = `${data.progress}%`
      break
    }
    case "engine-ready":
    case "ready": {
      updateUIState("ready")
      el("progress-bar").style.width = "100%"
      el("progress-val").textContent = "Ready"
      log("Engine READY.", "success")
      updateOPFSInfo()
      break
    }
    case "inference-result": {
      el("btn-run-inference").disabled = false
      el("btn-cancel-inference").disabled = true
      el("inference-output").textContent = data.result
      el("inference-output").classList.remove("placeholder")
      const elapsed = ((Date.now() - inferenceStartTime) / 1000).toFixed(1)
      el("inference-time").textContent = elapsed
      updateMetrics(data.metrics)
      log(`Inference result received in ${elapsed}s.`, "success")
      break
    }
    case "inference-error":
    case "error": {
      updateUIState("error")
      el("btn-run-inference").disabled = false
      el("btn-cancel-inference").disabled = true
      el("inference-output").textContent = `Error: ${data.error || "Failed"}`
      log(`Worker error: ${data.error}`, "error")
      break
    }
  }
}

function initRealWorker() {
  try {
    log("Initializing real LiteRT worker...", "info")
    activeWorker = new Worker(
      new URL("../../litert.worker.ts", import.meta.url),
      {
        type: "module"
      }
    )
    activeWorker.onmessage = handleWorkerMessage
    activeWorker.onerror = (err) => {
      log(`Worker error: ${err.message}`, "error")
      updateUIState("error")
    }
    activeWorker.postMessage({ action: "init", wasmPath: "../../assets/wasm" })
    log("Worker initialized.", "success")
  } catch (err) {
    log(`Failed to create worker: ${err.message}`, "error")
    updateUIState("error")
  }
}

function runRealInference() {
  if (!activeWorker) return
  const prompt = el("input-prompt").value.trim()
  const systemPrompt = el("input-system-prompt").value.trim()
  if (!prompt) return
  log("Running real inference...", "info")
  el("btn-run-inference").disabled = true
  el("btn-cancel-inference").disabled = false
  el("inference-time-badge").classList.remove("hide")
  el("inference-output").textContent = "Generating output..."
  inferenceStartTime = Date.now()
  activeWorker.postMessage({
    action: "run-inference",
    requestId: Math.random().toString(36).substring(7),
    prompt,
    systemPrompt
  })
}

function setupEventListeners() {
  el("btn-mode-mock").onclick = () => setMode("mock")
  el("btn-mode-real").onclick = () => setMode("real")
  el("btn-start-download").onclick = () => {
    if (currentMode === "mock") startMockDownload()
    else if (activeWorker)
      activeWorker.postMessage({ action: "start-download" })
  }
  el("btn-preload").onclick = () => {
    if (currentMode === "mock") startMockLoading()
    else if (activeWorker) activeWorker.postMessage({ action: "preload" })
  }
  el("btn-unload").onclick = () => {
    if (currentMode === "mock") updateUIState("unloaded")
    else if (activeWorker) activeWorker.postMessage({ action: "unload" })
  }
  el("btn-purge").onclick = purgeOPFS
  LiteRTMock.setup(el, updateUIState, log, () => modelState)
  setupConsoleControls()
}

async function purgeOPFS() {
  log("Purging OPFS...", "info")
  if (activeWorker) activeWorker.postMessage({ action: "unload" })
  if (navigator.storage && navigator.storage.getDirectory) {
    try {
      const root = await navigator.storage.getDirectory()
      await root.removeEntry("litert_models", { recursive: true })
      log("OPFS purged.", "success")
    } catch (err) {
      log(`OPFS purge issue: ${err.message}`, "warning")
    }
  }
  updateUIState("unloaded")
  updateOPFSInfo()
}

function setupConsoleControls() {
  el("select-preset").onchange = (e) => {
    const preset = LiteRTPresets[e.target.value]
    if (preset) {
      el("input-system-prompt").value = preset.system
      el("input-prompt").value = preset.prompt
    }
  }
  el("btn-run-inference").onclick = () => {
    if (currentMode === "mock") startMockInference()
    else runRealInference()
  }
  el("btn-cancel-inference").onclick = () => {
    if (currentMode === "mock") LiteRTMock.stopInference()
    el("btn-run-inference").disabled = false
    el("btn-cancel-inference").disabled = true
    el("inference-output").textContent = "Inference cancelled."
    log("Inference cancelled.", "warning")
  }
  el("btn-clear-logs").onclick = () => {
    el("event-logs").innerHTML = ""
  }
}

window.addEventListener("load", () => {
  const defaultPreset = LiteRTPresets.recipe
  el("input-system-prompt").value = defaultPreset.system
  el("input-prompt").value = defaultPreset.prompt
  updateOPFSInfo()
  setupEventListeners()
  setInterval(updateOPFSInfo, 5000)
  log("Dashboard ready.", "success")

  // Initialize MSW Mock Service Worker
  initHarnessCache(el("msw-status-badge"), (msg, isError) =>
    log(msg, isError ? "error" : "info")
  )
})
