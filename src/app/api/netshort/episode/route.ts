import { safeJson, encryptedResponse } from "@/lib/api-utils";
import { NextRequest } from "next/server";

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api") + "/netshort";

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
      `${UPSTREAM_API}/episode?shortPlayId=${shortPlayId}&episodeNumber=${episodeNumber}`,
      { cache: 'no-store' }
    );

    if (!response.ok) {
      return encryptedResponse(
        { success: false, error: "Failed to fetch episode" }
      );
    }

    const data = await safeJson<any>(response);

    // The episode endpoint returns { episodeList: [...], isMember, ... }
    // episodeList typically has one item for the requested episode
    const ep = data.episodeList?.[0];

    if (!ep) {
      return encryptedResponse(
        { success: false, error: "Episode not found" }
      );
    }

    return encryptedResponse({
      success: true,
      shortPlayId,
      episode: {
        episodeId: ep.episodeId,
        episodeNo: ep.episodeNo,
        videoUrl: ep.playVoucher || ep.playVoucherBak || null,
        quality: ep.playClarity || "720p",
        sdkVid: ep.sdkVid || null,
        // subtitleList can be null — handle gracefully
        subtitleUrl: ep.subtitleList?.[0]?.url || null,
        subtitleLanguage: ep.subtitleList?.[0]?.subtitleLanguage || null,
        unlockType: ep.unlockType,
      },
      isMember: data.isMember,
    });
  } catch (error) {
    console.error("NetShort Episode Error:", error);
    return encryptedResponse(
      { success: false, error: "Internal server error" }
    );
  }
}
