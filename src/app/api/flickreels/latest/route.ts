import { safeJson, encryptedResponse } from "@/lib/api-utils";
import { optimizeCover } from "@/lib/image-utils";
import { NextRequest } from "next/server";

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api") + "/flickreels";

export async function GET(_request: NextRequest) {
  try {
    const response = await fetch(`${UPSTREAM_API}/latest`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return encryptedResponse({ success: false, data: [], total: 0 });
    }

    const data = await safeJson<any>(response);
    const list = data?.data?.[0]?.list || [];

    const dramas = list
      .filter((item: any) => item && item.playlet_id !== 0 && item.playlet_id !== "0")
      .map((item: any) => ({
        playletId: item.playlet_id,
        title: item.title,
        cover: optimizeCover(item.cover),
        totalEpisodes: parseInt(item.upload_num) || 0,
        hotNum: item.hot_num || "",
        tags: item.playlet_tag_name || [],
      }));

    return encryptedResponse({
      success: true,
      data: dramas,
      total: dramas.length,
    });
  } catch (error) {
    console.error("FlickReels Latest Error:", error);
    return encryptedResponse({ success: false, data: [], total: 0 });
  }
}
