"use client";

import { useEffect, useRef } from "react";
import { UnifiedMediaCard } from "./UnifiedMediaCard";
import { UnifiedMediaCardSkeleton } from "./UnifiedMediaCardSkeleton";
import { UnifiedErrorDisplay } from "./UnifiedErrorDisplay";
import { useInfinitePineDramaForYou, formatViews } from "@/hooks/usePineDrama";
import { Loader2 } from "lucide-react";
import type { PineDramaCollection } from "@/types/pinedrama";

interface InfinitePineDramaSectionProps {
  title?: string;
}

export function InfinitePineDramaSection({ title = "Lainnya" }: InfinitePineDramaSectionProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error,
    refetch,
  } = useInfinitePineDramaForYou();

  const loadMoreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (status === "pending") {
    return (
      <section className="space-y-4">
        <div className="h-7 md:h-8 w-48 bg-white/10 rounded-lg animate-pulse mb-4" />
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
          {Array.from({ length: 16 }).map((_, i) => (
            <UnifiedMediaCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  if (status === "error") {
    return (
      <section>
        <h2 className="font-display font-bold text-xl md:text-2xl text-foreground mb-4">
          {title}
        </h2>
        <UnifiedErrorDisplay 
          title={`Gagal Memuat ${title}`}
          message={error?.message || "Terjadi kesalahan"}
          onRetry={() => refetch()}
        />
      </section>
    );
  }

  // Flatten all pages' collections into a single array
  const allItems: PineDramaCollection[] = data?.pages.flatMap((page) => 
    page?.collections || []
  ) || [];

  // Deduplicate by collection_id
  const seen = new Set<string>();
  const dramas = allItems.filter((item) => {
    if (seen.has(item.collection_id)) return false;
    seen.add(item.collection_id);
    return true;
  });

  if (dramas.length === 0) {
    return null;
  }

  return (
    <section>
      <h2 className="font-display font-bold text-xl md:text-2xl text-foreground mb-4">
        {title}
      </h2>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
        {dramas.map((drama, index) => (
          <UnifiedMediaCard 
            key={`${drama.collection_id}-${index}`} 
            index={index}
            title={drama.title}
            cover={drama.cover || ""}
            link={`/detail/pinedrama/${drama.collection_id}`}
            episodes={drama.total_episodes}

            topLeftBadge={
              drama.label_hot ? { text: "HOT", color: "#E52E2E" } :
              drama.label_new ? { text: "NEW", color: "#22C55E" } :
              null
            }

            topRightBadge={drama.views ? {
              text: formatViews(drama.views),
              isTransparent: true,
            } : null}
          />
        ))}
      </div>

      {/* Loading trigger for infinite scroll */}
      <div ref={loadMoreRef} className="py-8 flex justify-center w-full">
        {isFetchingNextPage ? (
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 md:w-10 md:h-10 animate-spin text-primary" />
            <p className="text-sm md:text-base text-muted-foreground font-medium animate-pulse">Memuat lebih banyak...</p>
          </div>
        ) : hasNextPage ? (
          <div className="h-4" /> // Invisible trigger
        ) : (
          <div className="mt-8 pt-8 text-center border-t border-white/5 pb-8">
            <p className="text-sm md:text-base text-muted-foreground font-medium">Semua data telah dimuat</p>
          </div>
        )}
      </div>
    </section>
  );
}
