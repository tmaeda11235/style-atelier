# Mobile App Deployment on GitHub Pages

This document outlines the deployment configuration, build process, and security considerations for hosting the Style Atelier Mobile App on GitHub Pages.

---

## 1. Overview

The mobile-app page (`src/mobile-app`) is a standalone mobile web application designed to preview generated Style Cards. To make it publicly accessible, it is built with **Vite** and deployed automatically to **GitHub Pages** via GitHub Actions.

- **Production URL:** `https://tmaeda11235.github.io/style-atelier/`

---

## 2. Build & Configuration

Because GitHub Pages serves assets from a subdirectory (`/style-atelier/`), we use a dedicated Vite configuration to compile the application with correct asset paths.

### Vite Config: [vite.config.mobile.ts](file:///vite.config.mobile.ts)

The custom configuration sets `base` to `/style-atelier/` and builds using `src/mobile-app/index.html` as the entry point:

- **Base Path:** `/style-atelier/`
- **Output Directory:** `dist-mobile`

### PWA Build & Service Worker Settings

To transform the mobile page into a fully functional Standalone PWA, we integrate **vite-plugin-pwa** in the mobile build pipeline (`vite.config.mobile.ts`).

#### 1. Service Worker Registration & Lifecycle

- **Registration Type:** `registerType: 'autoUpdate'` (or `'prompt'` to alert users of updates).
- **Injection Mode:** `injectRegister: 'inline'` to embed the register script directly in the entry HTML, avoiding dynamic script import issues on older mobile browsers.
- **Immediate Takeover:** Configured with `skipWaiting: true` and `clientsClaim: true` in Workbox configuration. This ensures that when a new Service Worker is deployed, it immediately controls all open clients rather than waiting for the page to be reloaded.

#### 2. Service Worker Scope & Paths on GitHub Pages

Because the application is hosted on GitHub Pages under a subpath (`/style-atelier/`), we strictly configure:

- **Base Path:** `/style-atelier/`
- **SW Scope:** `/style-atelier/`
- **SW Filename:** `sw.js` (generated at the root of the output directory `dist-mobile`).

> [!WARNING]
> If the `scope` is misconfigured or defaults to `/`, the Service Worker will fail to register or cache files from the subdirectory, breaking offline capabilities.

#### 3. Cache & Pre-caching Strategy (Workbox)

- **Pre-cached Assets:** All production compilation bundles (`.js`, `.css`), entry HTML, local icons, and manifest.json.
- **Stale-While-Revalidate (SWR):** For external assets such as fonts, i18n localization JSONs, and external CSS frameworks.
- **Cache Busting Strategy:** Vite dynamically attaches content-based hashes to all compiled asset filenames (e.g., `index-[hash].js`). This forces the browser/Service Worker to bypass old caches when a new build is deployed, eliminating stale UI presentation.
- **Image Offline Storage:** For large user-generated images (Style Cards), instead of bloating the Cache API, the PWA uses the **Origin Private File System (OPFS)** via `useOpfsImage.ts` to persistently store binary image blobs client-side.

### Scripts Added in [package.json](file:///package.json)

- `npm run build:mobile`: Compiles the mobile app to `dist-mobile` for production deployment.
- `npm run dev:mobile`: Runs a local development server targeting the mobile app structure.

---

## 3. CI/CD Deployment Pipeline

The workflow file [.github/workflows/deploy-pages.yml](file:///.github/workflows/deploy-pages.yml) automates the deployment process on push to `main`.

### Workflow Flow:

1. **Trigger:** Triggers automatically on any push to the `main` branch, or manually via `workflow_dispatch`.
2. **Environment & Permissions:** Utilizes GHA permissions (`pages: write`, `id-token: write`) to securely request deployment tokens.
3. **Build:** Runs `npm ci --legacy-peer-deps` and `npm run build:mobile` to compile production assets.
4. **Deploy:** Uploads `dist-mobile` as a Pages artifact and deploys it to the GitHub Pages environment.

---

## 4. Google Drive OAuth2 & Security Considerations

If Google Drive integration is introduced to the mobile preview page (e.g., syncing cards to `appDataFolder`), the following security and CORS actions must be addressed:

### A. Google Cloud Console Configuration

For the OAuth 2.0 flow to succeed from GitHub Pages, you must register the production domain:

1. Go to the **Google Cloud Console** > **APIs & Services** > **Credentials**.
2. Edit the OAuth 2.0 Client ID used for this application.
3. Under **Authorized JavaScript origins**, add:
   - `https://tmaeda11235.github.io`
4. Under **Authorized redirect URIs**, add the specific OAuth redirect page if any custom callback is hosted (e.g., `https://tmaeda11235.github.io/style-atelier/oauth-callback.html`).

### B. Secret Management & API Restriction

- **Never Hardcode Secrets:** Do not expose sensitive OAuth Client Secrets or API Keys in the repository code.
- **Client ID Visibility:** The OAuth Client ID is safe to reside in front-end code (it is a public identifier), but it should be restricted to the authorized origins above.
- **API Key Restrictions:** If utilizing an API key, restrict the key in the Google Cloud Console to:
  - **HTTP Referrers:** Restrict usage to `*.github.io/*` and `localhost`.
  - **API Restrictions:** Limit the key so it can only call the Google Drive API.
