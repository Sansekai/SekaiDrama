"use client";

import { UnifiedMediaCard } from "./UnifiedMediaCard";
import { UnifiedMediaCardSkeleton } from "./UnifiedMediaCardSkeleton";
import { UnifiedErrorDisplay } from "./UnifiedErrorDisplay";
import { formatViews } from "@/hooks/usePineDrama";
import type { PineDramaCollection } from "@/types/pinedrama";

interface PineDramaSectionProps {
  title: string;
  dramas?: PineDramaCollection[];
  isLoading?: boolean;
  error?: boolean;
  onRetry?: () => void;
}

export function PineDramaSection({ title, dramas, isLoading, error, onRetry }: PineDramaSectionProps) {
  if (error) {
    return (
      <section>
        <h2 className="font-display font-bold text-xl md:text-2xl text-foreground mb-4">
          {title}
        </h2>
        <UnifiedErrorDisplay 
          title={`Gagal Memuat ${title}`}
          message="Tidak dapat mengambil data drama."
          onRetry={onRetry}
        />
      </section>
    );
  }

  if (isLoading) {
    return (
      <section className="space-y-4">
        <div className="h-7 md:h-8 w-48 bg-white/10 rounded-lg animate-pulse mb-4" />
        
        <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
          {Array.from({ length: 12 }).map((_, i) => (
            <UnifiedMediaCardSkeleton key={i} />
          ))}
        </div>
      </section>
    );
  }

  return (
    <section>
      <h2 className="font-display font-bold text-xl md:text-2xl text-foreground mb-4">
        {title}
      </h2>

      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-3 md:gap-4">
        {dramas?.map((drama, index) => (
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
    </section>
  );
}
