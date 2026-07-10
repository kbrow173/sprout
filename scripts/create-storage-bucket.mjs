// Creates the `plant-photos` Supabase Storage bucket (public read, so
// photo_url can be a plain public URL — matches the FullPantry/Wardrobe
// pattern). Uploads always go through the service-role server client, so no
// storage RLS policies are needed. Run once: `node scripts/create-storage-bucket.mjs`
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(__dirname, "..", ".env.local");
for (const line of readFileSync(envPath, "utf8").split("\n")) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(url, key);

const BUCKET = "plant-photos";

const { data: existing } = await supabase.storage.getBucket(BUCKET);
if (existing) {
  console.log(`Bucket "${BUCKET}" already exists — nothing to do.`);
  process.exit(0);
}

const { error } = await supabase.storage.createBucket(BUCKET, {
  public: true,
  fileSizeLimit: "8MB",
  allowedMimeTypes: ["image/jpeg", "image/png", "image/webp", "image/gif"],
});

if (error) {
  console.error(`Failed to create bucket: ${error.message}`);
  process.exit(1);
}

console.log(`Created public bucket "${BUCKET}".`);
