# ADR 005: Migration from WebLLM to LiteRT-LM (Gemma 4 E2B) for Local AI Inference

## Context

The application relies on local, offline AI inference for analyzing prompts and categorizing styles. Historically, this was implemented using `@mlc-ai/web-llm` and the Llama-3-8B-Instruct model. However, recent developments highlighted significant drawbacks with WebLLM:

1. **CSP and `importScripts` Restrictions in Manifest V3**: WebLLM's internal dependencies often attempt to dynamically load scripts or fetch assets in ways that violate Chrome Extension MV3 strict `script-src` Content Security Policies (CSP), causing frequent crashes or requiring complex workarounds.
2. **Model Weight Optimization**: Llama-3-8B is large and heavy for a browser extension. Google's LiteRT-LM combined with the highly optimized Gemma 4 E2B model offers superior performance, smaller VRAM footprint, and faster time-to-first-token in browser environments.

A technical spike (Issue #785) was conducted to verify the feasibility of replacing WebLLM with `@litert-lm/core` running the Gemma 4 E2B model.

## Decision

We will migrate the primary local AI inference engine from `@mlc-ai/web-llm` to `@litert-lm/core` using the Gemma 4 E2B model.

## Design Points & Caveats (Learnings from the Spike)

To ensure a clean and stable implementation during the rebuild, the following constraints must be strictly adhered to:

1. **WASM Vendoring and CSP (Manifest V3)**:
   - `@litert-lm/core` cannot load WASM files from external CDNs (like jsdelivr) in an MV3 extension due to remote code execution restrictions.
   - We MUST vendor the WASM and glue JS files (`litertlm_wasm_compat_internal.js`, `litertlm_wasm_internal.js`, and their respective `.wasm` files) locally within the extension's `assets/wasm` directory.
   - Plasmo config must include these files in `web_accessible_resources`.
   - MV3 `manifest.json` must include `"content_security_policy": { "extension_pages": "script-src 'self' 'wasm-unsafe-eval'" }`.
   - `LiteRtLm.DEFAULT_WASM_PATH` must be overridden to point to `chrome.runtime.getURL("assets/wasm")`.

2. **`importScripts` and `@litertjs/wasm-utils` Patching**:
   - Chrome Extensions block `importScripts` for files not matching exact MIME types or when loaded dynamically via Blob URLs with strict checking.
   - We must maintain a patch for `@litertjs/wasm-utils` to modify `importScripts` fallback logic, utilizing `fetch()` and `Blob` creation for WASM Web Worker initialization.

3. **OPFS and Streaming Downloads**:
   - The ~2GB model file (`gemma-4-E2B-it-web.litertlm`) must be downloaded and stored in the Origin Private File System (OPFS).
   - Downloading must be streamed directly to OPFS via `WritableStream` to avoid overwhelming main memory (which crashes the tab).
   - Initialization (`Engine.create`) should utilize `file.stream()` or the Blob URL from the local OPFS FileHandle, not an external URL.

4. **Offscreen Process and Main Thread Blocking**:
   - The Chrome Extension SidePanel and Offscreen Document share the same renderer process.
   - During the initial compilation of WebGPU shaders and WASM loading by LiteRT-LM, the main thread will be heavily blocked, causing the SidePanel UI to freeze for several seconds.
   - **Crucial UI Requirement**: A loading indicator ("AI Engine Initializing...") must be displayed _before_ triggering inference, and we must consider preloading the engine in the background when the panel opens.

5. **Prompt Template Handling**:
   - Gemma models (unlike Llama) do not support a native `role: "system"` message in the chat API.
   - System prompts must be manually concatenated with the user prompt (e.g., `[System instructions]\n\n[User prompt]`) before passing to the `sendMessage` function as a `user` role.

## Consequences

- **Positive**: Smaller model footprint, faster inference, and alignment with Google's modern browser AI stack (LiteRT/WebGPU).
- **Negative**: Increased complexity in build configuration (vendoring WASM, patching packages).
- **Neutral**: The engine initialization is heavy and requires careful UX handling to prevent perceived freezing.
