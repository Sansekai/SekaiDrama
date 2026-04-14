import { encryptedResponse } from "@/lib/api-utils";

const UPSTREAM_API = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const bookId = searchParams.get("bookId");

    if (!bookId) {
      return encryptedResponse({ status: 400, message: "bookId is required", data: null }, 400);
    }

    const targetUrl = new URL(`${UPSTREAM_API}/goodshort/detail`);
    targetUrl.searchParams.set("bookId", bookId);

    const res = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent": "okhttp/4.12.0",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch goodshort detail: ${res.status}`);
    }

    const data = await res.json();
    return encryptedResponse(data);
  } catch (error) {
    console.error("GoodShort detail fetch error:", error);
    return encryptedResponse(
      { status: 500, message: "Failed to fetch detail from GoodShort", data: null },
      500
    );
  }
}
