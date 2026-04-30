"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { usePineDramaDetail, usePineDramaEpisode } from "@/hooks/usePineDrama";
import { ChevronLeft, ChevronRight, Loader2, List, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function PineDramaWatchPage() {
  const params = useParams<{ collectionId: string; episodeNumber: string }>();
  const router = useRouter();
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [videoReady, setVideoReady] = useState(false);
  const [videoError, setVideoError] = useState(false);

  const collectionId = params.collectionId || "";

  // Episode number from URL (1-based)
  const [currentEpisode, setCurrentEpisode] = useState(() => {
    const ep = parseInt(params.episodeNumber || "1", 10);
    return isNaN(ep) ? 1 : Math.max(1, ep);
  });

  // Sync with URL params
  useEffect(() => {
    const ep = parseInt(params.episodeNumber || "1", 10);
    if (!isNaN(ep) && ep !== currentEpisode) {
      setCurrentEpisode(Math.max(1, ep));
    }
  }, [params.episodeNumber]);

  // Fetch detail for total episodes + title
  const { data: detailData } = usePineDramaDetail(collectionId);
  const totalEpisodes = detailData?.total_episodes || 0;
  const dramaTitle = detailData?.title || "Loading...";

  // Fetch current episode data
  const { data: episodeData, isLoading: episodeLoading } = usePineDramaEpisode(collectionId, currentEpisode);

  // Determine video URL: best_url first, fallback to indo_hd_cdn_urls
  const videoUrl = episodeData?.best_url
    || episodeData?.main?.indo_hd_cdn_urls?.[0]
    || episodeData?.main?.indo_cdn_urls?.[0]
    || "";

  // Reset video state on episode change
  useEffect(() => {
    setVideoReady(false);
    setVideoError(false);
  }, [currentEpisode]);

  // Track the last loaded URL to detect fallback
  const lastLoadedUrl = useRef("");

  // Handle video source loading — avoid video.load() to preserve fullscreen
  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;
    if (videoUrl === lastLoadedUrl.current) return;

    const video = videoRef.current;
    lastLoadedUrl.current = videoUrl;

    // Just set src — do NOT call video.load() to avoid exiting fullscreen
    video.src = videoUrl;
    video.play().catch(() => {});

    const onCanPlay = () => {
      setVideoReady(true);
    };
    const onError = () => {
      // Try fallback URL if best_url failed
      const fallback = episodeData?.main?.indo_hd_cdn_urls?.[0];
      if (fallback && video.src !== fallback) {
        lastLoadedUrl.current = fallback;
        video.src = fallback;
        video.play().catch(() => {});
      } else {
        setVideoError(true);
      }
    };

    video.addEventListener("canplay", onCanPlay);
    video.addEventListener("error", onError);

    return () => {
      video.removeEventListener("canplay", onCanPlay);
      video.removeEventListener("error", onError);
    };
  }, [videoUrl]);

  const handleEpisodeChange = useCallback((ep: number) => {
    if (ep < 1 || ep > totalEpisodes) return;

    setCurrentEpisode(ep);

    // Update URL without full navigation
    const newUrl = `/watch/pinedrama/${collectionId}/${ep}`;
    window.history.pushState({ path: newUrl }, "", newUrl);

    setShowEpisodeList(false);
  }, [totalEpisodes, collectionId]);

  const handleVideoEnded = useCallback(() => {
    if (currentEpisode < totalEpisodes) {
      handleEpisodeChange(currentEpisode + 1);
    }
  }, [currentEpisode, totalEpisodes, handleEpisodeChange]);

  // Guard: no data after loading
  if (!episodeLoading && !episodeData && !detailData) {
    return (
      <main className="fixed inset-0 bg-black flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-white mb-4">Video tidak ditemukan</h2>
        <button onClick={() => router.back()} className="text-primary hover:underline">
          Kembali
        </button>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 bg-black flex flex-col">
      {/* Header Overlay */}
      <div className="absolute top-0 left-0 right-0 z-40 h-16 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent" />
        <div className="relative z-10 flex items-center justify-between h-full px-4 max-w-7xl mx-auto pointer-events-auto">
          <Link
            href={`/detail/pinedrama/${collectionId}`}
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-white/10"
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="text-primary font-bold hidden sm:inline shadow-black drop-shadow-md">SekaiDrama</span>
          </Link>

          <div className="text-center flex-1 px-4 min-w-0">
            <h1 className="text-white font-medium truncate text-sm sm:text-base drop-shadow-md">
              {dramaTitle}
            </h1>
            <p className="text-white/80 text-xs drop-shadow-md">
              Episode {currentEpisode}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEpisodeList(!showEpisodeList)}
              className="p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10"
            >
              <List className="w-6 h-6 drop-shadow-md" />
            </button>
          </div>
        </div>
      </div>

      {/* Video Player */}
      <div className="flex-1 w-full h-full relative bg-black flex flex-col items-center justify-center">
        <div className="relative w-full h-full flex items-center justify-center">
          <video
            ref={videoRef}
            controls
            autoPlay
            playsInline
            onEnded={handleVideoEnded}
            className="w-full h-full object-contain max-h-[100dvh]"
          />

          {/* Loading Overlay */}
          {(episodeLoading || (!videoReady && !videoError && videoUrl)) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-30 pointer-events-none">
              <Loader2 className="w-12 h-12 animate-spin text-primary drop-shadow-md" />
            </div>
          )}

          {/* Error Overlay */}
          {videoError && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 z-30">
              <AlertCircle className="w-12 h-12 text-destructive mb-4" />
              <p className="text-white text-lg mb-4">Gagal memuat video</p>
              <button
                onClick={() => {
                  setVideoError(false);
                  setVideoReady(false);
                  if (videoRef.current && videoUrl) {
                    videoRef.current.src = videoUrl;
                    videoRef.current.load();
                  }
                }}
                className="px-6 py-2 bg-primary text-white rounded-full hover:scale-105 transition-transform"
              >
                Coba Lagi
              </button>
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        <div className="absolute bottom-20 md:bottom-12 left-0 right-0 z-40 pointer-events-none flex justify-center pb-safe-area-bottom">
          <div className={`flex items-center gap-2 md:gap-6 pointer-events-auto bg-black/60 backdrop-blur-md px-3 py-1.5 md:px-6 md:py-3 rounded-full border border-white/10 shadow-lg transition-all scale-90 md:scale-100 origin-bottom ${showEpisodeList ? 'opacity-0' : 'opacity-100'}`}>
            <button
              onClick={() => handleEpisodeChange(currentEpisode - 1)}
              disabled={currentEpisode <= 1}
              className="p-1.5 md:p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
            </button>
            
            <span className="text-white font-medium text-xs md:text-sm tabular-nums min-w-[60px] md:min-w-[80px] text-center">
              Ep {currentEpisode} / {totalEpisodes}
            </span>

            <button
              onClick={() => handleEpisodeChange(currentEpisode + 1)}
              disabled={currentEpisode >= totalEpisodes}
              className="p-1.5 md:p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Episode List Sidebar */}
      {showEpisodeList && totalEpisodes > 0 && (
        <>
          <div 
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]"
            onClick={() => setShowEpisodeList(false)}
          />
          <div className="fixed inset-y-0 right-0 w-72 bg-zinc-900 z-[70] overflow-y-auto border-l border-white/10 shadow-2xl animate-in slide-in-from-right">
            <div className="p-4 border-b border-white/10 sticky top-0 bg-zinc-900 z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white">Daftar Episode</h2>
                <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full">
                  Total {totalEpisodes}
                </span>
              </div>
              <button
                onClick={() => setShowEpisodeList(false)}
                className="p-1 text-white/70 hover:text-white"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            <div className="p-3 grid grid-cols-5 gap-2">
              {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((ep) => (
                <button
                  key={ep}
                  onClick={() => handleEpisodeChange(ep)}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all
                    ${ep === currentEpisode 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    }
                  `}
                >
                  {ep}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
