import "server-only";
import { writeFile, mkdir } from "fs/promises";
import path from "path";
import crypto from "crypto";

/**
 * StorageService (Phase 1) — local filesystem storage under /public/uploads.
 *
 * This is a placeholder abstraction: in a real deployment (especially on
 * ephemeral/serverless hosts) file storage should move to S3, Cloudinary or
 * similar. Every caller in this codebase goes through `saveUploadedFile`
 * rather than touching the filesystem directly, so swapping the
 * implementation later means changing only this file.
 */

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_BYTES = 8 * 1024 * 1024; // 8MB

export async function saveUploadedFile(file: File, subfolder = "misc"): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Please upload a JPEG, PNG, WEBP or GIF image.");
  }
  if (file.size > MAX_BYTES) {
    throw new Error("File is too large. Maximum size is 8MB.");
  }

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const fileName = `${crypto.randomUUID()}.${ext}`;
  const dir = path.join(process.cwd(), "public", "uploads", subfolder);
  await mkdir(dir, { recursive: true });

  const buffer = Buffer.from(await file.arrayBuffer());
  await writeFile(path.join(dir, fileName), buffer);

  return `/uploads/${subfolder}/${fileName}`;
}
