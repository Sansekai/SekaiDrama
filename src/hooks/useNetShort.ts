"use client";

import { useQuery, useInfiniteQuery } from "@tanstack/react-query";

interface NetShortDrama {
  shortPlayId: string;
  shortPlayLibraryId: string;
  title: string;
  cover: string;
  labels: string[];
  heatScore: string;
  scriptName?: string;
  totalEpisodes?: number;
}

interface NetShortGroup {
  groupId: string;
  groupName: string;
  contentRemark: string;
  dramas: NetShortDrama[];
}

interface TheatersResponse {
  success: boolean;
  data: NetShortGroup[];
}

interface ForYouResponse {
  success: boolean;
  data: NetShortDrama[];
  maxOffset?: number;
  completed?: boolean;
}

interface SearchResponse {
  success: boolean;
  data: NetShortDrama[];
}

interface NetShortEpisode {
  episodeId: string;
  episodeNo: number;
  cover: string;
  isLock: boolean;
  likeNums: string;
}

interface DetailResponse {
  success: boolean;
  shortPlayId: string;
  shortPlayLibraryId: string;
  title: string;
  cover: string;
  description: string;
  labels: string[];
  totalEpisodes: number;
  isFinish: boolean;
  payPoint: number;
  heatScore: string;
  episodes: NetShortEpisode[];
}

// Response from the separate episode endpoint (streaming data)
interface NetShortEpisodeStreamData {
  episodeId: string;
  episodeNo: number;
  videoUrl: string | null;
  quality: string;
  sdkVid: string | null;
  subtitleUrl: string | null;
  subtitleLanguage: string | null;
  unlockType: number | null;
}

interface EpisodeResponse {
  success: boolean;
  shortPlayId: string;
  episode: NetShortEpisodeStreamData;
  isMember: number;
}

import { fetchJson } from "@/lib/fetcher";

export function useNetShortTheaters() {
  return useQuery<TheatersResponse>({
    queryKey: ["netshort", "theaters"],
    queryFn: () => fetchJson<TheatersResponse>("/api/netshort/theaters"),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

export function useNetShortForYou(page = 1) {
  return useQuery<ForYouResponse>({
    queryKey: ["netshort", "foryou", page],
    queryFn: () => fetchJson<ForYouResponse>(`/api/netshort/foryou?page=${page}`),
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
}

export function useInfiniteNetShortDramas() {
  return useInfiniteQuery<ForYouResponse>({
    queryKey: ["netshort", "foryou", "infinite"],
    queryFn: ({ pageParam = 1 }) => fetchJson<ForYouResponse>(`/api/netshort/foryou?page=${pageParam}`),
    initialPageParam: 1,
    getNextPageParam: (lastPage, allPages) => {
      // Check API completed flag or page limit
      if (lastPage.completed || allPages.length >= 100) return undefined;
      return allPages.length + 1;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useNetShortSearch(query: string) {
  return useQuery<SearchResponse>({
    queryKey: ["netshort", "search", query],
    queryFn: () => fetchJson<SearchResponse>(`/api/netshort/search?query=${encodeURIComponent(query)}`),
    enabled: query.length > 0,
    staleTime: 2 * 60 * 1000,
  });
}

export function useNetShortDetail(shortPlayId: string) {
  return useQuery<DetailResponse>({
    queryKey: ["netshort", "detail", shortPlayId],
    queryFn: () => fetchJson<DetailResponse>(`/api/netshort/detail?shortPlayId=${shortPlayId}`),
    enabled: !!shortPlayId,
    staleTime: 5 * 60 * 1000,
  });
}

// Fetch streaming data for a single episode (video URL, subtitles)
// This is called on-demand when the user watches an episode
export function useNetShortEpisode(shortPlayId: string, episodeNumber: number) {
  return useQuery<EpisodeResponse>({
    queryKey: ["netshort", "episode", shortPlayId, episodeNumber],
    queryFn: () => fetchJson<EpisodeResponse>(
      `/api/netshort/episode?shortPlayId=${shortPlayId}&episodeNumber=${episodeNumber}`
    ),
    enabled: !!shortPlayId && episodeNumber > 0,
    staleTime: 5 * 60 * 1000,
  });
}

export type { NetShortDrama, NetShortGroup, NetShortEpisode, DetailResponse, EpisodeResponse, NetShortEpisodeStreamData };
