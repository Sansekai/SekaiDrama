import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import type { GoodShortRankListResponse, GoodShortForYouResponse, GoodShortItem } from "@/types/goodshort";
import { decryptData } from "@/lib/crypto";

// Helper: Extract items from the rank list response (data -> records[0] -> items)
function extractRankItems(data: GoodShortRankListResponse): GoodShortItem[] {
  if (!data?.data?.records?.[0]?.items) return [];
  return data.data.records[0].items;
}

// Fetch "Terbaru" (Latest)
export function useGoodShortLatest() {
  return useQuery({
    queryKey: ["goodshort", "latest"],
    queryFn: async () => {
      const res = await fetch("/api/goodshort/latest");
      if (!res.ok) throw new Error("Gagal mengambil data Terbaru");
      const resJson = await res.json();
      const data: GoodShortRankListResponse = decryptData(resJson.data);
      return extractRankItems(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch "Trending"
export function useGoodShortTrending() {
  return useQuery({
    queryKey: ["goodshort", "trending"],
    queryFn: async () => {
      const res = await fetch("/api/goodshort/trending");
      if (!res.ok) throw new Error("Gagal mengambil data Trending");
      const resJson = await res.json();
      const data: GoodShortRankListResponse = decryptData(resJson.data);
      return extractRankItems(data);
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch "Lainnya" with infinite scroll (max 50 pages)
export function useInfiniteGoodShortForYou() {
  return useInfiniteQuery({
    queryKey: ["goodshort", "foryou"],
    queryFn: async ({ pageParam = 1 }: { pageParam: number }) => {
      const res = await fetch(`/api/goodshort/foryou?page=${pageParam}`);
      if (!res.ok) throw new Error("Gagal mengambil data For You");
      const resJson = await res.json();
      const data: GoodShortForYouResponse = decryptData(resJson.data);
      return data;
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.data?.records || lastPage.data.records.length === 0 || allPages.length >= 50) {
        return undefined;
      }
      // Check if current page < total pages
      if (lastPage.data.current < lastPage.data.pages) {
        return allPages.length + 1;
      }
      return undefined;
    },
  });
}

// Fetch Search
export function useGoodShortSearch(query: string) {
  return useQuery({
    queryKey: ["goodshort", "search", query],
    queryFn: async () => {
      if (!query) return [];
      const res = await fetch(`/api/goodshort/search?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Gagal mengambil data search");
      const resJson = await res.json();
      const data = decryptData<any>(resJson.data);
      return data?.data?.searchResult?.records || [];
    },
    enabled: !!query,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch Detail
export function useGoodShortDetail(bookId: string) {
  return useQuery({
    queryKey: ["goodshort", "detail", bookId],
    queryFn: async () => {
      if (!bookId) throw new Error("Book ID tidak diberikan");
      const res = await fetch(`/api/goodshort/detail?bookId=${encodeURIComponent(bookId)}`);
      if (!res.ok) throw new Error("Gagal mengambil data detail");
      const resJson = await res.json();
      const data = decryptData<any>(resJson.data);
      return data?.data;
    },
    enabled: !!bookId,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch All Episodes (for watch page)
export function useGoodShortEpisodes(bookId: string) {
  return useQuery({
    queryKey: ["goodshort", "allepisode", bookId],
    queryFn: async () => {
      if (!bookId) throw new Error("Book ID tidak diberikan");
      const res = await fetch(`/api/goodshort/allepisode?bookId=${encodeURIComponent(bookId)}`);
      if (!res.ok) throw new Error("Gagal mengambil data episode");
      const resJson = await res.json();
      const data = decryptData<any>(resJson.data);
      return data?.data;
    },
    enabled: !!bookId,
    staleTime: 5 * 60 * 1000,
  });
}

