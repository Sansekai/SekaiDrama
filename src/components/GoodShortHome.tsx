"use client";

import { GoodShortSection } from "./GoodShortSection";
import { InfiniteGoodShortSection } from "./InfiniteGoodShortSection";
import { useGoodShortLatest, useGoodShortTrending } from "@/hooks/useGoodShort";

export function GoodShortHome() {
  const { 
    data: latestData, 
    isLoading: loadingLatest, 
    error: errorLatest, 
    refetch: refetchLatest 
  } = useGoodShortLatest();

  const { 
    data: trendingData, 
    isLoading: loadingTrending, 
    error: errorTrending, 
    refetch: refetchTrending 
  } = useGoodShortTrending();

  return (
    <div className="space-y-8 animate-fade-up">
      <GoodShortSection
        title="Terbaru"
        dramas={latestData}
        isLoading={loadingLatest}
        error={!!errorLatest}
        onRetry={() => refetchLatest()}
      />
      <GoodShortSection
        title="Trending"
        dramas={trendingData}
        isLoading={loadingTrending}
        error={!!errorTrending}
        onRetry={() => refetchTrending()}
      />
      <InfiniteGoodShortSection title="Lainnya" />
    </div>
  );
}
