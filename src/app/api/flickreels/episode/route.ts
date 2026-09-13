import { safeJson, encryptedResponse } from "@/lib/api-utils";
import { optimizeCover } from "@/lib/image-utils";
import { NextRequest } from "next/server";

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api") + "/flickreels";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const playletId = searchParams.get("playletId");
    const episodeNumber = searchParams.get("episodeNumber");

    if (!playletId || !episodeNumber) {
      return encryptedResponse(
        { success: false, error: "playletId and episodeNumber are required" },
        400
      );
    }

    const response = await fetch(
      `${UPSTREAM_API}/get-episode?playlet_id=${playletId}&episodeNumber=${episodeNumber}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return encryptedResponse(
        { success: false, error: "Failed to fetch episode" }
      );
    }

    const data = await safeJson<any>(response);
    const ep = data?.data;

    if (!ep) {
      return encryptedResponse(
        { success: false, error: "Episode not found" }
      );
    }

    return encryptedResponse({
      success: true,
      playletId: playletId,
      title: ep.playlet_title || "",
      episodeTitle: ep.chapter_title || "",
      episodeNumber: ep.chapter_num,
      totalDuration: ep.total_duration || 0,
      hlsUrl: ep.hls_url ? `/api/flickreels/hls?url=${encodeURIComponent(ep.hls_url)}` : "",
    });
  } catch (error) {
    console.error("FlickReels Episode Error:", error);
    return encryptedResponse(
      { success: false, error: "Internal server error" }
    );
  }
}
