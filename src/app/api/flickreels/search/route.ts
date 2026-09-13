import { safeJson, encryptedResponse } from "@/lib/api-utils";
import { optimizeCover } from "@/lib/image-utils";
import { NextRequest } from "next/server";

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api") + "/flickreels";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const query = searchParams.get("query");

    if (!query || !query.trim()) {
      return encryptedResponse({ success: true, data: [] });
    }

    const response = await fetch(
      `${UPSTREAM_API}/search?query=${encodeURIComponent(query)}`,
      { cache: "no-store" }
    );

    if (!response.ok) {
      return encryptedResponse({ success: true, data: [], total: 0 });
    }

    const data = await safeJson<any>(response);
    const items = Array.isArray(data?.data) ? data.data : [];

    const results = items.map((item: any) => ({
      playletId: item.playlet_id,
      title: item.title,
      cover: optimizeCover(item.cover),
      totalEpisodes: item.upload_num || 0,
      tags: (item.tag_list || []).map((t: any) => t.tag_name),
      description: item.introduce || "",
    }));

    return encryptedResponse({
      success: true,
      data: results,
      total: results.length,
    });
  } catch (error) {
    console.error("FlickReels Search Error:", error);
    return encryptedResponse({ success: true, data: [], total: 0 });
  }
}
