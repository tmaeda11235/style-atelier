# Mobile PWA Technical Feasibility Study (Service Worker, WebLLM / LiteRT, Storage, & OAuth)

This document provides a technical feasibility analysis for implementing a Progressive Web App (PWA) wrapper for the Style Atelier Mobile page, with a focus on local AI inference, offline storage capabilities, and Google Drive OAuth integration on mobile platforms (iOS Safari & Android Chrome).

---

## 1. Local AI Inference (WebLLM / LiteRT-LM) on Mobile Devices

Running lightweight Large Language Models (e.g., Gemma 2B via `@litert-lm/core`) client-side in a mobile browser environment presents significant hardware and runtime challenges.

### Memory Constraints & Out-of-Memory (OOM) Issues

- **iOS Safari / WebKit Process Limits**:
  - iOS imposes strict per-tab memory limits. Depending on the device RAM (e.g., 4GB on base iPhones, 8GB on Pro models), WebKit processes will be force-killed by the iOS jetsam (Out-of-Memory killer) if memory usage exceeds **1.5 GB to 2.0 GB** (and as low as **350 MB - 512 MB** on older devices).
  - Since a Gemma 2B model requires approximately **1.3 GB to 1.5 GB** of memory just for the weights (even at INT4/FP4 quantization), plus additional memory for KV cache and WASM runtime overhead, running it is highly likely to trigger immediate process crashes.
- **Unified Memory (Unified SoC Architecture)**:
  - On mobile SoCs, system RAM and GPU VRAM are shared. Allocating large WebGPU buffers directly counts toward the WebKit process's system memory limit, accelerating OOM conditions.
- **Android (Chrome)**:
  - Memory limits are generally higher and depend on the Android low-memory killer (LMK) thresholds. However, low-to-mid range devices (with 4GB or 6GB of total RAM) will still frequently terminate Chrome when running 2B+ parameter models.

### API & GPU Support (WebGPU vs. WASM)

- **iOS Safari (WebGPU Status)**:
  - As of iOS 17/18, WebGPU is **not enabled by default** in Safari. It must be manually activated via Advanced Experimental Features. Consequently, average mobile users will fall back to WASM-based CPU inference.
- **Android Chrome (WebGPU Status)**:
  - WebGPU is supported by default from Chrome 121 on devices with compatible Vulkan-supported hardware.
- **WASM / CPU Inference Performance**:
  - Running a 2B model via WASM (even with SIMD optimizations) on mobile CPUs is extremely slow (frequently generating less than **0.5 - 1.0 token/second**), rendering the feature practically unusable.

### Technical Recommendations & Fallbacks

1. **Hybrid Execution (Cloud Fallback)**: A fallback API endpoint (e.g., Gemini API or a server-side LLM endpoint) **must** be implemented. Local execution should only be attempted on devices that support WebGPU and have sufficient RAM (verified using `navigator.deviceMemory`, which is supported on Android Chrome, though not on Safari).
2. **Web Worker Offloading**: To prevent UI thread freezing, the LiteRT-LM runtime must be executed entirely within a Web Worker or Offscreen Document.
3. **Model Pre-checks**: The application should query WebGPU support (`navigator.gpu`) before attempting model download, displaying a graceful degradation message or switching to cloud API mode if WebGPU is absent.

---

## 2. Google Drive OAuth2 Integration on Mobile PWA

OAuth2 flows behave differently when a web app is installed as a PWA (Standalone/Fullscreen mode) compared to running in a standard browser tab.

### Standalone Mode (A2HS) Redirect Issue

- **The Problem**: In standalone PWA mode, navigating to external authentication pages (like `accounts.google.com`) often forces the OS to open the login page in the default system browser (Safari/Chrome) instead of the PWA wrapper. After authentication, the redirect back to the PWA redirect URI may load in the browser tab instead of the installed PWA, breaking the session state and preventing the token from reaching the PWA context.
- **Mitigation**:
  - Use the **Google Identity Services (GIS) TokenClient** with a **popup flow** rather than a full redirect.
  - Implement a secure cross-origin communication mechanism (e.g., window communication using `postMessage` from an OAuth callback helper iframe/tab back to the parent PWA).
  - Alternatively, leverage a local proxy or service-worker interceptor to relay tokens.

### Safari Popup Blockers

- **Behavior**: iOS Safari blocks any `window.open` or popup instantiation that is not the direct, synchronous result of a user-initiated interaction (like a `click` event).
- **Mitigation**: The Google Login button trigger must synchronously call `tokenClient.requestAccessToken()` inside the click event handler. Async operations (e.g., checking network status, fetching API keys) must not precede the authorization pop-up initialization.

---

## 3. Offline Storage (IndexedDB / Cache API) & Service Worker Constraints

Hosting a PWA offline requires careful handling of static assets, user card data, and potentially large model parameters.

### Storage Quota Allocations

- **iOS Safari (WebKit Temporary Storage)**:
  - **7-Day Cap**: For normal website visits, WebKit enforces a 7-day cap on all writable storage (IndexedDB, Cache API, LocalStorage). If the user does not interact with the site for 7 consecutive days, iOS deletes all local storage.
  - **PWA Exemption**: Once the web app is added to the home screen (A2HS) and launched as a PWA, it is **exempt** from the 7-day storage cap. The storage persists unless the device runs extremely low on space.
- **Android Chrome**:
  - Chrome allows PWAs to use up to **60%** of the device's free disk space. Storage persists indefinitely unless the system experiences critical storage pressure.

### Caching Strategy: Static Assets vs. Large Model Files

- **Service Worker + Cache API**:
  - Ideal for HTML, JS, CSS, and localized JSON card files (`temp_shared_cards.json`).
  - Cache sizes for standard assets should be kept minimal (under 50MB) to ensure fast install and update times.
- **Origin Private File System (OPFS)**:
  - **Do not use Cache API or standard IndexedDB for LLM models**. Storing >1GB model files in Cache API or converting them to blobs inside IndexedDB leads to severe memory pressure and disk I/O bottlenecks.
  - Instead, use **OPFS (Origin Private File System)**. OPFS provides direct private file access with high-speed read/write capabilities (via `FileSystemSyncAccessHandle` in Web Workers), which matches the requirements of WASM-based execution.
