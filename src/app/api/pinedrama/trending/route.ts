import { encryptedResponse } from "@/lib/api-utils";

const UPSTREAM_API = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api";
const HEADERS = { "User-Agent": "okhttp/4.12.0" };

export async function GET() {
  try {
    // Page 1
    const res1 = await fetch(`${UPSTREAM_API}/pinedrama/trending?cursor=1`, { headers: HEADERS });
    if (!res1.ok) throw new Error(`Failed to fetch pinedrama trending page 1: ${res1.status}`);
    const page1 = await res1.json();

    const allCollections = [...(page1.collections || [])];

    // Page 2 — use cursor from page 1
    if (page1.has_more && page1.cursor) {
      const res2 = await fetch(
        `${UPSTREAM_API}/pinedrama/trending?cursor=${encodeURIComponent(page1.cursor)}`,
        { headers: HEADERS }
      );
      if (res2.ok) {
        const page2 = await res2.json();
        allCollections.push(...(page2.collections || []));
      }
    }

    return encryptedResponse({
      has_more: false,
      cursor: null,
      collections: allCollections,
    });
  } catch (error) {
    console.error("PineDrama trending fetch error:", error);
    return encryptedResponse(
      { status: 500, message: "Failed to fetch from PineDrama", data: null },
      500
    );
  }
}
