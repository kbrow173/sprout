// One-off icon rasterizer: public/icon.svg -> the PNG sizes iOS/Android/PWA
// manifests expect. Re-run with `npm run icons` any time icon.svg changes.
import sharp from "sharp";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.join(__dirname, "..", "public");
const svg = readFileSync(path.join(publicDir, "icon.svg"));

// Standard PWA icons (the artwork already fills the canvas edge-to-edge with
// rounded corners, so these double as "any" purpose icons).
const targets = [
  { file: "icon-192.png", size: 192 },
  { file: "icon-512.png", size: 512 },
  // iOS home screen — Apple applies its own corner mask/shadow, so a square,
  // full-bleed source is correct here (no extra rounding needed).
  { file: "apple-icon.png", size: 180 },
  // Small monochrome-friendly badge for the notification tray.
  { file: "badge.png", size: 96 },
];

for (const { file, size } of targets) {
  await sharp(svg, { density: 384 })
    .resize(size, size)
    .png()
    .toFile(path.join(publicDir, file));
  console.log(`wrote public/${file} (${size}x${size})`);
}

// Maskable icon: Android's maskable spec crops to a centered circle, so the
// artwork needs to live inside the safe zone (inner ~80% of the canvas) with
// solid background behind it, not transparency.
await sharp(svg, { density: 384 })
  .resize(410, 410)
  .extend({
    top: 51,
    bottom: 51,
    left: 51,
    right: 51,
    background: "#102e1c",
  })
  .png()
  .toFile(path.join(publicDir, "icon-maskable-512.png"));
console.log("wrote public/icon-maskable-512.png (512x512, safe-zone padded)");
