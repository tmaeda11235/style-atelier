import { db } from "./db";

// Default Client ID
export const DEFAULT_CLIENT_ID = "81426269486-ofes7841buji4k17mkf07pps81nit1h4.apps.googleusercontent.com";
const SCOPES = [
  "https://www.googleapis.com/auth/drive.file",
  "https://www.googleapis.com/auth/userinfo.email"
];

export interface BackupPayload {
  version: number;
  exportedAt: number;
  data: {
    styleCards: any[];
    categories: any[];
    userSettings: any[];
    historyItems: any[];
  };
}

/**
 * Get active Client ID (checks localStorage for custom client ID)
 */
export function getClientId(): string {
  const customId = localStorage.getItem("style-atelier-custom-client-id");
  return customId && customId.trim() !== "" ? customId.trim() : DEFAULT_CLIENT_ID;
}

/**
 * Trigger OAuth2 authorization flow using chrome.identity.launchWebAuthFlow
 */
export async function authorize(forceConsent = false): Promise<string> {
  if (typeof chrome === "undefined" || !chrome.identity || !chrome.identity.launchWebAuthFlow) {
    throw new Error("Chrome Identity API is not available. This feature only works inside the Chrome Extension environment.");
  }

  const clientId = getClientId();
  const redirectUrl = chrome.identity.getRedirectURL();
  
  let authUrl = `https://accounts.google.com/o/oauth2/v2/auth` +
    `?client_id=${clientId}` +
    `&redirect_uri=${encodeURIComponent(redirectUrl)}` +
    `&response_type=token` +
    `&scope=${encodeURIComponent(SCOPES.join(" "))}`;

  if (forceConsent) {
    authUrl += "&prompt=consent";
  }

  return new Promise((resolve, reject) => {
    chrome.identity.launchWebAuthFlow(
      {
        url: authUrl,
        interactive: true
      },
      (responseUrl) => {
        if (chrome.runtime.lastError) {
          return reject(new Error(chrome.runtime.lastError.message));
        }
        if (!responseUrl) {
          return reject(new Error("Authorization failed: empty redirect URL"));
        }

        try {
          const urlObj = new URL(responseUrl);
          const hash = urlObj.hash.substring(1);
          const params = new URLSearchParams(hash);
          const accessToken = params.get("access_token");

          if (accessToken) {
            resolve(accessToken);
          } else {
            reject(new Error("Authorization failed: access_token not found in redirect URL"));
          }
        } catch (e: any) {
          reject(new Error(`Failed to parse redirect URL: ${e.message}`));
        }
      }
    );
  });
}

/**
 * Fetch authorized user's email address
 */
export async function fetchUserInfo(accessToken: string): Promise<{ email: string }> {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to fetch user info: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  return { email: data.email || "unknown@gmail.com" };
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

  const payload: BackupPayload = {
    version: 1,
    exportedAt: Date.now(),
    data: {
      styleCards: cards,
      categories,
      userSettings: settings,
      historyItems: historyWithoutBlobs
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
    await db.styleCards.clear();
    await db.categories.clear();
    await db.userSettings.clear();
    await db.historyItems.clear();

    if (payload.data.styleCards.length > 0) {
      await db.styleCards.bulkAdd(payload.data.styleCards);
    }
    if (payload.data.categories && payload.data.categories.length > 0) {
      await db.categories.bulkAdd(payload.data.categories);
    }
    if (payload.data.userSettings && payload.data.userSettings.length > 0) {
      await db.userSettings.bulkAdd(payload.data.userSettings);
    }
    if (payload.data.historyItems && payload.data.historyItems.length > 0) {
      await db.historyItems.bulkAdd(payload.data.historyItems);
    }
  });
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

/**
 * Upload backup payload JSON to Google Drive (create or overwrite)
 */
export async function uploadBackup(accessToken: string, jsonData: string): Promise<void> {
  const fileId = await searchBackupFile(accessToken);

  if (fileId) {
    // File exists, overwrite it using PATCH (Simple media upload)
    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json"
      },
      body: jsonData
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

    const res = await fetch("https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": `multipart/related; boundary=${boundary}`
      },
      body: multipartBody
    });

    if (!res.ok) {
      throw new Error(`Failed to create backup file: ${res.status} ${res.statusText}`);
    }
  }
}

/**
 * Download file contents of 'style-atelier-backup.json' from Google Drive
 */
export async function downloadBackup(accessToken: string): Promise<string | null> {
  const fileId = await searchBackupFile(accessToken);
  if (!fileId) {
    return null;
  }

  const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });

  if (!res.ok) {
    throw new Error(`Failed to download backup file: ${res.status} ${res.statusText}`);
  }

  return await res.text();
}
