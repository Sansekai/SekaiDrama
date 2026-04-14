"use client";

import { useEffect, useRef } from "react";
import { UnifiedMediaCard } from "./UnifiedMediaCard";
import { UnifiedMediaCardSkeleton } from "./UnifiedMediaCardSkeleton";
import { UnifiedErrorDisplay } from "./UnifiedErrorDisplay";
import { useInfiniteGoodShortForYou } from "@/hooks/useGoodShort";
import { Loader2 } from "lucide-react";
import type { GoodShortItem } from "@/types/goodshort";

interface InfiniteGoodShortSectionProps {
  title?: string;
}

export function InfiniteGoodShortSection({ title = "Lainnya" }: InfiniteGoodShortSectionProps) {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    error,
    refetch,
  } = useInfiniteGoodShortForYou();

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

  // Flatten all pages → records → items into a single array
  const allItems: GoodShortItem[] = data?.pages.flatMap((page) => 
    page?.data?.records?.flatMap((record) => record.items || []) || []
  ) || [];

  // Deduplicate by bookId
  const seen = new Set<string>();
  const dramas = allItems.filter((item) => {
    if (seen.has(item.bookId)) return false;
    seen.add(item.bookId);
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
            key={`${drama.bookId}-${index}`} 
            index={index}
            title={drama.bookName}
            cover={drama.cover || ""}
            link={`/detail/goodshort/${drama.bookId}`}
            episodes={drama.chapterCount}

            topRightBadge={drama.viewCountDisplay ? {
              text: drama.viewCountDisplay,
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
