import { safeJson, encryptedResponse } from "@/lib/api-utils";
import { optimizeCover } from "@/lib/image-utils";
import { NextRequest } from "next/server";

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api") + "/flickreels";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const playletId = searchParams.get("playletId");

    if (!playletId) {
      return encryptedResponse(
        { success: false, error: "playletId is required" },
        400
      );
    }

    const response = await fetch(`${UPSTREAM_API}/detail?playlet_id=${playletId}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return encryptedResponse(
        { success: false, error: "Failed to fetch detail" }
      );
    }

    const raw = await safeJson<any>(response);
    const data = raw.data || raw;
    const drama = data.drama || {};
    const episodes = Array.isArray(data.episodes) ? data.episodes : [];

    return encryptedResponse({
      success: true,
      playletId: playletId,
      title: drama.title,
      cover: optimizeCover(drama.cover),
      description: drama.description || "",
      totalEpisodes: drama.chapterCount || episodes.length,
      labels: drama.labels || [],
      episodes: episodes.map((ep: any) => ({
        id: ep.id,
        name: ep.name,
        num: ep.num,
        unlock: ep.unlock,
        duration: ep.raw?.duration || 0,
      })),
    });
  } catch (error) {
    console.error("FlickReels Detail Error:", error);
    return encryptedResponse(
      { success: false, error: "Internal server error" }
    );
  }
}
