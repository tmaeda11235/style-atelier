import { db } from "./db";

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
export async function searchBackupFile(accessToken: string): Promise<string | null> {
  const query = encodeURIComponent("name = 'style-atelier-backup.json' and trashed = false");
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)&spaces=drive`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
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
export async function getBackupMetadata(accessToken: string): Promise<BackupMetadata | null> {
  const query = encodeURIComponent("name = 'style-atelier-backup.json' and trashed = false");
  const res = await fetch(`https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name,modifiedTime,size)&spaces=drive`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
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
 * Supports Resumable upload for sizes >= 2MB
 */
export async function uploadBackup(
  accessToken: string,
  jsonData: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  const fileId = await searchBackupFile(accessToken);
  const blob = new Blob([jsonData], { type: "application/json" });
  const threshold = 2 * 1024 * 1024; // 2MB

  if (blob.size >= threshold) {
    // Use Resumable upload
    await uploadBackupResumable(accessToken, fileId, blob, onProgress);
  } else {
    // Use Simple upload with progress support via XMLHttpRequest
    await uploadBackupSimple(accessToken, fileId, jsonData, onProgress);
  }
}

/**
 * Perform Resumable upload to Google Drive
 */
async function uploadBackupResumable(
  accessToken: string,
  fileId: string | null,
  blob: Blob,
  onProgress?: (progress: number) => void
): Promise<void> {
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
  const res = await fetch(initUrl, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json; charset=UTF-8",
      "X-Upload-Content-Type": "application/json",
      "X-Upload-Content-Length": blob.size.toString()
    },
    body: JSON.stringify(metadata)
  });

  if (!res.ok) {
    throw new Error(`Failed to initialize resumable upload: ${res.status} ${res.statusText}`);
  }

  const uploadUrl = res.headers.get("Location");
  if (!uploadUrl) {
    throw new Error("Failed to get resumable upload session URL (Location header missing)");
  }

  // 2. Upload file content to session URL
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", uploadUrl, true);
    xhr.setRequestHeader("Content-Type", "application/json");

    if (onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Resumable upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during resumable upload."));
    xhr.send(blob);
  });
}

/**
 * Perform Simple upload to Google Drive with progress support via XMLHttpRequest
 */
async function uploadBackupSimple(
  accessToken: string,
  fileId: string | null,
  jsonData: string,
  onProgress?: (progress: number) => void
): Promise<void> {
  if (fileId) {
    // File exists, overwrite it using PATCH (Simple media upload)
    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PATCH", `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, true);
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      xhr.setRequestHeader("Content-Type", "application/json");

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Failed to update backup file: ${xhr.status} ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during simple update."));
      xhr.send(jsonData);
    });
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

    return new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", true);
      xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);
      xhr.setRequestHeader("Content-Type", `multipart/related; boundary=${boundary}`);

      if (onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve();
        } else {
          reject(new Error(`Failed to create backup file: ${xhr.status} ${xhr.statusText}`));
        }
      };

      xhr.onerror = () => reject(new Error("Network error during simple creation."));
      xhr.send(multipartBody);
    });
  }
}

/**
 * Download file contents of 'style-atelier-backup.json' from Google Drive with progress support
 */
export async function downloadBackup(
  accessToken: string,
  onProgress?: (progress: number) => void
): Promise<string | null> {
  const fileId = await searchBackupFile(accessToken);
  if (!fileId) {
    return null;
  }

  return new Promise<string | null>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("GET", `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, true);
    xhr.setRequestHeader("Authorization", `Bearer ${accessToken}`);

    if (onProgress) {
      xhr.onprogress = (event) => {
        if (event.lengthComputable) {
          const percent = Math.round((event.loaded / event.total) * 100);
          onProgress(percent);
        }
      };
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve(xhr.responseText);
      } else {
        reject(new Error(`Failed to download backup file: ${xhr.status} ${xhr.statusText}`));
      }
    };

    xhr.onerror = () => reject(new Error("Network error during download."));
    xhr.send();
  });
}
