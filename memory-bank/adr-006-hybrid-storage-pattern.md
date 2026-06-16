# ADR 006: Hybrid Storage Pattern: Offloading Large Binary Images from IndexedDB to OPFS

## Context

Historically, the application stored large binary data—specifically style card thumbnails (`thumbnailData`) and custom category covers (`coverImageUrl` or `iconUrl`)—directly inside IndexedDB (using Dexie) as Base64 strings or Blobs. As users accumulated more styles and categories, this approach led to several critical scalability and robustness issues:

1. **Performance Degradation**: Serializing and deserializing large binary Blobs/Base64 strings during IndexedDB queries blocked the main UI thread, causing visible stuttering during library loads.
2. **Quota Violations (`QuotaExceededError`)**: Browsers impose strict storage quotas on IndexedDB. Storing multiple megabytes of images per card quickly exhausted the database limit, leading to write failures (#935).
3. **Database Corruption**: Large database size increases the chance of IndexedDB corruption during unexpected page reloads, browser crashes, or operating system power loss, triggering startup crashes (#934).
4. **High Sync Overhead**: Google Drive backups required uploading the entire IndexedDB database file. Including binary images meant backups grew exponentially, leading to network timeouts and sync failures.

To address these challenges, we need a strategy to offload large assets while retaining fast querying capabilities for metadata.

## Decision

We will adopt the **Hybrid Storage Pattern**:

- **Metadata Management**: Structured information (prompts, tags, category configurations) remains in **IndexedDB** to maintain fast querying, sorting, and indexing performance.
- **Binary Offloading**: Large image assets (card thumbnails, category covers) are moved to the **Origin Private File System (OPFS)**, a low-level, high-performance sandbox file system provided by modern browsers.
- **Reference Resolution**: Instead of containing raw binary data, IndexedDB records will reference images via relative paths (e.g., `card-images/{cardId}.png` or `card-images/categories/{categoryId}.png`).

## Design Points & Caveats

To ensure system stability, the migration and operation of the hybrid storage pattern are governed by the following guidelines:

### 1. Atomic Storage Operations (`image-opfs-storage.ts`)

- OPFS file writes are not naturally atomic. To prevent file corruption if the user closes the page or a service worker terminates during a write, writes must be performed using a temporary file (e.g., `{filename}.tmp`).
- Once the write completes successfully, the temporary file is renamed/moved to the target filename.
- Error handlers must clean up any leftover `.tmp` files to prevent cluttering the storage.

### 2. Database Schema Migration (Version 14)

- Upgrading the database schema to version 14 involves migrating existing binary data.
- The migration process reads the binary `thumbnailData` or Base64 `coverImageUrl` from IndexedDB, writes them into OPFS, saves the relative path under a new field (`thumbnailPath` / `coverImagePath`), and purges the old binary fields to shrink the IndexedDB file.

### 3. Asynchronous Reading and LRU Cache Adapter (`useOpfsImage`)

- Unlike IndexedDB objects which can be resolved synchronously in-memory once fetched, reading from OPFS is strictly asynchronous.
- To avoid UI flicker and repeatedly reading the same file from disk, an image cache adapter (`OpfsImage` component / `useOpfsImage` hook) is introduced.
- An in-memory cache (using LRU logic) stores frequently accessed images to balance memory usage and instant UI rendering.

### 4. Incremental Google Drive Sync

- Rather than backing up the entire IndexedDB database including images, we implement an incremental sync engine.
- Only metadata is exported in the primary database backup.
- Image sync records are maintained in a dedicated IndexedDB table (`imageSyncStates`). When sync occurs, MD5 hashes of local OPFS images are compared against remote files on Google Drive, and only new, modified, or deleted images are synced.

## Consequences

- **Positive**:
  - Significantly reduces IndexedDB size, eliminating `QuotaExceededError` risks.
  - Improves startup time and responsiveness of the SidePanel, as the database payload is minimal.
  - Decreases network bandwidth and API calls during Google Drive sync by transferring only changed images.
- **Negative**:
  - Requires asynchronous image resolution in the UI, leading to temporary loading spinners/placeholders.
  - Increases code complexity to maintain synchronization and referential integrity between IndexedDB and OPFS.
- **Neutral**:
  - Unit and E2E tests must mock `navigator.storage` and OPFS directory handles to ensure reliability across execution environments.
