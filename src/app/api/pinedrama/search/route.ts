import { NextRequest } from "next/server";
import { encryptedResponse } from "@/lib/api-utils";

const UPSTREAM_API = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api";

export async function GET(req: NextRequest) {
  try {
    const query = req.nextUrl.searchParams.get("query") || "";

    if (!query.trim()) {
      return encryptedResponse({ results: [] });
    }

    const res = await fetch(
      `${UPSTREAM_API}/pinedrama/search?query=${encodeURIComponent(query)}`,
      {
        headers: {
          "User-Agent": "okhttp/4.12.0",
        },
      }
    );

    if (!res.ok) {
      throw new Error(`Failed to fetch pinedrama search: ${res.status}`);
    }

    const data = await res.json();
    return encryptedResponse(data);
  } catch (error) {
    console.error("PineDrama search fetch error:", error);
    return encryptedResponse(
      { status: 500, message: "Failed to search PineDrama", data: null },
      500
    );
  }
}
