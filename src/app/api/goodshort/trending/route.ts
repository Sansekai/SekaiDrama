import { encryptedResponse } from "@/lib/api-utils";

const UPSTREAM_API = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api";

export async function GET() {
  try {
    const res = await fetch(`${UPSTREAM_API}/goodshort/trending`, {
      headers: {
        "User-Agent": "okhttp/4.12.0",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch goodshort trending: ${res.status}`);
    }

    const data = await res.json();
    return encryptedResponse(data);
  } catch (error) {
    console.error("GoodShort trending fetch error:", error);
    return encryptedResponse(
      { status: 500, message: "Failed to fetch from GoodShort", data: null },
      500
    );
  }
}
