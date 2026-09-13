import { NextRequest } from "next/server";

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// ── Fetch with redirect support ─────────────────────────────────
function fetchBuffer(url: string, redirectCount = 5): Promise<{ buffer: Buffer; finalUrl: string }> {
  return new Promise((resolve, reject) => {
    if (redirectCount <= 0) return reject(new Error("Too many redirects"));
    const isHttp = url.startsWith("http:");
    const mod = isHttp ? require("http") : require("https");
    const agent = isHttp ? undefined : new (require("https").Agent)({ rejectUnauthorized: false });
    const req = mod.request(url, {
      method: 'GET',
      agent,
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': '*/*',
        'Accept-Encoding': 'identity',
      },
      timeout: 30000,
    }, (res: any) => {
      if (res.statusCode && [301, 302, 303, 307, 308].includes(res.statusCode) && res.headers.location) {
        const newUrl = new URL(res.headers.location, url).href;
        res.resume();
        return resolve(fetchBuffer(newUrl, redirectCount - 1));
      }
      if ((res.statusCode || 500) >= 400) {
        res.resume();
        return reject(new Error(`Upstream ${res.statusCode}`));
      }
      const chunks: Buffer[] = [];
      res.on('data', (c: Buffer) => chunks.push(c));
      res.on('end', () => resolve({ buffer: Buffer.concat(chunks), finalUrl: url }));
      res.on('error', reject);
    });
    req.on('timeout', () => { req.destroy(); reject(new Error('Timeout')); });
    req.on('error', reject);
    req.end();
  });
}

// ── Main handler ────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get("url");

  if (!urlParam) {
    return new Response("Missing url parameter", { status: 400 });
  }

  try {
    const { buffer, finalUrl } = await fetchBuffer(urlParam);
    const lowUrl = finalUrl.toLowerCase();
    const isM3u8 = lowUrl.includes('.m3u8') || buffer.slice(0, 7).toString().includes('#EXTM3U');
    const isTs = lowUrl.includes('.ts');

    // ── M3U8: rewrite segment URLs to go through this proxy ──
    if (isM3u8) {
      const text = buffer.toString('utf8');
      const baseUrl = new URL(finalUrl);
      const host = req.headers.get("x-forwarded-host") || req.headers.get("host");
      const proto = req.headers.get("x-forwarded-proto") || "http";
      const origin = `${proto}://${host}`;

      const rewritten = text.split(/\r?\n/).map(line => {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
          // Rewrite URI="" attributes in #EXT tags (e.g. #EXT-X-KEY)
          return line.replace(/URI="([^"]+)"/g, (_m: string, uri: string) => {
            try {
              const abs = new URL(uri, baseUrl.href).href;
              return `URI="${origin}/api/flickreels/hls?url=${encodeURIComponent(abs)}"`;
            } catch { return _m; }
          });
        }
        // Segment or playlist URL line
        try {
          const abs = new URL(trimmed, baseUrl.href).href;
          return `${origin}/api/flickreels/hls?url=${encodeURIComponent(abs)}`;
        } catch { return line; }
      }).join('\n');

      return new Response(rewritten, {
        status: 200,
        headers: {
          "Content-Type": "application/vnd.apple.mpegurl",
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "no-store",
        },
      });
    }

    // ── .ts segment: pass through ──
    if (isTs) {
      return new Response(new Uint8Array(buffer), {
        status: 200,
        headers: {
          "Content-Type": "video/mp2t",
          "Content-Length": String(buffer.length),
          "Access-Control-Allow-Origin": "*",
          "Cache-Control": "public, max-age=3600",
        },
      });
    }

    // ── Fallback: pass through ──
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": "application/octet-stream",
        "Content-Length": String(buffer.length),
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[FLICKREELS HLS Proxy Error]", error);
    return new Response(`Proxy error: ${error}`, { status: 502 });
  }
}
