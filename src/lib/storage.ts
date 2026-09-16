import "server-only";
import { put } from "@vercel/blob";
import crypto from "crypto";

/**
 * StorageService — Vercel Blob (public access), so uploaded files survive
 * across requests/deploys and are served from a real CDN. Every caller goes
 * through `saveUploadedFile`/`saveUploadedVideo` rather than touching the
 * Blob SDK directly, so swapping providers later means changing only this
 * file. (Previously local filesystem under /public/uploads — broken on
 * Vercel's ephemeral, per-invocation filesystem; replaced rather than
 * patched.)
 */

const ALLOWED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp", "image/gif"]);
const MAX_IMAGE_BYTES = 8 * 1024 * 1024; // 8MB

const ALLOWED_VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);
const MAX_VIDEO_BYTES = 100 * 1024 * 1024; // 100MB

export async function saveUploadedFile(file: File, subfolder = "misc"): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (!ALLOWED_IMAGE_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Please upload a JPEG, PNG, WEBP or GIF image.");
  }
  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error("File is too large. Maximum size is 8MB.");
  }

  const ext = file.type.split("/")[1] === "jpeg" ? "jpg" : file.type.split("/")[1];
  const pathname = `${subfolder}/${crypto.randomUUID()}.${ext}`;
  const blob = await put(pathname, file, { access: "public", contentType: file.type });
  return blob.url;
}

export async function saveUploadedVideo(file: File, subfolder = "misc"): Promise<string | null> {
  if (!file || file.size === 0) return null;
  if (!ALLOWED_VIDEO_TYPES.has(file.type)) {
    throw new Error("Unsupported file type. Please upload an MP4, WEBM or MOV video.");
  }
  if (file.size > MAX_VIDEO_BYTES) {
    throw new Error("File is too large. Maximum size is 100MB.");
  }

  const ext = file.type.split("/")[1] === "quicktime" ? "mov" : file.type.split("/")[1];
  const pathname = `${subfolder}/${crypto.randomUUID()}.${ext}`;
  const blob = await put(pathname, file, { access: "public", contentType: file.type });
  return blob.url;
}
