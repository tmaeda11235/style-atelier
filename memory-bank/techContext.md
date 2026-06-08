---
noteId: "c44bf950eeb511f0aa7a379a6036fa3e"
tags: []
---

# Tech Context

## Technology Stack

- **Framework**: [Plasmo](https://docs.plasmo.com/) (React + TypeScript) - Specialized for Chrome Extensions.
- **State Management**: Zustand for UI state; react-i18next & i18next for localization; `@tanstack/react-query` (with `@tanstack/react-query-persist-client` and `@tanstack/query-async-storage-persister`) for asynchronous database state and caching.
- **UI Components**: [Shadcn UI](https://ui.shadcn.com/) / [Tailwind CSS](https://tailwindcss.com/) - For modern, accessible styling.
- **Local Database**: [Dexie.js](https://dexie.org/) - Wrapper for IndexedDB, encapsulated using the Repository Pattern in `src/lib/db.ts` for clean separation of concerns.

## Key Libraries

- **Localization (i18n)**: `i18next` & `react-i18next` - Type-safe multi-language dictionaries (`en` / `ja`).
- **Image Processing**: Canvas API (Native) / [satori](https://github.com/vercel/satori) (for card layout generation).
- **Metadata/Exif**: `piexifjs` - For embedding/extracting JSON in images.
- **QR Codes**: `jsQR` - For scanning/generating QR codes on cards.
- **Search**: `FlexSearch.js` - High-performance client-side search.
- **NLP/Parser**: `compromise` / `ja-compromise` - For prompt analysis and tagging.

## Development Environment

- **Node.js**: LTS version recommended.
- **Package Manager**: pnpm (preferred) or npm.
- **Browser**: Google Chrome (Latest).

## Constraints

- **Manifest V3**: Strict security policies (no remote code execution).
- **Storage Limits**: IndexedDB limits vary by device, but generally sufficient for metadata + thumbnails. Full images should be external references or carefully cached.
- **LocalStorage Settings**: UI Settings (Easy Mode & Expert Features) and Language locale preference are persisted locally in `localStorage`. Historical user inputs for slot variables (`slotHistory`) have been migrated from `localStorage` to `IndexedDB` (v11 schema) to ensure consistent data transactions, prevent size limitation issues, and support auto-sync/backups. Tests can inject mocked states by editing `localStorage` or wrapping component render functions in `SettingsProvider` (using testing-library's `wrapper` option).

## Testing & CI

- **Unit Tests**: [Vitest](https://vitest.dev/) with JSDOM environment.
- **Coverage**: Measured via `@vitest/coverage-v8`. Thresholds are enforced to prevent regression:
  - Statements: 65%
  - Branches: 55%
  - Functions: 60%
  - Lines: 65%
- **CI Pipeline**: Automated via GitHub Actions (`.github/workflows/ci.yml`). ESLint (`npm run lint`) and Unit Tests with Coverage (`npm test -- --coverage`) are run on every pull request to ensure high quality and prevent code decay.
- **Linter Rule Testing**: A dedicated unit test `src/eslint-config.test.ts` validates that the ESLint configuration enforces the strict defaults, maintains specific whitelists for pre-existing files, and ensures that test files are properly exempted. This prevents configuration regressions that could weaken codebase constraints.
