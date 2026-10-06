/**
 * Image loader for next/image that does NOT use Vercel's paid image optimizer
 * (which started refusing requests with "402 Payment required" once the plan's
 * monthly limit was used up, leaving most product photos broken).
 *
 * - AliExpress photos: AliExpress's own image servers resize and convert to WebP
 *   when a size is added to the file name (e.g. ...jpg_350x350.jpg). Those
 *   originals are often 400 KB to 3.5 MB; this serves 5 to 70 KB instead, free.
 * - Everything else (our own Vercel Blob uploads, local files): served as-is.
 *   Our uploads are small, and returning the same URL for every size lets the
 *   browser and CDN cache a single copy.
 */
const ALI_SIZES = [220, 350, 640, 800];

export function aliSizeFor(width: number): number {
  return ALI_SIZES.find((s) => width <= s) ?? ALI_SIZES[ALI_SIZES.length - 1];
}

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  try {
    const url = new URL(src);
    if (url.protocol === "https:" && url.hostname.endsWith(".alicdn.com") && !url.search) {
      const size = aliSizeFor(width);
      return `${src}_${size}x${size}.jpg`;
    }
  } catch {
    // A relative path such as /logo.png: not a remote URL, serve it unchanged.
  }
  return src;
}
