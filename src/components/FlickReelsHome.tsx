"use client";

import { useFlickReelsLatest } from "@/hooks/useFlickReels";
import { UnifiedMediaCard } from "./UnifiedMediaCard";
import { UnifiedMediaCardSkeleton } from "./UnifiedMediaCardSkeleton";
import { UnifiedErrorDisplay } from "./UnifiedErrorDisplay";
import { InfiniteFlickReelsSection } from "./InfiniteFlickReelsSection";

export function FlickReelsHome() {
  const {
    data: latestData,
    isLoading: loadingLatest,
    error: errorLatest,
    refetch: refetchLatest,
  } = useFlickReelsLatest();

  return (
    <div className="space-y-10 animate-fade-in pb-12">
      {/* Terbaru Section */}
      <section>
        {errorLatest || (!loadingLatest && (!latestData?.data || latestData.data.length === 0)) ? (
          <>
            <h2 className="font-display font-bold text-xl md:text-2xl text-foreground mb-4">
              Terbaru
            </h2>
            <UnifiedErrorDisplay
              title="Gagal Memuat Drama Terbaru"
              message="Tidak dapat mengambil data drama."
              onRetry={() => refetchLatest()}
            />
          </>
        ) : loadingLatest ? (
          <>
            <div className="h-7 md:h-8 w-48 bg-white/10 rounded-lg animate-pulse mb-4" />
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <UnifiedMediaCardSkeleton key={i} index={i} />
              ))}
            </div>
          </>
        ) : (
          <>
            <h2 className="font-display font-bold text-xl md:text-2xl text-foreground mb-4">
              Terbaru
            </h2>
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
              {latestData!.data.map((drama, index) => (
                <UnifiedMediaCard
                  key={`latest-${drama.playletId}-${index}`}
                  index={index}
                  title={drama.title}
                  cover={drama.cover}
                  link={`/detail/flickreels/${drama.playletId}`}
                  episodes={drama.totalEpisodes}
                />
              ))}
            </div>
          </>
        )}
      </section>

      {/* Infinite Scroll Section */}
      <InfiniteFlickReelsSection title="Lainnya" />
    </div>
  );
}
