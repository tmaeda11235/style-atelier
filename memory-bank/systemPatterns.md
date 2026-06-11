---
noteId: "c4493a30eeb511f0aa7a379a6036fa3e"
tags: []
---

# System Patterns

## Architecture

**Layered & Local-First Strategy**

- **Platform**: Chrome Extension (Manifest V3).
- **Framework**: Plasmo.
- **Backend**: None (Serverless Architecture).
- **Local AI Engine**: Client-side execution of Gemma-4 E2B via WebLLM inside Web Workers.
- **Database**: Client-side IndexedDB (via Dexie.js).
- **Data Transport**: "Memento Pattern" via Image Files (QR Code / PNG tEXt Metadata fallback).

## Core Components

1.  **Side Panel ("The Factory")**: The main UI for managing cards, building decks, and mixing prompts.
2.  **Content Script**: Interacts with the Midjourney Web DOM to capture generated images and inject prompts.
3.  **Background Service Worker**: Handles browser events and coordination.
4.  **Offscreen Document ("The Engine Room")**: Hosts the WebLLM Worker to run GPU-accelerated model downloads and inference in a persistent background context.

## Key Technical Patterns

- **Tokenized Editor**: Treating prompt segments as draggable objects (Bubbles).
- **Bubble Slotting UI**: Breaking prompts into "Text" (Fixed) and "Slot" (Variable) components.
- **Mixing Table & Intelligent Weighted Blend**: Logic to merge multiple Style Cards (parents) into a new prompt generation or Workbench environment. When merging, it aggregates sref/cref URLs with their corresponding weights (calculated by multiplying the card weight with the parameter weight, summing up occurrences, and outputting with suffix weights e.g. `::weight`). It also propagates weights to prompt text segments.
- **Image-as-Database (PNG Metadata & QR Fallback)**: Using the exported image itself as a portable data container. During export, card data is injected as a compressed payload into a custom PNG `tEXt` metadata chunk. During import, the raw file is parsed directly via a custom CRC32 checker to retrieve the metadata, completely bypassing canvas rendering and QR scan overhead. If metadata is missing or stripped (e.g. converted or hosted on platforms that strip metadata), a canvas-based multi-stage QR scan fallback is executed (first full image, then cropped bottom-right corner, then 2x scaled crop).
- **Repository Pattern for IndexedDB**: Encapsulating Dexie database query and transaction logic within `StyleAtelierDatabase` (`src/lib/db.ts`) to avoid query duplication, ensure data consistency across multiple tables, and simplify unit testing. Heavy transactions (backup import, card merging) are modularized under `src/lib/db/` to comply with file/function size constraints.
- **Database Schema Migration**: Schema versions handle migrations. v11 introduced `slotHistory` as a dedicated object store for slot history. v12 introduced hierarchical folder management by adding a `parentId` field (defaulting to `null`) to the `categories` table.
- **Local-First Sync & Tombstone Lifecycle**:
  - **Tombstone (Soft Delete)**: When a style card or category is deleted, it is soft-deleted by setting `isDeleted: true` and updating `updatedAt` to the current timestamp. This tombstone record is retained in the database.
  - **Deletion Propagation**: During synchronization with Google Drive (auto-sync or manual backup), these tombstone records are bundled in the backup payload. Other devices download the backup and merge changes using the LWW (Last-Write-Wins) merge logic, which propagates the deletion by marking local copies as deleted.
  - **Sync Window (60 Days)**: Tombstones are physically purged from the database after 60 days to prevent indefinite database growth.
  - **Zombie Record Risk**: If a device is offline for more than 60 days, the tombstone records indicating deletion may have already been purged on other active devices and from the cloud backup. When this offline device reconnects and syncs, it will treat its local copy (which lacks the tombstone) as active/new data and re-upload it, causing deleted items to reappear ("zombie records").
- **Modular Utility & Data Access Layers**: To strictly adhere to the 300-line file limit and 50-line function limit:
  - `backup-validator.ts` is divided into a `src/lib/backup-validator/` subdirectory, splitting domain schema validations into clean, focused sub-modules.
  - `google-drive.ts` is modularized into `src/lib/google-drive/` (auth, http-client, upload/download operations), with asynchronous XMLHttpRequests and progress trackers split into functions under 50 lines.
  - `export-utils.ts` is modularized into `src/lib/export/`, dividing the card rendering canvas pipeline (`renderCardToCanvas`) into separate background, artwork layout, info text, and QR drawing steps.
  - `card-export.ts` (`src/lib/card-export.ts`) encapsulates export data structuring for CSV and Markdown ZIP (via `fflate`), separated from the React hook layer (`useCardExport.ts`) to comply with strict function size limits.
  - `color-utils.ts` (`src/lib/color-utils.ts`) is refactored by splitting pure color conversion utilities into a new `src/lib/color-converter.ts` and delegating canvas/analysis sub-routines to satisfy the 300-line file limit and 50-line function limit.
  - `db-setup.ts` (`src/lib/db-setup.ts`) has its constructor version setup logic extracted to `initializeVersions` (split into submethods to fit under 50 lines) and schema upgrade migrations modularized to keep the class definition lightweight.

- **Feature Flags & Context Patterns**:
  - `SettingsContext` (`useSettings`): Manages theme ("system" | "light" | "dark"), "Easy Mode" state (hides all tabs except Library) and `expertFeatures` toggles (`stack`, `slot`, `rarity`, `tags`, `categories`, `multiCard`, `cardEditing`, `multiImage`). To ensure responsive design (down to 320px) and clean visual hierarchy, long text descriptions and toggles in Settings Tab utilize `HelpTooltip` elements next to headers instead of occupying vertical list space.
  - `LanguageContext` (`useLanguage`): Manages the active translation locale (English/Japanese, stored in `localStorage` under `style-atelier-language`) and exposes a compile-time typed dictionary (`t`) to components.
  - Components subscribe to these contexts to handle feature toggling and language localization dynamically.
- **Asynchronous State & Caching**:
  - React Query (`@tanstack/react-query`) is configured with `chrome.storage.local` persistence (via `chromeAsyncStorage` and `@tanstack/query-async-storage-persister`).
  - Decouples IndexedDB query logic and remote synchronization from component lifecycle, providing automatic caching, cache invalidation, and a seamless fallback to `window.localStorage` when Chrome extension APIs are unavailable.
- **State Management Separation of Concerns**:
  - **UI Synchronous State (Local/Global UI)**: **Zustand** is used for synchronous UI state (e.g., active tabs, drag-and-drop actions, modal states) shared across components.
  - **DB Reactive State (Local Persistent Data)**: **Dexie (`useLiveQuery`)** acts as the Single Source of Truth (SSOT) for IndexedDB collections (e.g., style cards, categories, slot history). To prevent cache inconsistency, React Query must NOT be used to cache or query local IndexedDB data. Real-time updates from background syncing must propagate to the UI via `useLiveQuery`.
  - **Asynchronous & Remote Cache (Network/Async Boundary)**: **React Query** handles network-bound or heavy asynchronous processes (e.g., Google Drive metadata queries, token authorization, uploading/downloading backup files).
- **Data Access Layer Boundaries**:
  - UI components in `src/components/` must not import `src/lib/db.ts` or execute direct database queries.
  - Query functions (`queryFn`) and mutations (`mutationFn`) must execute operations through the data access layer (encapsulated under `src/lib/`).
  - Components access data exclusively via custom React hooks (`src/hooks/`) or state stores, avoiding direct dependencies on database instances or external API clients.
- **Library Search & Performance Optimization**:
  - Utilizes `FlexSearch` client-side indexer to enable high-performance, real-time filtering across name, tags, and categories.
  - Implements memory-friendly client-side pagination ("Load More" pattern) in `useLibrary` to limit active DOM node counts in the style grid, preventing rendering-based UI freeze.
  - Implements visual scroll affordance for horizontal color filters using CSS `mask-image` linear-gradients (for smooth edge-fade indications) coupled with dynamic scroll arrow overlays.
  - Implements a collapsible accordion UI (`LibraryFilterAccordion`) for advanced filters (rarity, category, color, sorting) to maximize screen space while keeping code modularized under 50-line function limits.
  - Decouples Folder Explorer (`FolderExplorer.tsx`) and Card Items (`LibraryCardItem.tsx`) from `LibraryTab.tsx` to meet the 300-line file limit. The Folder Explorer splits breadcrumbs and subfolder grid into subcomponents (`Breadcrumbs`, `SubfolderGrid`, `SubfolderItem`) and Card Items use isolated thumbnail layout (`LibraryCardThumbnail`) to satisfy the 50-line function limit.
  - Implements Natural Language Semantic Filtering (`useAiSearch` and `useDebouncedSemanticSearch` hooks) that uses local WebLLM Gemma model to parse user's query into structured database filters (rarity, category, color, keyword). The implementation is fully modularized by extracting components (`CardsGrid.tsx`, `EmptyState.tsx`, `ExtractedFiltersDisplay.tsx`, `AiWarningModal.tsx`) to comply with strict ESLint line count rules.
- **Tutorial Spotlight & Position Synchronization**:
  - Tutorial spotlight positioning, window resize/scroll event listeners, click-blocking logic, and database mock insertions are fully encapsulated in the `useSpotlight` custom hook (`src/hooks/useSpotlight.ts`).
  - Decouples DOM calculations and window event handlers from the `InteractiveTutorial` overlay component (`src/components/organisms/InteractiveTutorial.tsx`), maintaining clean separation of concerns and keeping component file size well within constraints (under 300 lines).
- **Chrome Extension API & Prompt Injection Decoupling**:
  - Chrome extension connection monitoring (ping/retry) and prompt injection logic (sending to Midjourney tab, updating usage stats, slot value persistence) are fully decoupled from `Workbench.tsx` and encapsulated into reusable hooks `useChromeTabConnection.ts` and `usePromptInjector.ts`.
  - The Workbench UI and form layouts are modularized into focused components (`WorkbenchView.tsx`, `Cauldron.tsx`, `RecipeEditor.tsx`, `RecipeForm.tsx`) and hooks (`useWorkbenchCore`), keeping each component file size under the 300-line limit and functions under the 50-line limit, and enabling straightforward unit testing without mocking heavy layout structures.
- **Tombstone (Soft Delete) & Physical Purge Lifecycle**:
  - When cards or categories are deleted, they are soft-deleted (`isDeleted: true` and `updatedAt` set to current time) to act as "Tombstones" that propagate deletion states to other devices during Google Drive synchronization.
  - To prevent infinite database growth, a physical purge operation (`purgeDeletedRecords`) deletes records older than 60 days (the Sync Window) from IndexedDB.
  - This purge is triggered asynchronously at startup (non-blocking) and before any Google Drive manual/auto synchronization starts.
  - **Sync Window Limitation & Mitigation**: If a device remains offline for more than 60 days and attempts to sync after other devices have already purged those tombstones, deleted records may resurrect ("zombie records"). To mitigate this risk:
    - **Auto-Sync Suspension**: Background auto-sync is suspended when the last sync time exceeds 60 days, requiring the user to initiate a manual sync.
    - **GDriveSyncStrategyDialog**: Before manual synchronization starts, a warning dialog is displayed to the user offering three merge options:
      - _Safe Merge_: Performs normal LWW merge while warning the user of potential zombie resurrection.
      - _Local Overwrite_: Discards local changes and pulls clean data from the cloud backup (fully preventing resurrection).
      - _Cloud Overwrite_: Replaces the cloud backup with the current local state.
- **Local AI Inference Pattern (WebLLM, Offscreen & Cache Resilience)**:
  - **Offscreen Orchestration**: WebLLM runs inside a Web Worker hosted in an Offscreen Document rather than the Side Panel. This prevents execution contexts from suddenly terminating when the Side Panel is closed, ensuring long-running downloads and token generations finish safely.
  - **Pre-download Quota Check**: Evaluates storage using `navigator.storage.estimate()` before downloading the model, preventing failures from `QuotaExceededError`.
  - **Cache Integrity Guardrails**: Validates cached files in OPFS or Cache Storage. If corruption or incomplete downloads are detected, it automatically purges and restarts the download.
  - **Non-blocking Execution**: The model is executed off the main thread, communicating with the Side Panel and Background Service Worker via Chrome extension runtime messaging.
  - **Lightweight Model Optimization**: Since Gemma-4 E2B is a <1GB model, it has limited complex reasoning capability. The system handles this via structured prompt templates (Few-shot prompting) and RAG (retrieving relevant style keywords or historical combinations from IndexedDB) before running inference.
  - **Zero-cost, High-frequency Orchestration**: Because client-side execution incurs zero API costs, the agent can trigger background tasks (e.g., parsing, tagging, style synthesis, user action predictions) frequently without budgeting concerns.

## Data Flow

1.  **Capture**: User generates image on Midjourney -> Content Script detects -> User drags to Side Panel.
2.  **Minting**: Image + Prompt Metadata saved to IndexedDB as "Style Card".
3.  **Usage**: User selects Card from Side Panel -> Content Script injects prompt into Midjourney input.
4.  **Export**: Card data encoded into image (QR/Metadata) for sharing.
5.  **Local AI Inference**: User requests prompt analysis/tagging -> Side Panel / Background requests Offscreen Document -> Offscreen Document communicates with WebLLM Worker -> Worker runs inference via WebLLM (Gemma-4 E2B) -> Results updated in state stores / database.

## Component Development Rules (Sustainability)

1. **Atomic Isolation**: New UI elements must be evaluated for decomposition into Atoms/Molecules before creating an Organism.
2. **Document First**: Every component must have a JSDoc block explaining its purpose and props. This helps AI agents and developers understand the intended use case.
3. **Pure Atoms**: Atoms must not depend on external hooks or global state (use props instead). They should be highly reusable and testable in isolation.
4. **Consistency**: Reuse existing Atoms/Molecules to maintain UI consistency and reduce technical debt.
5. **No Logic in Molecules**: Molecules should focus on UI structure and composition. Business logic or heavy state management should be handled in Organisms or Custom Hooks.

## Project Structure

To ensure maintainability and scalability, the project follows a strict directory structure:

- `assets/`: Static assets (icons, images) - Must be in root for Plasmo.
- `src/`: Root directory for all source code.
  - `src/components/`: Reusable React components. Following Atomic Design principles:
    - `atoms/`: Basic UI elements (Button, Input, Badge). No business logic.
    - `molecules/`: Groups of atoms. Context-specific but low logic.
    - `organisms/`: Complex functional blocks. Connected to Hooks.
    - `templates/`: Page layouts.
  - `src/lib/`: Shared utilities, database logic, and types.
  - `src/styles/`: Global styles (CSS, Tailwind directives).
  - `src/background.ts`: Extension background script.
  - `src/sidepanel.tsx`: Main entry point for the side panel UI.
  - `src/content.ts`: Content scripts (if applicable).

## Semantic Design Tokens & Dark Mode Theme Management:

- CSS variables (e.g., `--color-surface`, `--color-text-primary`, `--color-border-primary`, `--color-muted`) are defined under `:root` and `.dark` blocks in `src/style.css`.
- Registered in Tailwind CSS v4 `@theme` block, mapping them to Tailwind utility classes (e.g., `bg-surface`, `text-text-primary`, `border-border-primary`, `bg-muted`).
- Allows components to dynamically adapt to Light/Dark themes without hardcoded `dark:` prefixes, standardizing color hierarchies and reducing visual debt.

## AI-Driven Development & Layer Boundaries

To maintain clean architecture and prevent technical debt, the following strict boundaries are enforced:

1. **No Direct Database Queries in UI Components**:
   - React components in `src/components/` must not import `src/lib/db.ts` or make direct queries to the database.
   - All database interactions must be encapsulated within custom hooks (in `src/hooks/`) or services, utilizing Zustand state or React Query for asynchronous state.
2. **Pure Test Mocks**:
   - Mock databases and utility mocks (e.g., in `tests/mocks/`) must remain pure mocks and not contain business logic.
   - Test expectations should verify interactions with the mock rather than replicating real database logic or state transitions inside the mock.
3. **File Length Limits**:
   - Component files should not exceed 300 lines of code (excluding comments and blank lines).
   - Functions should be kept under 50 lines.
   - Files exceeding these limits should be refactored by extracting state, hooks, or sub-components.
4. **Automated Enforcement via ESLint**:
   - `eslint.config.mjs` strictly enforces rules as `error` by default (including `max-lines: 300`, `max-lines-per-function: 50`, `sonarjs/cognitive-complexity: 15`, and `boundaries/dependencies` prohibiting direct DB imports from components).
   - A whitelist of pre-existing violating files is explicitly maintained in the `eslint.config.mjs` overrides, treating them as `warn` only. Any new files are fully subject to errors.
   - Progressive localization (i18n) checks are enforced via `eslint-plugin-i18next`'s `no-literal-string` rule, targeting fully-translated files (e.g. `DeleteConfirmModal.tsx`, `HistoryTab.tsx`) to prevent future raw text/translation leaks.
   - The helper script `scratch/auto-sync-eslint.js` dynamically compiles and synchronizes these whitelists. As developers refactor legacy files, executing this script automatically removes them from exceptions, permanently locking in the strict rules.
