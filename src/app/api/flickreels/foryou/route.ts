import { safeJson, encryptedResponse } from "@/lib/api-utils";
import { optimizeCover } from "@/lib/image-utils";
import { NextRequest } from "next/server";

const UPSTREAM_API = (process.env.NEXT_PUBLIC_API_BASE_URL || "https://api.sansekai.my.id/api") + "/flickreels";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const page = searchParams.get("page") || "1";

    const response = await fetch(`${UPSTREAM_API}/foryou?page=${page}`, {
      cache: "no-store",
    });

    if (!response.ok) {
      return encryptedResponse({
        success: false,
        data: [],
        page: Number(page),
        isEnd: true,
        total: 0,
      });
    }

    const data = await safeJson<any>(response);
    const list = data?.data?.list || [];

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
      page: Number(page),
      isEnd: dramas.length === 0 || Number(page) >= 50,
      total: dramas.length,
    });
  } catch (error) {
    console.error("FlickReels ForYou Error:", error);
    return encryptedResponse({
      success: false,
      data: [],
      page: 1,
      isEnd: true,
      total: 0,
    });
  }
}
