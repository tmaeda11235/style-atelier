---
noteId: "c44bf950eeb511f0aa7a379a6036fa3e"
tags: []
---

# Tech Context

## Technology Stack

- **Framework**: [Plasmo](https://docs.plasmo.com/) (React + TypeScript) - Specialized for Chrome Extensions.
- **State Management**: Zustand for UI state; react-i18next & i18next for localization; `@tanstack/react-query` (with `@tanstack/react-query-persist-client` and `@tanstack/query-async-storage-persister`) for asynchronous database state and caching.
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) / [Tailwind CSS](https://tailwindcss.com/) (v4) - For modern, accessible styling. Integrated with Semantic Design Tokens (e.g., `bg-surface`, `text-text-primary`, `border-border-primary`, `bg-muted`) mapped to CSS variables for dynamic, standard-compliant Dark Mode styling.
- **Local Database**: [Dexie.js](https://dexie.org/) - Wrapper for IndexedDB, encapsulated using the Repository Pattern in `src/lib/db.ts` (modularized under `src/lib/db/`) for clean separation of concerns.

## Key Libraries

- **Localization (i18n)**: `i18next` & `react-i18next` for UI components - Type-safe multi-language dictionaries (`en` / `ja`). `eslint-plugin-i18next` is used as a devDependency to enforce static i18n checks. Additionally, Chrome extension store metadata (manifest name and description) is localized via Plasmo's native `_locales` directory support (`locales/ja/messages.json` and `locales/en/messages.json` at the project root).
- **Image Processing**: Canvas API (Native) / [satori](https://github.com/vercel/satori) (for card layout generation).
- **Metadata/Exif**: Custom PNG Chunk Parser (Native) - For embedding/extracting JSON payloads in PNG `tEXt` chunks with custom CRC32 integrity verification.
- **QR Codes**: `jsQR` - For scanning/generating QR codes on cards. Implements multi-stage canvas cropping and 2x scaling fallback for low-resolution/compressed images.
- **Search**: `FlexSearch.js` - High-performance client-side search.
- **NLP/Parser**: `compromise` / `ja-compromise` - For prompt analysis and tagging.
- **Local LLM**: `@litert-lm/core` (LiteRT-LM) - For loading and executing the quantized Gemma-4 E2B model client-side using WebGPU/Wasm. Currently used to parse natural language search queries into structured filters (rarity, category, color, keyword).
- **Compression**: `fflate` - High-performance, lightweight ZIP compression for Markdown exports.

## Development Environment

- **Node.js**: v20.12.0 or higher recommended (enforced via `.npmrc` and `.nvmrc`).
- **Package Manager**: pnpm (preferred) or npm.
- **Browser**: Google Chrome (Latest).

## Constraints

- **Manifest V3**: Strict security policies (no remote code execution).
- **ESLint & Code Style Constraints**: Strict limits are enforced to maintain component readability: components must be under 300 lines (excluding blank lines/comments) and functions must be under 50 lines. Refactor complex components into smaller sub-components/hooks when limits are exceeded.
- **Storage Limits**: IndexedDB limits vary by device, but generally sufficient for metadata + thumbnails. Full images should be external references or carefully cached.
- **LocalStorage Settings**: UI Settings (Theme, Easy Mode & Expert Features) and Language locale preference are persisted locally in `localStorage`. Historical user inputs for slot variables (`slotHistory`) have been migrated from `localStorage` to `IndexedDB` (v11 schema) to ensure consistent data transactions, prevent size limitation issues, and support auto-sync/backups. Tests can inject mocked states by editing `localStorage` or wrapping component render functions in `SettingsProvider` (using testing-library's `wrapper` option).
- **Sync Window & Zombie Records**: A technical constraint exists for devices offline for more than 60 days. Once Tombstone records are purged after 60 days on active devices, a long-offline device reconnecting will re-upload its local undeleted copy, causing deleted records to resurrect ("zombie records"). To mitigate this, background auto-sync is suspended when the last sync time exceeds 60 days, and manual synchronization is guarded by a warning dialog (`GDriveSyncStrategyDialog`) that offers three strategies: Safe Merge, Local Overwrite, or Cloud Overwrite.
- **LiteRT-LM & WebGPU Compatibility**: Running Gemma-4 E2B locally requires WebGPU support in the browser for optimal performance. While fallbacks (Wasm) exist, WebGPU is highly recommended to keep inference times practical.
- **Model Storage & Download Overhead (Quota & Integrity)**: The quantized Gemma-4 E2B model (~1GB) must be downloaded over the network on the first run and cached in the browser's Cache API or Origin Private File System (OPFS). The application must perform a pre-download storage check using `navigator.storage.estimate()` (requiring at least 1.5 GB free space) to avoid `QuotaExceededError`. It must also execute cache integrity validations at startup/load to detect and purge incomplete or corrupted cache files.
- **Offscreen Execution & Worker Lifecycles**: Web Workers executing LiteRT-LM operations are hosted within a Chrome Offscreen Document rather than the Side Panel. This mitigates tab/extension throttling and sudden context disposal when the Side Panel is closed, providing a persistent background context for long-running download or inference processes. The Background Service Worker orchestrates the creation and destruction of the Offscreen Document dynamically.

## Testing & CI

- **Unit Tests**: [Vitest](https://vitest.dev/) with JSDOM environment. Test files are relocated to the `tests/unit/` directory to cleanly separate tests from source code, and Vitest is configured to run tests from this directory.
- **Coverage**: Measured via `@vitest/coverage-v8`. Thresholds are enforced to prevent regression:
  - Statements: 80%
  - Branches: 70%
  - Functions: 75%
  - Lines: 80%
- **CI Pipeline**: Automated via GitHub Actions (`.github/workflows/ci.yml`). ESLint (`npm run lint`), ESLint whitelist growth verification (`scratch/check-eslint-whitelist.js`), and Unit Tests with Coverage (`npm test -- --coverage`) are run on every pull request to ensure high quality and prevent code decay.
- **Mutation Testing**: [StrykerJS](https://stryker-mutator.io/) is integrated (`npm run test:mutate`) to evaluate test suite robustness. To maintain high execution performance in local development and CI:
  - Scope is strictly limited to key side-effect-free business logic files (`src/lib/mj-parser.ts`, `src/lib/prompt-utils.ts`, `src/lib/nlp-utils.ts`, `src/lib/color-utils.ts`).
  - Incremental execution mode is enabled (`"incremental": true`), saving change states to `reports/stryker-incremental.json`.
  - Static mutants are ignored (`"ignoreStatic": true`) to eliminate dry-run/initialization overhead.
  - Concurrency is optimized (`"concurrency": 4`) to leverage multiple CPU cores without overloading memory.
- **E2E Tests**: [Playwright](https://playwright.dev/) is used for End-to-End browser-level testing (configured in [playwright.config.ts](file:///c:/Users/oculus/Desktop/style-atelier/playwright.config.ts)). To achieve fast execution, fully parallel testing (`fullyParallel: true`) is enabled. To prevent state/storage collisions (IndexedDB, LocalStorage, etc.) during parallel execution, the custom extension fixture (`tests/fixtures/extension-fixture.ts`) creates and cleans up a unique temporary user data directory for each test/worker. Screenshots are captured to verify UX changes across English and Japanese locales. Additionally, element overlap and obscuration checks (using `document.elementFromPoint` to assert unobstructed element centers) are implemented in [overlap-detection.spec.ts](file:///c:/Users/oculus/Desktop/style-atelier/tests/e2e/overlap-detection.spec.ts) to safeguard core interactive paths.
- **Linter Rule Testing**: A dedicated unit test `tests/unit/eslint-config.test.ts` validates that the ESLint configuration enforces the strict defaults, maintains specific whitelists for pre-existing files, verifies that i18n literal rules (`eslint-plugin-i18next`) are enforced on fully-translated files, and ensures that test files are properly exempted. This prevents configuration regressions that could weaken codebase constraints.
