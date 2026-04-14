import { encryptedResponse } from "@/lib/api-utils";

const UPSTREAM_API = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";

    const targetUrl = new URL(`${UPSTREAM_API}/goodshort/search`);
    targetUrl.searchParams.set("query", query);

    const res = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent": "okhttp/4.12.0",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch goodshort search: ${res.status}`);
    }

    const data = await res.json();
    return encryptedResponse(data);
  } catch (error) {
    console.error("GoodShort search fetch error:", error);
    return encryptedResponse(
      { status: 500, message: "Failed to fetch search from GoodShort", data: null },
      500
    );
  }
}
