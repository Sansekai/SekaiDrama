import { NextRequest, NextResponse } from "next/server";

const UPSTREAM_API = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
      return new NextResponse("url parameter is required", { status: 400 });
    }

    const targetUrl = `${UPSTREAM_API}/goodshort/decrypt-stream?url=${encodeURIComponent(url)}`;

    const res = await fetch(targetUrl, {
      headers: {
        "User-Agent": "okhttp/4.12.0",
      },
    });

    if (!res.ok) {
      return new NextResponse(`Upstream error: ${res.status}`, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "application/vnd.apple.mpegurl";
    let body = await res.text();

    // Rewrite segment URLs in the m3u8 to go through our proxy
    // Replace direct CDN URLs and decrypt-ts URLs with our local proxy
    body = body.replace(
      /^(https?:\/\/.+)$/gm,
      (match) => {
        // Proxy all segment URLs through our ts-proxy endpoint
        return `/api/goodshort/ts-proxy?url=${encodeURIComponent(match)}`;
      }
    );

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "no-cache",
      },
    });
  } catch (error) {
    console.error("GoodShort stream proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
