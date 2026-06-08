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
- **Database**: Client-side IndexedDB (via Dexie.js).
- **Data Transport**: "Memento Pattern" via Image Files (QR Code / Metadata).

## Core Components

1.  **Side Panel ("The Factory")**: The main UI for managing cards, building decks, and mixing prompts.
2.  **Content Script**: Interacts with the Midjourney Web DOM to capture generated images and inject prompts.
3.  **Background Service Worker**: Handles browser events and coordination.

## Key Technical Patterns

- **Tokenized Editor**: Treating prompt segments as draggable objects (Bubbles).
- **Bubble Slotting UI**: Breaking prompts into "Text" (Fixed) and "Slot" (Variable) components.
- **Mixing Table**: Logic to merge two Style Cards (parents) into a new prompt generation.
- **Image-as-Database**: Using the generated image itself as the portable data container (Steganography/Metadata).
- **Repository Pattern for IndexedDB**: Encapsulating Dexie database query and transaction logic within `StyleAtelierDatabase` (`src/lib/db.ts`) to avoid query duplication, ensure data consistency across multiple tables, and simplify unit testing by flattening mock structures.
- **Database Schema Migration**: Schema versions handle migrations, with v11 introducing `slotHistory` as a dedicated object store to hold previous inputs for slots.
- **Feature Flags & Context Patterns**:
  - `SettingsContext` (`useSettings`): Manages "Easy Mode" state (hides all tabs except Library) and `expertFeatures` toggles (`stack`, `slot`, `rarity`, `tags`, `categories`, `multiCard`, `cardEditing`, `multiImage`).
  - `LanguageContext` (`useLanguage`): Manages the active translation locale (English/Japanese, stored in `localStorage` under `style-atelier-language`) and exposes a compile-time typed dictionary (`t`) to components.
  - Components subscribe to these contexts to handle feature toggling and language localization dynamically.
- **Asynchronous State & Caching**:
  - React Query (`@tanstack/react-query`) is configured with `chrome.storage.local` persistence (via `chromeAsyncStorage` and `@tanstack/query-async-storage-persister`).
  - Decouples IndexedDB query logic and remote synchronization from component lifecycle, providing automatic caching, cache invalidation, and a seamless fallback to `window.localStorage` when Chrome extension APIs are unavailable.
- **Tutorial Spotlight & Position Synchronization**:
  - Tutorial spotlight positioning, window resize/scroll event listeners, click-blocking logic, and database mock insertions are fully encapsulated in the `useSpotlight` custom hook (`src/hooks/useSpotlight.ts`).
  - Decouples DOM calculations and window event handlers from the `InteractiveTutorial` overlay component (`src/components/organisms/InteractiveTutorial.tsx`), maintaining clean separation of concerns and keeping component file size well within constraints (under 300 lines).
- **Chrome Extension API & Prompt Injection Decoupling**:
  - Chrome extension connection monitoring (ping/retry) and prompt injection logic (sending to Midjourney tab, updating usage stats, slot value persistence) are fully decoupled from `Workbench.tsx` and encapsulated into reusable hooks `useChromeTabConnection.ts` and `usePromptInjector.ts`.
  - This keeps the UI component clean, focused on rendering (under 300 lines limit), and enables straightforward unit testing without mocking heavy layout structures.

## Data Flow

1.  **Capture**: User generates image on Midjourney -> Content Script detects -> User drags to Side Panel.
2.  **Minting**: Image + Prompt Metadata saved to IndexedDB as "Style Card".
3.  **Usage**: User selects Card from Side Panel -> Content Script injects prompt into Midjourney input.
4.  **Export**: Card data encoded into image (QR/Metadata) for sharing.

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
