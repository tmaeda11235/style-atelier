---
noteId: "c44bf950eeb511f0aa7a379a6036fa3e"
tags: []
---

# Tech Context

## Technology Stack

- **Framework**: [Plasmo](https://docs.plasmo.com/) (React + TypeScript) - Specialized for Chrome Extensions.
- **State Management**: Zustand for UI state; react-i18next & i18next for localization; `@tanstack/react-query` (with `@tanstack/react-query-persist-client` and `@tanstack/query-async-storage-persister`) for asynchronous database state and caching.
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) / [Tailwind CSS](https://tailwindcss.com/) - For modern, accessible styling.
- **Local Database**: [Dexie.js](https://dexie.org/) - Wrapper for IndexedDB, encapsulated using the Repository Pattern in `src/lib/db.ts` (modularized under `src/lib/db/`) for clean separation of concerns.

## Key Libraries

- **Localization (i18n)**: `i18next` & `react-i18next` for UI components - Type-safe multi-language dictionaries (`en` / `ja`). `eslint-plugin-i18next` is used as a devDependency to enforce static i18n checks. Additionally, Chrome extension store metadata (manifest name and description) is localized via Plasmo's native `_locales` directory support (`locales/ja/messages.json` and `locales/en/messages.json` at the project root).
- **Image Processing**: Canvas API (Native) / [satori](https://github.com/vercel/satori) (for card layout generation).
- **Metadata/Exif**: Custom PNG Chunk Parser (Native) - For embedding/extracting JSON payloads in PNG `tEXt` chunks with custom CRC32 integrity verification.
- **QR Codes**: `jsQR` - For scanning/generating QR codes on cards. Implements multi-stage canvas cropping and 2x scaling fallback for low-resolution/compressed images.
- **Search**: `FlexSearch.js` - High-performance client-side search.
- **NLP/Parser**: `compromise` / `ja-compromise` - For prompt analysis and tagging.
- **Local LLM**: `@mlc-ai/web-llm` (WebLLM) - For loading and executing the quantized Gemma-4 E2B model client-side using WebGPU/Wasm.
- **Compression**: `fflate` - High-performance, lightweight ZIP compression for Markdown exports.

## Development Environment

- **Node.js**: LTS version recommended.
- **Package Manager**: pnpm (preferred) or npm.
- **Browser**: Google Chrome (Latest).

## Constraints

- **Manifest V3**: Strict security policies (no remote code execution).
- **Storage Limits**: IndexedDB limits vary by device, but generally sufficient for metadata + thumbnails. Full images should be external references or carefully cached.
- **LocalStorage Settings**: UI Settings (Theme, Easy Mode & Expert Features) and Language locale preference are persisted locally in `localStorage`. Historical user inputs for slot variables (`slotHistory`) have been migrated from `localStorage` to `IndexedDB` (v11 schema) to ensure consistent data transactions, prevent size limitation issues, and support auto-sync/backups. Tests can inject mocked states by editing `localStorage` or wrapping component render functions in `SettingsProvider` (using testing-library's `wrapper` option).
- **Sync Window & Zombie Records**: A technical constraint exists for devices offline for more than 60 days. Once Tombstone records are purged after 60 days on active devices, a long-offline device reconnecting will re-upload its local undeleted copy, causing deleted records to resurrect ("zombie records"). To mitigate this, background auto-sync is suspended when the last sync time exceeds 60 days, and manual synchronization is guarded by a warning dialog (`GDriveSyncStrategyDialog`) that offers three strategies: Safe Merge, Local Overwrite, or Cloud Overwrite.
- **WebLLM & WebGPU Compatibility**: Running Gemma-4 E2B locally requires WebGPU support in the browser for optimal performance. While fallbacks (Wasm) exist, WebGPU is highly recommended to keep inference times practical.
- **Model Storage & Download Overhead**: The quantized Gemma-4 E2B model (~1GB) must be downloaded over the network on the first run and cached in the browser's Cache API or Origin Private File System (OPFS). The application must handle bandwidth limits, incomplete downloads, and local storage limits gracefully.
- **Worker Resource Constraints**: Web Workers executing heavy WebLLM operations are subject to Chrome's tab/extension throttling policies. If the extension side panel is closed or inactive, the worker context may be disposed. The extension state machine must handle worker lifecycles (initialization, execution, destruction) robustly.

## Testing & CI

- **Unit Tests**: [Vitest](https://vitest.dev/) with JSDOM environment.
- **Coverage**: Measured via `@vitest/coverage-v8`. Thresholds are enforced to prevent regression:
  - Statements: 80%
  - Branches: 70%
  - Functions: 75%
  - Lines: 80%
- **CI Pipeline**: Automated via GitHub Actions (`.github/workflows/ci.yml`). ESLint (`npm run lint`) and Unit Tests with Coverage (`npm test -- --coverage`) are run on every pull request to ensure high quality and prevent code decay.
- **Mutation Testing**: [StrykerJS](https://stryker-mutator.io/) is integrated (`npm run test:mutate`) to evaluate test suite robustness. To maintain high execution performance in local development and CI:
  - Scope is strictly limited to key side-effect-free business logic files (`src/lib/mj-parser.ts`, `src/lib/prompt-utils.ts`, `src/lib/nlp-utils.ts`, `src/lib/color-utils.ts`).
  - Incremental execution mode is enabled (`"incremental": true`), saving change states to `reports/stryker-incremental.json`.
  - Static mutants are ignored (`"ignoreStatic": true`) to eliminate dry-run/initialization overhead.
  - Concurrency is optimized (`"concurrency": 4`) to leverage multiple CPU cores without overloading memory.
- **Linter Rule Testing**: A dedicated unit test `src/eslint-config.test.ts` validates that the ESLint configuration enforces the strict defaults, maintains specific whitelists for pre-existing files, verifies that i18n literal rules (`eslint-plugin-i18next`) are enforced on fully-translated files, and ensures that test files are properly exempted. This prevents configuration regressions that could weaken codebase constraints.
