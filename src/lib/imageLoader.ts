/**
 * Image loader for next/image that does NOT use Vercel's paid image optimizer
 * (which started refusing requests with "402 Payment required" once the plan's
 * monthly limit was used up, leaving most product photos broken).
 *
 * - AliExpress photos: AliExpress's own image servers resize and convert to WebP
 *   when a size is added to the file name (e.g. ...jpg_350x350.jpg). Those
 *   originals are often 400 KB to 3.5 MB; this serves 5 to 70 KB instead, free.
 * - The logo (a 514 KB, 1254px file shown at about 64px): the smallest pre-made copy
 *   that is big enough, instead of the full file on every page.
 * - Everything else (our own Vercel Blob uploads, other local files): served as-is.
 *   Our uploads are small, and returning the same URL for every size lets the
 *   browser and CDN cache a single copy.
 */
const ALI_SIZES = [220, 350, 640, 800];

export function aliSizeFor(width: number): number {
  return ALI_SIZES.find((s) => width <= s) ?? ALI_SIZES[ALI_SIZES.length - 1];
}

// Pre-made copies of /logo.png in /public, smallest first.
const LOGO_COPIES: [number, string][] = [
  [128, "/logo-128.png"],
  [256, "/logo-256.png"],
  [640, "/logo-640.png"],
];

export function logoFor(width: number): string {
  return LOGO_COPIES.find(([max]) => width <= max)?.[1] ?? "/logo.png";
}

export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }): string {
  if (src === "/logo.png") return logoFor(width);
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
