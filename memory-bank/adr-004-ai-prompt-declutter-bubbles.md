# ADR 004: Local AI-Powered Prompt De-cluttering and Modular Parsing

## Status

Accepted

## Context

Users of Midjourney and similar text-to-image generators often craft long, complex prompts containing redundant parameters, unnecessary keywords, and cluttered structures. To refine their creative workflow:

1. **Interactive Segmentation**: The interface needs to split prompts into modular "bubbles" or segments, allowing users to toggle, pin, reorder, or edit individual tags instead of managing a single text block.
2. **De-cluttering and Token Grouping**: Traditional regex parsing is fragile and fails to group descriptive phrases or clean up overlapping visual concepts. A local LLM is needed to perform smart, semantic de-cluttering.
3. **Execution Constraints**: Standard Chrome Extension Side Panels must remain highly responsive and avoid blocking the main UI thread during heavy inference tasks. Also, lint rules specify strict limits: file sizes (< 300 lines) and function lengths (< 50 lines).

## Decision

We decide to implement a local AI-powered prompt de-cluttering and segmentation system using Gemma-2 2B via WebLLM inside the Chrome Offscreen Document, structured around custom React hooks and subcomponents.

### 1. Offscreen WebLLM Messaging

- **Asynchronous Prompt Optimization**: The AI de-cluttering request is passed to the existing offscreen WebLLM worker via message passing.
- **Resilient Fallback**: If WebLLM fails to initialize, lacks storage space, or fails during inference, the system falls back to a regex-based parser, ensuring continuous editor availability.

### 2. State and Logic Modularization

To comply with the project's strict line/function limits:

- **`useAiPromptDeclutter` Hook**: Manages the WebLLM interface, model download progress, inference states (downloading, generating, idle), and execution error handling.
- **`usePromptBubbleEditorState` Hook**: Manages the prompt segment state machine (segment parsing, active/inactive toggles, custom tag addition, serialization to string, parameter alignment).
- **Subcomponent Division**: The `PromptBubbleEditor` component is split into focused components (`PromptBubbleGroup`, `PromptControls`) to keep each file under the 300-line constraint.

### 3. Localization and UX Feedback

- Provide multi-lingual support (English and Japanese translation catalogs) for model download progress, prompts, and actions.
- Provide step-by-step progress feedback (download progress %, loading states) when initiating the local LLM.

## Consequences

- **Modular and Extensible**: Decoupling LLM interaction from UI layout allows changing the underlying local LLM model without modifying editor components.
- **High Code Quality**: Adhering to the strict line-limit rules results in highly testable, modular hook files (`useAiPromptDeclutter.test.ts` and `PromptBubbleEditor.test.tsx`).
- **Resilient Editing Experience**: Standard prompt editing and manual tag creation remain fully functional even if WebLLM is disabled or unavailable.
