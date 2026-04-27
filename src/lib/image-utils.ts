/**
 * Optimize cover image URLs via wsrv.nl proxy.
 * Resizes to a max width and converts to WebP for smaller file sizes.
 * wsrv.nl provides CDN caching globally, reducing bandwidth on origin.
 */
export function optimizeCover(url: string | undefined, width = 400): string {
  if (!url) return "";
  // Already optimized or not a valid URL
  if (url.includes("wsrv.nl")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp&q=80`;
}

/**
 * Optimize image URL for detail page hero/background (lower quality, larger size)
 * Used for blurred backgrounds where quality doesn't matter much.
 */
export function optimizeBg(url: string | undefined): string {
  if (!url) return "";
  if (url.includes("wsrv.nl")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=600&output=webp&q=40&blur=5`;
}

/**
 * Optimize image URL for detail page poster (high quality, larger size)
 */
export function optimizePoster(url: string | undefined, width = 600): string {
  if (!url) return "";
  if (url.includes("wsrv.nl")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=${width}&output=webp&q=85`;
}

/**
 * Optimize image URL for search result thumbnails (small, low quality)
 */
export function optimizeThumb(url: string | undefined): string {
  if (!url) return "";
  if (url.includes("wsrv.nl")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=128&h=192&fit=cover&output=webp&q=75`;
}

/**
 * Optimize image URL for banner images (wide, high quality)
 */
export function optimizeBanner(url: string | undefined): string {
  if (!url) return "";
  if (url.includes("wsrv.nl")) return url;
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=1200&output=webp&q=80`;
}
