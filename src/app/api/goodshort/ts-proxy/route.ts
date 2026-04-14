import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    const url = req.nextUrl.searchParams.get("url");

    if (!url) {
      return new NextResponse("url parameter is required", { status: 400 });
    }

    const res = await fetch(url, {
      headers: {
        "User-Agent": "okhttp/4.12.0",
      },
    });

    if (!res.ok) {
      return new NextResponse(`Upstream error: ${res.status}`, { status: res.status });
    }

    const contentType = res.headers.get("content-type") || "video/mp2t";
    const body = await res.arrayBuffer();

    return new NextResponse(body, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Access-Control-Allow-Origin": "*",
        "Cache-Control": "public, max-age=3600",
      },
    });
  } catch (error) {
    console.error("GoodShort TS proxy error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
