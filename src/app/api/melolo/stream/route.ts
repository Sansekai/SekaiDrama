
import { type NextRequest } from "next/server";
import { encryptedResponse, safeJson } from "@/lib/api-utils";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const videoId = searchParams.get("videoId") || searchParams.get("video_id");

  if (!videoId) {
    return encryptedResponse({ error: "Missing videoId" }, 400);
  }

  try {
    const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api";
    const response = await fetch(`${baseUrl}/melolo/get-episode?videoId=${encodeURIComponent(videoId)}`, { cache: 'no-store' });
    
    if (!response.ok) {
      return encryptedResponse({ error: "Failed to fetch episode data" }, response.status);
    }

    const data = await safeJson<any>(response);

    // Ensure http:// in streamUrl is upgraded to https:// for sansekai.my.id to prevent mixed content issues
    const fixUrl = (urlStr: string) => {
      if (typeof urlStr === "string" && urlStr.startsWith("http://api.sansekai.my.id")) {
        return urlStr.replace("http://api.sansekai.my.id", "https://api.sansekai.my.id");
      }
      return urlStr;
    };

    if (data?.streamUrl) {
      data.streamUrl = fixUrl(data.streamUrl);
    }

    if (Array.isArray(data?.qualities)) {
      data.qualities = data.qualities.map((q: any) => {
        if (q?.streamUrl) {
          return { ...q, streamUrl: fixUrl(q.streamUrl) };
        }
        return q;
      });
    }

    return encryptedResponse(data);
  } catch (error) {
    console.error("Error fetching Melolo episode stream:", error);
    return encryptedResponse({ error: "Failed to fetch stream data" }, 500);
  }
}
