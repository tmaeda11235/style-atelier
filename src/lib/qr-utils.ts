import { deflateSync, inflateSync, strFromU8, strToU8 } from 'fflate';
import jsQR from 'jsqr';
import QRCode from 'qrcode';
import type { StyleCard } from './db-schema';

// Helper to convert Uint8Array to Base64 in both Node and Browser
function uint8ArrayToBase64(arr: Uint8Array): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(arr).toString('base64');
  }
  let binary = '';
  const len = arr.byteLength;
  for (let i = 0; i < len; i++) {
    binary += String.fromCharCode(arr[i]);
  }
  return btoa(binary);
}

// Helper to convert Base64 to Uint8Array in both Node and Browser
function base64ToUint8Array(base64: string): Uint8Array {
  if (typeof Buffer !== 'undefined') {
    const buf = Buffer.from(base64, 'base64');
    return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  }
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

/**
 * Compresses essential StyleCard fields into a Base64 string payload.
 * Strips heavy visual data like thumbnailData.
 */
export function compressCardData(card: StyleCard): string {
  const cleanCard = {
    id: card.id,
    name: card.name,
    promptSegments: card.promptSegments,
    parameters: card.parameters,
    tier: card.tier,
    frameId: card.frameId,
    category: card.category,
    imageUrl: card.images?.[0] || card.selectedThumbnails?.[0] || '',
    accentColor: card.accentColor,
    dominantColor: card.dominantColor,
  };

  const jsonStr = JSON.stringify(cleanCard);
  const bytes = strToU8(jsonStr);
  const compressed = deflateSync(bytes);
  return uint8ArrayToBase64(compressed);
}

/**
 * Decompresses a Base64 payload string back into a partial StyleCard.
 */
export function decompressCardData(payload: string): Partial<StyleCard> {
  try {
    const compressedBytes = base64ToUint8Array(payload);
    const decompressedBytes = inflateSync(compressedBytes);
    const jsonStr = strFromU8(decompressedBytes);
    const data = JSON.parse(jsonStr);

    // Reconstruct the StyleCard object fields
    const card: Partial<StyleCard> = {
      id: data.id,
      name: data.name,
      promptSegments: data.promptSegments,
      parameters: data.parameters,
      tier: data.tier,
      frameId: data.frameId,
      category: data.category,
      accentColor: data.accentColor,
      dominantColor: data.dominantColor,
    };

    if (data.imageUrl) {
      card.images = [data.imageUrl];
      card.selectedThumbnails = [data.imageUrl];
    }

    return card;
  } catch (error) {
    console.error('Failed to decompress card data:', error);
    throw new Error('Invalid QR payload or compression error');
  }
}

/**
 * Generates a Data URL for a QR Code image containing the payload string.
 */
export function generateQRCodeUrl(payload: string, width?: number): Promise<string> {
  return QRCode.toDataURL(payload, {
    errorCorrectionLevel: 'M', // Medium error correction is a good balance for data capacity
    margin: 2,
    width: width || 200,
  });
}

/**
 * Reads a QR code from a File object (Browser environment).
 */
export function readQRCodeFromImage(file: File): Promise<string | null> {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(null);
          return;
        }
        ctx.drawImage(img, 0, 0);
        try {
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code) {
            resolve(code.data);
          } else {
            resolve(null);
          }
        } catch (err) {
          console.error('Error extracting image data for QR scanning:', err);
          resolve(null);
        }
      };
      img.onerror = () => resolve(null);
      img.src = e.target?.result as string;
    };
    reader.onerror = () => resolve(null);
    reader.readAsDataURL(file);
  });
}
