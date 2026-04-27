"use client";

import { UnifiedErrorDisplay } from "@/components/UnifiedErrorDisplay";
import { useDramaNovaDetail } from "@/hooks/useDramaNova";
import { Play, ChevronLeft, Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import { Skeleton } from "@/components/ui/skeleton";
import { optimizeBg, optimizePoster } from "@/lib/image-utils";

export default function DramaNovaDetailPage() {
  const params = useParams<{ bookId: string }>();
  const router = useRouter();
  const { data: drama, isLoading, error } = useDramaNovaDetail(params.bookId || "");

  if (isLoading) {
    return <DetailSkeleton />;
  }

  if (error || !drama) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <UnifiedErrorDisplay 
          title="Drama tidak ditemukan"
          message="Tidak dapat memuat detail drama. Silakan coba lagi."
          onRetry={() => router.push('/')}
          retryLabel="Kembali ke Beranda"
        />
      </div>
    );
  }

  const firstEpisode = drama.episodes?.[0];
  const firstEpisodeId = firstEpisode?.id;

  const rawPosterUrl = drama.posterImgUrl || drama.posterImg || "";

  return (
    <main className="min-h-screen pt-20">
      {/* Hero Section */}
      <div className="relative">
        {/* Background Blur */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={optimizeBg(rawPosterUrl)}
            alt=""
            className="w-full h-full object-cover opacity-20 blur-3xl scale-110"
            referrerPolicy="no-referrer"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-8">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Kembali</span>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
            <div className="relative group">
              <img
                src={optimizePoster(rawPosterUrl)}
                alt={drama.title}
                className="w-full max-w-[300px] mx-auto rounded-2xl shadow-2xl"
                referrerPolicy="no-referrer"
              />
              {firstEpisodeId && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                  <Link
                    href={`/watch/dramanova/${params.bookId}/${firstEpisodeId}`}
                    className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg"
                  >
                    <Play className="w-5 h-5 fill-current" />
                    Tonton Sekarang
                  </Link>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold font-display gradient-text mb-4">
                  {drama.title}
                </h1>
                
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                   <div className="flex items-center gap-1.5">
                    <Play className="w-4 h-4" />
                    <span>{drama.totalEpisodes} Episode</span>
                  </div>
                </div>

                 {drama.categories && drama.categories.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-4">
                      {drama.categories.map((cat, idx) => (
                        <span key={idx} className="tag-pill text-xs">
                          {cat.name}
                        </span>
                      ))}
                    </div>
                  )}
              </div>

               {/* Description */}
               <div className="glass rounded-xl p-4">
                <h3 className="font-semibold text-foreground mb-2">Sinopsis</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {drama.synopsis || drama.description}
                </p>
              </div>

              {/* Watch Button */}
              {firstEpisodeId && (
                <Link
                  href={`/watch/dramanova/${params.bookId}/${firstEpisodeId}`}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-primary-foreground transition-all hover:scale-105 shadow-lg"
                  style={{ background: "var(--gradient-primary)" }}
                >
                  <Play className="w-5 h-5 fill-current" />
                  Mulai Menonton
                </Link>
              )}
              
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}

function DetailSkeleton() {
  return (
    <main className="min-h-screen pt-24 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          <Skeleton className="aspect-[2/3] w-full max-w-[300px] rounded-2xl" />
          <div className="space-y-4">
            <Skeleton className="h-10 w-3/4" />
            <Skeleton className="h-6 w-1/2" />
            <Skeleton className="h-32 w-full rounded-xl" />
            <Skeleton className="h-12 w-48 rounded-full" />
          </div>
        </div>
      </div>
    </main>
  );
}
