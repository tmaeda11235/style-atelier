import { db } from "./db";

export class GDriveTimeoutError extends Error {
  constructor(message = "Google Drive API request timed out.") {
    super(message);
    this.name = "GDriveTimeoutError";
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit & { timeoutMs?: number }
): Promise<Response> {
  const { timeoutMs = 10000, signal, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  if (signal) {
    signal.addEventListener("abort", () => {
      controller.abort();
    });
    if (signal.aborted) {
      controller.abort();
    }
  }

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    return response;
  } catch (error: any) {
    if (error.name === "AbortError") {
      if (signal?.aborted) {
        throw error;
      }
      throw new GDriveTimeoutError();
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}


export interface BackupPayload {
  version: number;
  exportedAt: number;
  data: {
    styleCards: any[];
    categories: any[];
    userSettings: any[];
    historyItems: any[];
    slotHistory?: Record<string, string[]>;
  };
}

/**
 * Trigger OAuth2 authorization flow using chrome.identity.getAuthToken (Native Chrome Extension flow)
 */
export async function authorize(interactive = true): Promise<string> {
  if (typeof chrome === "undefined" || !chrome.identity || !chrome.identity.getAuthToken) {
    throw new Error("Chrome Identity API is not available. This feature only works inside the Chrome Extension environment.");
  }

  return new Promise((resolve, reject) => {
    chrome.identity.getAuthToken(
      {
        interactive
      },
      (token) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (token) {
          resolve(token);
        } else {
          reject(new Error("Authorization failed: empty access token"));
        }
      }
    );
  });
}

/**
 * Remove cached auth token if it expires or becomes invalid
 */
export async function clearCachedToken(token: string): Promise<void> {
  if (typeof chrome === "undefined" || !chrome.identity || !chrome.identity.removeCachedAuthToken) {
    return;
  }

  return new Promise((resolve) => {
    chrome.identity.removeCachedAuthToken({ token }, () => {
      resolve();
    });
  });
}

/**
 * Serialize Dexie database tables to a JSON string
 */
export async function exportDatabase(): Promise<string> {
  const cards = await db.styleCards.toArray();
  const categories = await db.categories.toArray();
  const settings = await db.userSettings.toArray();
  const history = await db.historyItems.toArray();

  // Exclude local image blobs in history items to keep backup lightweight
  const historyWithoutBlobs = history.map((item) => {
    const { localImageBlob, ...rest } = item;
    return rest;
  });

  let slotHistory: Record<string, string[]> | undefined = undefined;
  try {
    const stored = localStorage.getItem("style_atelier_slot_history");
    if (stored) {
      slotHistory = JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to read slot history for backup:", e);
  }

  const payload: BackupPayload = {
    version: 1,
    exportedAt: Date.now(),
    data: {
      styleCards: cards,
      categories,
      userSettings: settings,
      historyItems: historyWithoutBlobs,
      slotHistory
    }
  };

  return JSON.stringify(payload);
}

/**
 * Clear existing IndexedDB tables and populate with imported JSON data
 */
export async function importDatabase(jsonData: string): Promise<void> {
  const payload = JSON.parse(jsonData) as BackupPayload;
  
  if (!payload.data || !payload.data.styleCards) {
    throw new Error("Invalid backup data format: Missing styleCards.");
  }

  await db.transaction("rw", [db.styleCards, db.categories, db.userSettings, db.historyItems], async () => {
    if (payload.data.styleCards.length > 0) {
      await db.styleCards.bulkPut(payload.data.styleCards);
    }
    if (payload.data.categories && payload.data.categories.length > 0) {
      await db.categories.bulkPut(payload.data.categories);
    }
    if (payload.data.userSettings && payload.data.userSettings.length > 0) {
      await db.userSettings.bulkPut(payload.data.userSettings);
    }
    if (payload.data.historyItems && payload.data.historyItems.length > 0) {
      await db.historyItems.bulkPut(payload.data.historyItems);
    }
  });

  if (payload.data.slotHistory) {
    try {
      const stored = localStorage.getItem("style_atelier_slot_history");
      const existingHistory: Record<string, string[]> = stored ? JSON.parse(stored) : {};
      
      const mergedHistory: Record<string, string[]> = { ...existingHistory };
      
      for (const [key, incomingValues] of Object.entries(payload.data.slotHistory)) {
        if (Array.isArray(incomingValues)) {
          const localValues = mergedHistory[key] || [];
          const merged = Array.from(new Set([...incomingValues, ...localValues])).slice(0, 10);
          mergedHistory[key] = merged;
        }
      }
      
      localStorage.setItem("style_atelier_slot_history", JSON.stringify(mergedHistory));
    } catch (e) {
      console.error("Failed to restore/merge slot history:", e);
    }
  }
}

/**
 * Search Google Drive for an existing file named 'style-atelier-backup.json'
 */
export async function searchBackupFile(
  accessToken: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<string | null> {
  const query = encodeURIComponent("name = 'style-atelier-backup.json' and trashed = false");
  const res = await fetchWithTimeout(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    ...options
  });

  if (!res.ok) {
    throw new Error(`Failed to search backup file: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    return data.files[0].id;
  }
  return null;
}

export interface BackupMetadata {
  id: string;
  modifiedTime: string;
  size: string;
}

/**
 * Search Google Drive for 'style-atelier-backup.json' and return its metadata
 */
export async function getBackupMetadata(
  accessToken: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<BackupMetadata | null> {
  const query = encodeURIComponent("name = 'style-atelier-backup.json' and trashed = false");
  const res = await fetchWithTimeout(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)&spaces=drive`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    ...options
  });

  if (!res.ok) {
    throw new Error(`Failed to get backup metadata: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  if (data.files && data.files.length > 0) {
    const file = data.files[0];
    return {
      id: file.id,
      modifiedTime: file.modifiedTime || "",
      size: file.size || "0"
    };
  }
  return null;
}

/**
 * Upload backup payload JSON to Google Drive (create or overwrite)
 */
export async function uploadBackup(
  accessToken: string,
  jsonData: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<void> {
  const fileId = await searchBackupFile(accessToken, options);

  if (fileId) {
    // File exists, overwrite it using PATCH (Simple media upload)
    const res = await fetchWithTimeout(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: jsonData,
      ...options
    });

    if (!res.ok) {
      throw new Error(`Failed to update backup file: ${res.status} ${res.statusText}`);
    }
  } else {
    // File does not exist, create it using POST (Multipart upload to set metadata name)
    const boundary = "style_atelier_backup_boundary";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;

    const metadata = {
      name: "style-atelier-backup.json",
      mimeType: "application/json"
    };

    const multipartBody =
      delimiter +
      "Content-Type: application/json; charset=UTF-8\r\n\r\n" +
      JSON.stringify(metadata) +
      delimiter +
      "Content-Type: application/json\r\n\r\n" +
      jsonData +
      closeDelimiter;

    const res = await fetchWithTimeout("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: multipartBody,
      ...options
    });

    if (!res.ok) {
      throw new Error(`Failed to create backup file: ${res.status} ${res.statusText}`);
    }
  }
}

/**
 * Download file contents of 'style-atelier-backup.json' from Google Drive
 */
export async function downloadBackup(
  accessToken: string,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<string | null> {
  const fileId = await searchBackupFile(accessToken, options);
  if (!fileId) {
    return null;
  }

  const res = await fetchWithTimeout(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    },
    ...options
  });

  if (!res.ok) {
    throw new Error(`Failed to download backup file: ${res.status} ${res.statusText}`);
  }

  return await res.text();
}
