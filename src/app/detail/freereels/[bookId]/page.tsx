
"use client";

import { useFreeReelsDetail } from "@/hooks/useFreeReels";
import { useParams, useRouter } from "next/navigation";
import { Play, ChevronLeft } from "lucide-react";
import Link from "next/link";
import { Skeleton } from "@/components/ui/skeleton";
import { UnifiedErrorDisplay } from "@/components/UnifiedErrorDisplay";
import { optimizeBg, optimizePoster } from "@/lib/image-utils";

export default function FreeReelsDetailPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;

  const { data, isLoading, error, refetch } = useFreeReelsDetail(bookId);

  if (isLoading) {
    return <DetailSkeleton />;
  }

  // Handle optional chaining safely since data might be partial
  if (error || !data || !data.data) {
    return (
      <div className="min-h-screen pt-24 px-4">
        <UnifiedErrorDisplay 
          title="Gagal Memuat Drama"
          message={error ? "Drama tidak ditemukan atau terjadi kesalahan server." : "Data tidak tersedia."}
          onRetry={() => refetch()} 
        />
      </div>
    );
  }

  const drama = data.data;
  // Fallback for episode navigation. If detail API returns episodes list, use it. 
  // Otherwise try to use container info if available (likely from foryou feed passed via state, but here we fetch fresh).
  // For now assuming we start at episode 1 or what's available.
  const firstEpisodeId = drama.container?.episode_info?.id || "1"; 

  return (
    <main className="min-h-screen pt-20">
      {/* Hero Section with Cover */}
      <div className="relative">
        {/* Background Blur */}
        <div className="absolute inset-0 overflow-hidden">
          <img
            src={optimizeBg(drama.cover)}
            alt=""
            className="w-full h-full object-cover opacity-20 blur-3xl scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background/50 via-background/80 to-background" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-8">
          {/* Back Button */}
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-6"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Kembali</span>
          </button>

          <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
            {/* Cover */}
            <div className="relative group">
              <img
                src={optimizePoster(drama.cover)}
                alt={drama.title}
                className="w-full max-w-[300px] mx-auto rounded-2xl shadow-2xl"
              />
              {/* Overlay Play Button on Cover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-t from-background/80 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end justify-center pb-6">
                <Link
                  href={`/watch/freereels/${bookId}?ep=1`}
                  className="px-8 py-3 rounded-full bg-primary text-primary-foreground font-semibold flex items-center gap-2 hover:scale-105 transition-transform shadow-lg"
                >
                  <Play className="w-5 h-5 fill-current" />
                  Tonton Sekarang
                </Link>
              </div>
            </div>

            {/* Info */}
            <div className="space-y-6">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold font-display gradient-text mb-4 text-white">
                  {drama.title}
                </h1>

                {/* Stats */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <Play className="w-4 h-4" />
                    <span>{drama.episode_count || "?"} Episode</span>
                  </div>
                </div>

                {/* Labels */}
                {drama.content_tags && drama.content_tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {drama.content_tags.map((tag: string, idx: number) => (
                      <span key={idx} className="px-3 py-1 rounded-full border border-white/10 bg-white/5 text-white/80 text-xs font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Description */}
              <div className="glass rounded-xl p-4">
                <h3 className="font-semibold text-foreground mb-2">
                  Sinopsis
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {drama.desc || "Tidak ada deskripsi."}
                </p>
              </div>

              {/* Watch Button */}
              <Link
                  href={`/watch/freereels/${bookId}?ep=1`}
                  className="inline-flex items-center gap-2 px-8 py-3 rounded-full font-semibold text-white transition-all hover:scale-105 shadow-lg"
                  style={{ background: "var(--gradient-primary)" }}
              >
                  <Play className="w-5 h-5 fill-current" />
                  Mulai Menonton
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

function DetailSkeleton() {
  return (
    <main className="min-h-screen pt-24 px-4 bg-background">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-[300px_1fr] gap-8">
          <Skeleton className="aspect-[2/3] w-full max-w-[300px] rounded-2xl mx-auto md:mx-0" />
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
