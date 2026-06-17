---
name: sandbox-mcp-debugging
description: >-
  Runs the local E2E test sandbox server and interacts with it using the
  chrome-devtools-mcp server to perform manual or automated debugging.
---

# Sandbox MCP Debugging

## Overview

This skill provides instructions on how to start the local E2E sandbox server and connect/interact with it using the Chrome DevTools MCP server (`chrome-devtools-mcp`) and other agent tools for layout and interaction debugging. It includes specialized procedures for Mobile PWA (Progressive Web App) testing, Service Worker registration, and offline capability verification.

## Direct Agent Tools Used

- `run_command`: To run the Vite sandbox server or test scripts.
- `call_mcp_tool`: To invoke Chrome DevTools MCP tools (`new_page`, `navigate_page`, `evaluate_script`, `take_screenshot`, `take_snapshot`, `list_console_messages`, `click`, `drag`, etc.) on the target browser context.

## Workflow

### 1. Preparation

Ensure the E2E mock assets are processed and updated. Use the `run_command` tool:

```bash
node tests/scripts/prepare-mock.js
```

### 2. Start the Sandbox Server

Start the Vite dev server with network hosting (so the DevTools browser context can resolve it) using `run_command`.

- **Desktop/Extension Sandbox**:
  ```bash
  npx vite --config tests/sandbox/vite.config.ts --port 5173 --host
  ```
- **Mobile PWA Sandbox**:
  ```bash
  npm run dev:mobile
  ```
  If port `5173` is already in use (port conflict), search for another available port (e.g. `5174`, `5175`, etc.) by trying them sequentially or checking free ports, and bind Vite to that port:

```bash
npx vite --config tests/sandbox/vite.config.ts --port <AVAILABLE_PORT> --host
```

Check the command output or logs to confirm the bound network address (e.g., `http://192.168.3.24:5173/`).

### 3. Open the Sandbox in DevTools Browser

1. Invoke the `call_mcp_tool` tool with `chrome-devtools-mcp/new_page` or `chrome-devtools-mcp/navigate_page` to open the sandbox URL:
   - **Base URL**: `http://<LAN_IP>:<PORT>/tests/sandbox/index.html`
   - **Variant Query**: Append `?variant=<mock_html_filename>` to target a specific mock HTML variation in the fixture directory.
     - Example: `http://192.168.3.24:5173/tests/sandbox/index.html?variant=pattern2.html`
   - **Mobile PWA Mode**: To debug the Mobile PWA, start the mobile server and navigate to `http://<LAN_IP>:<PORT>/style-atelier/index.html`.
2. If the browser displays a connection error or blank screen:
   - Do not use `localhost`. Resolve the host machine's local IP address (e.g. run `ipconfig` via `run_command` to find the IPv4 address) and use that instead.

### 4. Mobile PWA & Service Worker Testing

When debugging mobile-specific features and PWA capabilities:

- **Mobile Emulation**: Use Playwright's mobile configuration (`isMobile: true`, viewport scaling, touch support enabled) to simulate iOS Safari or Android Chrome. Ensure safe areas (like notch constraints) and touch targets (minimum 44x44px) are checked.
- **Service Worker Lifecycle & Cache Verification**:
  1. **Registration**: Verify that `sw.js` registers under the correct scope (e.g. `/style-atelier/` when on GitHub Pages).
  2. **Offline Simulation**: Trigger offline mode via Playwright's network offline mode, or emulate network conditions to disable the connection, then reload the page to ensure the application shell loads successfully from cache.
  3. **Auto-Update & Immediate Takeover**: Verify that a new Service Worker takes control immediately (`skipWaiting`, `clientsClaim`) without leaving the app in a broken half-updated state.
- **OPFS Image Cache Inspection**: Run `evaluate_script` to check that local image blobs are correctly saved to the Origin Private File System (OPFS) and loaded properly under offline conditions.

### 5. Debug & Verify

Use `call_mcp_tool` to interact with and inspect the sandbox:

- **Inspect DOM**: Call `chrome-devtools-mcp/take_snapshot` to fetch the current element structure.
- **Interact**: Call `chrome-devtools-mcp/click`, `chrome-devtools-mcp/fill`, or `chrome-devtools-mcp/drag` to simulate user actions (e.g., dragging items).
- **Evaluate JS**: Call `chrome-devtools-mcp/evaluate_script` to check global state, inspect inside iframes, or dispatch custom mock events.
- **Logs**: Call `chrome-devtools-mcp/list_console_messages` to check for runtime errors.

### 6. Final Validation

Verify that the E2E tests pass after making any fixes:

```bash
npm run test:e2e
```
