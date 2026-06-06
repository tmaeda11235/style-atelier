import { db } from "./db";
import { validateBackupPayload } from "./backup-validator";

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
  const cards = await db.getAllCards();
  const categories = await db.getAllCategories();
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
  let payload: any;
  try {
    payload = JSON.parse(jsonData);
  } catch (e) {
    throw new Error("Invalid JSON format. Failed to parse backup file.");
  }

  const validation = validateBackupPayload(payload);
  if (!validation.isValid) {
    throw new Error(`Database validation failed: ${validation.error}`);
  }

  await db.importBackupData(payload.data);

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

export interface ReauthContext {
  token: string;
}

const configureXhr = (
  xhr: XMLHttpRequest,
  options?: { signal?: AbortSignal; timeoutMs?: number },
  onAbort?: () => void
) => {
  const timeoutMs = options?.timeoutMs ?? 10000;
  xhr.timeout = timeoutMs;
  
  if (options?.signal) {
    const onAbortTriggered = () => {
      xhr.abort();
      if (onAbort) onAbort();
    };
    options.signal.addEventListener("abort", onAbortTriggered);
    return () => {
      options.signal?.removeEventListener("abort", onAbortTriggered);
    };
  }
  return () => {};
};

/**
 * A wrapper around fetch that automatically handles 401 Unauthorized (invalid/expired token)
 */
async function fetchWithReauth(
  url: string,
  options: RequestInit & { timeoutMs?: number; signal?: AbortSignal },
  context: ReauthContext,
  onTokenUpdated?: (newToken: string) => void
): Promise<Response> {
  let res = await fetchWithTimeout(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${context.token}`
    }
  });

  if (res.status === 401) {
    console.warn("Google Drive API returned 401. Stale token detected. Clearing cache and retrying silently...");
    
    await clearCachedToken(context.token);
    
    try {
      const newToken = await authorize(false); // interactive = false
      context.token = newToken;
      if (onTokenUpdated) {
        onTokenUpdated(newToken);
      }
      
      res = await fetchWithTimeout(url, {
        ...options,
        headers: {
          ...options.headers,
          Authorization: `Bearer ${newToken}`
        }
      });
    } catch (reauthErr: any) {
      console.error("Silent re-authorization failed:", reauthErr);
      throw new Error(`Google Drive authentication expired: ${reauthErr.message || reauthErr}`);
    }
  }

  return res;
}

/**
 * Search Google Drive for an existing file named 'style-atelier-backup.json'
 */
export async function searchBackupFile(
  accessToken: string,
  onTokenUpdated?: (newToken: string) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<string | null> {
  const ctx = context || { token: accessToken };
  const query = encodeURIComponent("name = 'style-atelier-backup.json' and trashed = false");
  const res = await fetchWithReauth(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`,
    {
      ...options
    },
    ctx,
    onTokenUpdated
  );

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
  onTokenUpdated?: (newToken: string) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<BackupMetadata | null> {
  const ctx = context || { token: accessToken };
  const query = encodeURIComponent("name = 'style-atelier-backup.json' and trashed = false");
  const res = await fetchWithReauth(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)&spaces=drive`,
    {
      ...options
    },
    ctx,
    onTokenUpdated
  );

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
  onTokenUpdated?: (newToken: string) => void,
  onProgress?: (progress: number) => void,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<void> {
  const ctx = { token: accessToken };
  const fileId = await searchBackupFile(ctx.token, onTokenUpdated, ctx, options);
  const blob = new Blob([jsonData], { type: "application/json" });
  const threshold = 2 * 1024 * 1024; // 2MB

  if (blob.size >= threshold) {
    await uploadBackupResumable(ctx.token, fileId, blob, onTokenUpdated, onProgress, ctx, options);
  } else {
    await uploadBackupSimple(ctx.token, fileId, jsonData, onTokenUpdated, onProgress, ctx, options);
  }
}

/**
 * Perform Resumable upload to Google Drive
 */
async function uploadBackupResumable(
  accessToken: string,
  fileId: string | null,
  blob: Blob,
  onTokenUpdated?: (newToken: string) => void,
  onProgress?: (progress: number) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<void> {
  const ctx = context || { token: accessToken };
  let initUrl = "https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable";
  let method = "POST";
  let metadata: any = {
    mimeType: "application/json"
  };

  if (fileId) {
    initUrl = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=resumable`;
    method = "PATCH";
  } else {
    metadata.name = "style-atelier-backup.json";
  }

  // 1. Initialize Resumable session
  const res = await fetchWithReauth(
    initUrl,
    {
      method,
      headers: {
        "Content-Type": "application/json; charset=UTF-8",
        "X-Upload-Content-Type": "application/json",
        "X-Upload-Content-Length": blob.size.toString()
      },
      body: JSON.stringify(metadata),
      ...options
    },
    ctx,
    onTokenUpdated
  );

  if (!res.ok) {
    throw new Error(`Failed to initialize resumable upload: ${res.status} ${res.statusText}`);
  }

  const uploadUrl = res.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("Failed to get resumable upload session URL (Location header missing)");
  }

  // 2. Upload file content to session URL via XMLHttpRequest
  const sendXhr = (token: string) => {
    return new Promise<number>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", uploadUrl, true);
      xhr.setRequestHeader("Content-Type", "application/json");

      const cleanup = configureXhr(xhr, options, () => {
        reject(new Error("Upload aborted by user"));
      });

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        cleanup();
        resolve(xhr.status);
      };
      xhr.ontimeout = () => {
        cleanup();
        reject(new GDriveTimeoutError());
      };
      xhr.onerror = () => {
        cleanup();
        reject(new Error("Network error during resumable upload."));
      };
      xhr.send(blob);
    });
  };

  let status = await sendXhr(ctx.token);
  if (status === 401) {
    console.warn("Resumable upload PUT returned 401. Retrying with new token...");
    await clearCachedToken(ctx.token);
    const newToken = await authorize(false);
    ctx.token = newToken;
    if (onTokenUpdated) onTokenUpdated(newToken);
    status = await sendXhr(newToken);
  }

  if (status < 200 || status >= 300) {
    throw new Error(`Resumable upload failed with status: ${status}`);
  }
}

/**
 * Perform Simple upload to Google Drive with progress support via XMLHttpRequest
 */
async function uploadBackupSimple(
  accessToken: string,
  fileId: string | null,
  jsonData: string,
  onTokenUpdated?: (newToken: string) => void,
  onProgress?: (progress: number) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<void> {
  const ctx = context || { token: accessToken };

  if (fileId) {
    // File exists, overwrite it using PATCH (Simple media upload)
    const sendXhr = (token: string) => {
      return new Promise<number>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PATCH", `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, true);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("Content-Type", "application/json");

        const cleanup = configureXhr(xhr, options, () => {
          reject(new Error("Upload aborted by user"));
        });

        if (onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              onProgress(percent);
            }
          };
        }

        xhr.onload = () => {
          cleanup();
          resolve(xhr.status);
        };
        xhr.ontimeout = () => {
          cleanup();
          reject(new GDriveTimeoutError());
        };
        xhr.onerror = () => {
          cleanup();
          reject(new Error("Network error during simple update."));
        };
        xhr.send(jsonData);
      });
    };

    let status = await sendXhr(ctx.token);
    if (status === 401) {
      await clearCachedToken(ctx.token);
      const newToken = await authorize(false);
      ctx.token = newToken;
      if (onTokenUpdated) onTokenUpdated(newToken);
      status = await sendXhr(newToken);
    }

    if (status < 200 || status >= 300) {
      throw new Error(`Failed to update backup file: status ${status}`);
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

    const sendXhr = (token: string) => {
      return new Promise<number>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", true);
        xhr.setRequestHeader("Authorization", `Bearer ${token}`);
        xhr.setRequestHeader("Content-Type", `multipart/related; boundary=${boundary}`);

        const cleanup = configureXhr(xhr, options, () => {
          reject(new Error("Upload aborted by user"));
        });

        if (onProgress) {
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const percent = Math.round((event.loaded / event.total) * 100);
              onProgress(percent);
            }
          };
        }

        xhr.onload = () => {
          cleanup();
          resolve(xhr.status);
        };
        xhr.ontimeout = () => {
          cleanup();
          reject(new GDriveTimeoutError());
        };
        xhr.onerror = () => {
          cleanup();
          reject(new Error("Network error during simple creation."));
        };
        xhr.send(multipartBody);
      });
    };

    let status = await sendXhr(ctx.token);
    if (status === 401) {
      await clearCachedToken(ctx.token);
      const newToken = await authorize(false);
      ctx.token = newToken;
      if (onTokenUpdated) onTokenUpdated(newToken);
      status = await sendXhr(newToken);
    }

    if (status < 200 || status >= 300) {
      throw new Error(`Failed to create backup file: status ${status}`);
    }
  }
}

/**
 * Download file contents of 'style-atelier-backup.json' from Google Drive with progress support
 */
export async function downloadBackup(
  accessToken: string,
  onTokenUpdated?: (newToken: string) => void,
  onProgress?: (progress: number) => void,
  context?: ReauthContext,
  options?: { signal?: AbortSignal; timeoutMs?: number }
): Promise<string | null> {
  const ctx = context || { token: accessToken };
  const fileId = await searchBackupFile(ctx.token, onTokenUpdated, ctx, options);
  if (!fileId) {
    return null;
  }

  const sendXhr = (token: string) => {
    return new Promise<{ status: number; text: string | null }>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("GET", `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, true);
      xhr.setRequestHeader("Authorization", `Bearer ${token}`);

      const cleanup = configureXhr(xhr, options, () => {
        reject(new Error("Download aborted by user"));
      });

      if (onProgress) {
        xhr.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        cleanup();
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve({ status: xhr.status, text: xhr.responseText });
        } else {
          resolve({ status: xhr.status, text: null });
        }
      };
      xhr.ontimeout = () => {
        cleanup();
        reject(new GDriveTimeoutError());
      };
      xhr.onerror = () => {
        cleanup();
        reject(new Error("Network error during download."));
      };
      xhr.send();
    });
  };

  let result = await sendXhr(ctx.token);
  if (result.status === 401) {
    await clearCachedToken(ctx.token);
    const newToken = await authorize(false);
    ctx.token = newToken;
    if (onTokenUpdated) onTokenUpdated(newToken);
    result = await sendXhr(newToken);
  }

  if (result.status < 200 || result.status >= 300) {
    throw new Error(`Failed to download backup file: status ${result.status}`);
  }

  return result.text;
}
