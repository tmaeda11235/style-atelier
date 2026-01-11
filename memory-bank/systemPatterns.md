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