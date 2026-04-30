import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import type { PineDramaResponse } from "@/types/pinedrama";
import { decryptData } from "@/lib/crypto";

// Helper: format view count (e.g., 365886615 → "365.9M")
export function formatViews(views: number): string {
  if (views >= 1_000_000_000) {
    return `${(views / 1_000_000_000).toFixed(1)}B`;
  }
  if (views >= 1_000_000) {
    return `${(views / 1_000_000).toFixed(1)}M`;
  }
  if (views >= 1_000) {
    return `${(views / 1_000).toFixed(1)}K`;
  }
  return views.toString();
}

// Fetch "Trending" (both pages merged server-side)
export function usePineDramaTrending() {
  return useQuery({
    queryKey: ["pinedrama", "trending"],
    queryFn: async () => {
      const res = await fetch("/api/pinedrama/trending");
      if (!res.ok) throw new Error("Gagal mengambil data Trending");
      const resJson = await res.json();
      const data: PineDramaResponse = decryptData(resJson.data);
      return data.collections || [];
    },
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch "Lainnya" with infinite scroll (cursor-based, max 10 pages)
const MAX_FORYOU_PAGES = 10;

export function useInfinitePineDramaForYou() {
  return useInfiniteQuery({
    queryKey: ["pinedrama", "foryou"],
    queryFn: async ({ pageParam = "1" }: { pageParam: string }) => {
      const res = await fetch(`/api/pinedrama/foryou?cursor=${encodeURIComponent(pageParam)}`);
      if (!res.ok) throw new Error("Gagal mengambil data Lainnya");
      const resJson = await res.json();
      const data: PineDramaResponse = decryptData(resJson.data);
      return data;
    },
    initialPageParam: "1",
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage?.has_more || allPages.length >= MAX_FORYOU_PAGES) {
        return undefined;
      }
      return lastPage.cursor;
    },
  });
}

// Fetch Search
export function usePineDramaSearch(query: string) {
  return useQuery({
    queryKey: ["pinedrama", "search", query],
    queryFn: async () => {
      if (!query) return [];
      const res = await fetch(`/api/pinedrama/search?query=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error("Gagal mengambil data search");
      const resJson = await res.json();
      const data = decryptData<any>(resJson.data);
      return data?.results || [];
    },
    enabled: !!query,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch Detail
export function usePineDramaDetail(collectionId: string) {
  return useQuery({
    queryKey: ["pinedrama", "detail", collectionId],
    queryFn: async () => {
      if (!collectionId) throw new Error("Collection ID tidak diberikan");
      const res = await fetch(`/api/pinedrama/detail?collection_id=${encodeURIComponent(collectionId)}`);
      if (!res.ok) throw new Error("Gagal mengambil data detail");
      const resJson = await res.json();
      return decryptData<any>(resJson.data);
    },
    enabled: !!collectionId,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch Episode (for watch page)
export function usePineDramaEpisode(collectionId: string, episodeNumber: number) {
  return useQuery({
    queryKey: ["pinedrama", "episode", collectionId, episodeNumber],
    queryFn: async () => {
      if (!collectionId || !episodeNumber) throw new Error("Parameter tidak lengkap");
      const res = await fetch(
        `/api/pinedrama/episode?collection_id=${encodeURIComponent(collectionId)}&episodeNumber=${episodeNumber}`
      );
      if (!res.ok) throw new Error("Gagal mengambil data episode");
      const resJson = await res.json();
      return decryptData<any>(resJson.data);
    },
    enabled: !!collectionId && episodeNumber > 0,
    staleTime: 5 * 60 * 1000,
  });
}
