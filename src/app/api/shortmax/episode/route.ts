import { safeJson, encryptedResponse } from "@/lib/api-utils";
import { NextRequest } from "next/server";

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api") + "/shortmax";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const shortPlayId = searchParams.get("shortPlayId");
    const episodeNumber = searchParams.get("episodeNumber");

    if (!shortPlayId || !episodeNumber) {
      return encryptedResponse(
        { success: false, error: "shortPlayId and episodeNumber are required" },
        400
      );
    }

    const response = await fetch(
      `${UPSTREAM_API}/get-episode?shortPlayId=${shortPlayId}&episodeNumber=${episodeNumber}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return encryptedResponse(
        { success: false, error: "Failed to fetch episode" }
      );
    }

    const data = await safeJson<any>(response);

    if (data.status !== "ok" || !data.episode) {
      return encryptedResponse(
        { success: false, error: "Episode not found" }
      );
    }

    const ep = data.episode;

    // Proxy-rewrite video URLs so they go through our HLS proxy for AES decryption
    const videoUrl: Record<string, string> = {};
    if (ep.videoUrl) {
      for (const [quality, url] of Object.entries(ep.videoUrl)) {
        if (typeof url === "string" && url) {
          videoUrl[quality] = `/api/shortmax/hls?url=${encodeURIComponent(url)}`;
        }
      }
    }

    return encryptedResponse({
      success: true,
      shortPlayId: data.shortPlayId,
      shortPlayName: data.shortPlayName,
      totalEpisodes: data.totalEpisodes,
      episode: {
        episodeNum: ep.episodeNumber || ep.episodeNum,
        id: ep.id,
        duration: ep.duration,
        locked: ep.locked,
        cover: ep.cover,
        videoUrl,
      },
    });
  } catch (error) {
    console.error("ShortMax Episode Error:", error);
    return encryptedResponse(
      { success: false, error: "Internal server error" }
    );
  }
}
