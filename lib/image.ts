/**
 * Client-side photo downscale, run before a photo leaves the phone.
 *
 * WHY: raw phone photos are 2–6MB. Server Actions cap request bodies at 1MB
 * by default and Vercel functions at ~4.5MB, so full-size uploads failed
 * (silently, for the Storage upload). Claude vision also downsamples anything
 * past ~1568px on the long edge, so sending more pixels only costs time and
 * tokens. One resize here fixes the size limits AND speeds up ID. See L25.
 *
 * Falls back to the original file if the browser can't decode it — the
 * server-side checks still reject anything genuinely unusable.
 */

const MAX_EDGE = 1568;
const JPEG_QUALITY = 0.85;

export async function downscaleImage(file: File): Promise<File> {
  if (typeof createImageBitmap !== "function") return file;

  let bitmap: ImageBitmap;
  try {
    // `from-image` applies EXIF rotation so portrait phone shots stay upright.
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }

  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    // JPEG has no alpha: without this, transparent PNG areas turn black.
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(bitmap, 0, 0, width, height);

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY)
    );
    if (!blob) return file;
    // Already small and not resized? Keep the original bytes.
    if (scale === 1 && blob.size >= file.size) return file;

    const base = file.name.replace(/\.[^.]+$/, "") || "plant";
    return new File([blob], `${base}.jpg`, { type: "image/jpeg" });
  } finally {
    bitmap.close();
  }
}
