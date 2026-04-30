import { encryptedResponse } from "@/lib/api-utils";

const UPSTREAM_API = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const collectionId = searchParams.get("collection_id");
    const episodeNumber = searchParams.get("episodeNumber");

    if (!collectionId || !episodeNumber) {
      return encryptedResponse(
        { status: 400, message: "collection_id and episodeNumber are required", data: null },
        400
      );
    }

    const targetUrl = new URL(`${UPSTREAM_API}/pinedrama/episode`);
    targetUrl.searchParams.set("collection_id", collectionId);
    targetUrl.searchParams.set("episodeNumber", episodeNumber);

    const res = await fetch(targetUrl.toString(), {
      headers: {
        "User-Agent": "okhttp/4.12.0",
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch pinedrama episode: ${res.status}`);
    }

    const data = await res.json();
    return encryptedResponse(data);
  } catch (error) {
    console.error("PineDrama episode fetch error:", error);
    return encryptedResponse(
      { status: 500, message: "Failed to fetch episode from PineDrama", data: null },
      500
    );
  }
}
