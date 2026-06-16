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
