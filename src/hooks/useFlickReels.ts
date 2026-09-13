"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";
import { fetchJson } from "@/lib/fetcher";

export interface FlickReelsDrama {
  playletId: number;
  title: string;
  cover: string;
  totalEpisodes: number;
  hotNum?: string;
  tags?: string[];
}

export interface FlickReelsSearchResult {
  playletId: number;
  title: string;
  cover: string;
  totalEpisodes: number;
  tags: string[];
  description: string;
}

interface FlickReelsResponse {
  success: boolean;
  data: FlickReelsDrama[];
  total?: number;
}

interface FlickReelsForYouResponse {
  success: boolean;
  data: FlickReelsDrama[];
  page: number;
  isEnd: boolean;
  total?: number;
}

interface FlickReelsSearchResponse {
  success: boolean;
  data: FlickReelsSearchResult[];
  total?: number;
}

interface FlickReelsDetailResponse {
  success: boolean;
  playletId: string;
  title: string;
  cover: string;
  description: string;
  totalEpisodes: number;
  labels: string[];
  episodes: {
    id: string;
    name: string;
    num: number;
    unlock: boolean;
    duration: number;
  }[];
}

interface FlickReelsEpisodeResponse {
  success: boolean;
  playletId: string;
  title: string;
  episodeTitle: string;
  episodeNumber: number;
  totalDuration: number;
  hlsUrl: string;
}

export function useFlickReelsLatest() {
  return useQuery<FlickReelsResponse>({
    queryKey: ["flickreels", "latest"],
    queryFn: () => fetchJson<FlickReelsResponse>("/api/flickreels/latest"),
    staleTime: 5 * 60 * 1000,
  });
}

export function useInfiniteFlickReelsDramas() {
  return useInfiniteQuery<FlickReelsForYouResponse>({
    queryKey: ["flickreels", "foryou", "infinite"],
    queryFn: ({ pageParam = 1 }) =>
      fetchJson<FlickReelsForYouResponse>(`/api/flickreels/foryou?page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      if (lastPage.isEnd || allPages.length >= 50) return undefined;
      return allPages.length + 1;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useFlickReelsSearch(query: string) {
  return useQuery<FlickReelsSearchResponse>({
    queryKey: ["flickreels", "search", query],
    queryFn: () => fetchJson<FlickReelsSearchResponse>(`/api/flickreels/search?query=${encodeURIComponent(query)}`),
    enabled: query.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}

export function useFlickReelsDetail(playletId: string) {
  return useQuery<FlickReelsDetailResponse>({
    queryKey: ["flickreels", "detail", playletId],
    queryFn: () => fetchJson<FlickReelsDetailResponse>(`/api/flickreels/detail?playletId=${playletId}`),
    enabled: !!playletId,
    staleTime: 5 * 60 * 1000,
  });
}

export function useFlickReelsEpisode(playletId: string, episodeNumber: number) {
  return useQuery<FlickReelsEpisodeResponse>({
    queryKey: ["flickreels", "episode", playletId, episodeNumber],
    queryFn: () => fetchJson<FlickReelsEpisodeResponse>(
      `/api/flickreels/episode?playletId=${playletId}&episodeNumber=${episodeNumber}`
    ),
    enabled: !!playletId && episodeNumber > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export type { FlickReelsResponse, FlickReelsForYouResponse, FlickReelsSearchResponse, FlickReelsDetailResponse, FlickReelsEpisodeResponse };
