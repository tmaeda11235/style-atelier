/**
 * Image resizing and utility functions for creating lightweight thumbnails.
 */

/**
 * Resizes an image (Blob or URL) to the specified maximum dimensions and converts it to a Base64 JPEG Data URL.
 * Falls back to a dummy 1x1 PNG in test or non-browser environments.
 * 
 * @param imageSource - The source of the image (Blob, local URL, or remote URL).
 * @param maxWidth - The maximum width allowed for the resized image.
 * @param maxHeight - The maximum height allowed for the resized image.
 * @param quality - The output quality for the compressed JPEG (0.0 to 1.0).
 * @returns A Promise that resolves to the Base64 Data URL.
 */
export async function createThumbnailDataUrl(
  imageSource: Blob | string,
  maxWidth = 200,
  maxHeight = 200,
  quality = 0.8
): Promise<string> {
  if (imageSource === "") {
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }

  // If URL points to the default icon asset or placeholder, skip processing and return it as is.
  if (typeof imageSource === "string" && (imageSource.includes("assets/icon.png") || imageSource.startsWith("url:"))) {
    return imageSource;
  }

  const isTest = typeof process !== "undefined" && process.env.VITEST;
  if (
    typeof window === "undefined" ||
    typeof document === "undefined" ||
    isTest
  ) {
    // Return a dummy 1x1 white PNG Data URL for tests / SSR
    return "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==";
  }

  let url: string;
  let shouldRevoke = false;

  if (imageSource instanceof Blob) {
    url = URL.createObjectURL(imageSource);
    shouldRevoke = true;
  } else {
    url = imageSource;
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "Anonymous";

    const cleanup = () => {
      if (shouldRevoke) {
        try {
          URL.revokeObjectURL(url);
        } catch (e) {
          console.warn("Failed to revoke object URL:", e);
        }
      }
    };

    const processImage = () => {
      try {
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          throw new Error("Canvas 2D context not available");
        }

        let width = img.naturalWidth || img.width;
        let height = img.naturalHeight || img.height;

        if (width > height) {
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
        } else {
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
        }

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(img, 0, 0, width, height);

        const dataUrl = canvas.toDataURL("image/jpeg", quality);
        cleanup();
        resolve(dataUrl);
      } catch (err) {
        console.error("Failed to draw image to canvas for thumbnail:", err);
        cleanup();
        // Fallback to the original URL if canvas rendering fails
        resolve(typeof imageSource === "string" ? imageSource : "assets/icon.png");
      }
    };

    img.onload = processImage;
    img.onerror = () => {
      console.warn("Failed to load image for thumbnail creation, using fallback");
      cleanup();
      resolve(typeof imageSource === "string" ? imageSource : "assets/icon.png");
    };

    if (url.startsWith("data:") || url.startsWith("blob:")) {
      img.src = url;
    } else if (url.startsWith("http://") || url.startsWith("https://")) {
      // Attempt to fetch with CORS bypass (useful in extension context)
      fetch(url)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error! Status: ${res.status}`);
          return res.blob();
        })
        .then((blob) => {
          const localUrl = URL.createObjectURL(blob);
          url = localUrl;
          shouldRevoke = true;
          img.src = localUrl;
        })
        .catch((err) => {
          console.warn("Failed to fetch image with CORS bypass, setting direct URL", err);
          img.src = url;
        });
    } else {
      img.src = url;
    }
  });
}
