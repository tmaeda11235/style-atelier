# ADR-002: Robust QR Decoding with PNG Metadata Integration

## Status

Accepted

## Context

Style Atelier allows users to export and import Style Cards as PNG images with QR codes containing the compressed card parameters.
However, sharing style card images over platforms (such as Discord or messaging apps) often applies compression or resizing, causing the QR codes to lose readability.
To solve this:

1. **QR Scan Failures**: Standard full-image scans often fail if the image is noisy or if the QR code is compressed.
2. **Metadata Loss**: When an uncompressed PNG is directly imported, we want to skip QR scanning entirely for instant load.
3. **Noisy/Resized Images**: When QR scanning is required but the full image scan fails, we need fallback scan algorithms (e.g. cropping the QR region at the bottom-right).

## Decision

We implement a hybrid, highly robust extraction pipeline:

1. **PNG Metadata Injection & Extraction**:
   - During export, we inject a custom `tEXt` (or fallback) chunk containing the compressed card payload with key `"stylecard"`.
   - To verify chunk integrity, we implement a fast, custom CRC32 checker.
   - During import, we read the raw binary file as an ArrayBuffer, extract the metadata chunk, and directly decode it, bypassing QR scanning.
2. **Multi-Stage Canvas Scan Fallbacks**:
   - If no metadata chunk is found (e.g., image was re-encoded as JPEG/WebP or metadata was stripped), we fallback to standard QR code scanning using `jsQR`.
   - If the full image scan fails, we crop the bottom-right corner (which contains the card's QR code) and scan the cropped area.
   - If that still fails, we scale the crop to 2x resolution to reconstruct pixel detail for low-res/compressed inputs.
3. **Diagnostic Messages**:
   - Provide localized, actionable error messages suggesting alternative solutions (e.g., cropping or using uncompressed files) instead of a generic failure notice.

## Consequences

- **Robustness**: High import success rate for both compressed images (via scaling/cropping) and uncompressed images (via metadata).
- **Performance**: Instant imports for PNGs containing the `stylecard` metadata chunk, since canvas rendering and `jsQR` scans are completely bypassed.
- **Maintainability**: Low-level PNG parsing code is covered by strict unit tests (`qr-utils.test.ts`), isolating it from the UI layer.
