"use client";

import { PineDramaSection } from "./PineDramaSection";
import { InfinitePineDramaSection } from "./InfinitePineDramaSection";
import { usePineDramaTrending } from "@/hooks/usePineDrama";

export function PineDramaHome() {
  const { 
    data: trendingData, 
    isLoading: loadingTrending, 
    error: errorTrending, 
    refetch: refetchTrending 
  } = usePineDramaTrending();

  return (
    <div className="space-y-8 animate-fade-up">
      <PineDramaSection
        title="Trending"
        dramas={trendingData}
        isLoading={loadingTrending}
        error={!!errorTrending}
        onRetry={() => refetchTrending()}
      />
      <InfinitePineDramaSection title="Lainnya" />
    </div>
  );
}
