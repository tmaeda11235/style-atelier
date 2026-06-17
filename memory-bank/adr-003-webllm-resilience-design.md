# ADR 003: WebLLM (Gemma-2 2B) Resilience and Cache Integrity Design

## Status

Accepted

## Context

Integrating Gemma-2 2B (~1GB model) running client-side via WebLLM inside a Chrome Extension (Manifest V3) introduces several platform-specific challenges:

1. **Side Panel context closure**: The Side Panel is the main UI. If a user closes the Side Panel during a large model download or load process, the JavaScript execution context and any child Web Workers are immediately terminated. This can leave incomplete or corrupt files in local storage (Origin Private File System / Cache Storage), leading to hangs or initialization failures on subsequent launches.
2. **Background Service Worker constraints**: Manifest V3 Background Service Workers do not support WebGPU. Furthermore, they are subject to execution limits (terminated after 5 minutes of lifetime or 30 seconds of inactivity), making them unsuitable for managing long-running model downloads or heavy inference tasks directly.
3. **Storage Quota limits**: Downloading a 1GB model requires sufficient disk space. If the storage quota is exceeded, the browser throws a `QuotaExceededError`. There is currently no pre-download check to ensure the device has enough free space.

## Decision

We decide to implement a robust, resilient execution layer using a Chrome Offscreen Document, Cache Integrity verification, and Pre-download Quota checking.

### 1. Offscreen Document Orchestration

- **WebLLM Worker Location**: Move the WebLLM execution and download worker out of the Side Panel and host it inside a dedicated Chrome Offscreen Document (`src/offscreen.html`).
- **Persistence**: Because the Offscreen Document runs in a separate document context, it survives Side Panel closures. This allows downloads or model loading tasks to complete successfully in the background.
- **On-demand Lifecycle**:
  - The Offscreen Document is created dynamically by the Background Service Worker when a model download, load, or inference request is initiated.
  - It remains open during active tasks. Once all tasks are complete, and the Side Panel is verified to be closed, the Background Service Worker closes the Offscreen Document to conserve memory.

### 2. Cache Integrity Guardrails

- **Validation**: Before initializing WebLLM, the application verifies the integrity of the cached model weights stored in OPFS or Cache Storage.
- **Verification Logic**: Checks files against expected size metadata. If a file is incomplete or size mismatch is detected, the integrity check fails.
- **Auto-Recovery**: If the integrity check fails, the corrupt cache files are automatically purged, and the download restarts from scratch to prevent execution hangs.

### 3. Pre-download Quota Check

- **Estimation**: Before starting the download, query storage availability via `navigator.storage.estimate()`.
- **Threshold**: Require at least 1.5 GB of available storage space (1.0 GB for model weights + 500 MB safety buffer for runtime KV-cache and system overhead).
- **Graceful Failure**: If the estimated space is insufficient, the system blocks the download and triggers a quota-warning notification UI.

## Consequences

- **High Resilience**: Closing the Side Panel no longer corrupts the model cache or aborts the download.
- **WebGPU Compliance**: Offscreen Documents have access to WebGPU APIs, resolving Background Worker limitations.
- **Self-Healing Storage**: Corrupted caches are automatically recovered without requiring manual user resets.
- **Prevention of Silent Errors**: Users are notified before a download fails due to insufficient storage space.
