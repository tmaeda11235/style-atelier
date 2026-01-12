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

## Data Flow
1.  **Capture**: User generates image on Midjourney -> Content Script detects -> User drags to Side Panel.
2.  **Minting**: Image + Prompt Metadata saved to IndexedDB as "Style Card".
3.  **Usage**: User selects Card from Side Panel -> Content Script injects prompt into Midjourney input.
4.  **Export**: Card data encoded into image (QR/Metadata) for sharing.

## Component Development Rules (Sustainability)
1. **Atomic Isolation**: New UI elements must be evaluated for decomposition into Atoms/Molecules before creating an Organism.
2. **Document First**: Every component must have a JSDoc block explaining its purpose and props.
3. **Pure Atoms**: Atoms must not depend on external hooks or global state (use props instead).
4. **Consistency**: Reuse existing Atoms/Molecules to maintain UI consistency and reduce technical debt.

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