"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useParams, useRouter } from "next/navigation";
import { useFreeReelsDetail } from "@/hooks/useFreeReels";
import { ChevronLeft, ChevronRight, Loader2, List, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { getWatchSession, updateWatchSession } from "@/lib/watch-session";

export default function FreeReelsWatchPage() {
  const params = useParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  
  // params.episodeId is now a random token
  const [currentToken, setCurrentToken] = useState(params.episodeId as string || "");
  const session = getWatchSession(currentToken);
  const activeEpisodeId = session?.episodeId || "";
  
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [videoQuality, setVideoQuality] = useState<'h264' | 'h265'>('h264');
  const [useProxy, setUseProxy] = useState(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Redirect if no valid session (direct URL access)
  useEffect(() => {
    if (!session && params.episodeId) {
      router.replace(`/detail/freereels/${bookId}`);
    }
  }, [session, params.episodeId, bookId, router]);

  const { data, isLoading, error } = useFreeReelsDetail(bookId);

  // Derived state
  const drama = data?.data;
  const episodes = useMemo(() => drama?.episodes || [], [drama]);
  
  const currentIndex = useMemo(() => {
    return episodes.findIndex((ep: any) => ep.id === activeEpisodeId);
  }, [episodes, activeEpisodeId]);

  const currentEpisodeData = useMemo(() => {
    if (currentIndex === -1) return episodes[0] || null;
    return episodes[currentIndex];
  }, [episodes, currentIndex]);

  const totalEpisodes = episodes.length;
  
  // Determine current video URL based on quality selection
  const currentVideoUrl = useMemo(() => {
      if (!currentEpisodeData) return "";
      if (videoQuality === 'h265' && currentEpisodeData.external_audio_h265_m3u8) {
          return currentEpisodeData.external_audio_h265_m3u8;
      }
      return currentEpisodeData.external_audio_h264_m3u8 || currentEpisodeData.videoUrl || "";
  }, [currentEpisodeData, videoQuality]);

  // Handlers
  const handleEpisodeChange = (episodeId: string, preserveFullscreen = false) => {
    if (episodeId === activeEpisodeId) return; 
    
    setShowEpisodeList(false);

    const newToken = updateWatchSession(currentToken, { episodeId });
    setCurrentToken(newToken);

    if (preserveFullscreen) {
      window.history.replaceState(null, "", `/watch/freereels/${bookId}/${newToken}`);
    } else {
      router.push(`/watch/freereels/${bookId}/${newToken}`);
    }
  };

  const handleVideoEnded = () => {
    const nextIndex = currentIndex + 1;
    if (nextIndex < totalEpisodes) {
      handleEpisodeChange(episodes[nextIndex].id, true);
    }
  };

  if (isLoading) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <div className="text-center space-y-2">
            <h3 className="text-white font-medium text-lg">Memuat video...</h3>
            <p className="text-white/60 text-sm">Mohon tunggu sebentar...</p>
        </div>
      </div>
    );
  }

  if (error || !drama) {
    return (
      <div className="fixed inset-0 bg-black flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-white mb-4">Video tidak ditemukan</h2>
        <Link href="/" className="text-primary hover:underline">
          Kembali ke beranda
        </Link>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black flex flex-col">
      {/* Header - Fixed Overlay */}
      <div className="absolute top-0 left-0 right-0 z-40 h-16 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent" />

        <div className="relative z-10 flex items-center justify-between h-full px-4 max-w-7xl mx-auto pointer-events-auto">
          <Link
            href={`/detail/freereels/${bookId}`}
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-white/10"
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="text-primary font-bold hidden sm:inline shadow-black drop-shadow-md">SekaiDrama</span>
          </Link>
          
          <div className="text-center flex-1 px-4 min-w-0">
            <h1 className="text-white font-medium truncate text-sm sm:text-base drop-shadow-md">
              {drama.title}
            </h1>
            <p className="text-white/80 text-xs drop-shadow-md">
              {currentEpisodeData ? `Episode ${currentEpisodeData.index + 1}` : "Episode ?"}
            </p>
          </div>

          <div className="flex items-center gap-2">
              {/* Quality Selector */}
              <div className="flex bg-black/40 backdrop-blur-sm rounded-lg p-1 border border-white/10">
                  <button 
                      onClick={() => setVideoQuality('h264')}
                      className={cn(
                          "text-[10px] px-2 py-1 rounded-md transition-all font-medium",
                          videoQuality === 'h264' ? "bg-primary text-white" : "text-white/70 hover:text-white"
                      )}
                  >
                      H.264
                  </button>
                  <button 
                      onClick={() => setVideoQuality('h265')}
                      className={cn(
                          "text-[10px] px-2 py-1 rounded-md transition-all font-medium",
                          videoQuality === 'h265' ? "bg-primary text-white" : "text-white/70 hover:text-white"
                      )}
                  >
                      H.265
                  </button>
              </div>

              <button
                onClick={() => setShowEpisodeList(!showEpisodeList)}
                className="p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10"
              >
                <List className="w-6 h-6 drop-shadow-md" />
              </button>
          </div>
        </div>
      </div>

      {/* Main Video Area */}
      <div className="flex-1 w-full h-full relative bg-black flex flex-col items-center justify-center">
         <div className="relative w-full h-full flex items-center justify-center">
            {currentVideoUrl ? (
              <video
                key={`${activeEpisodeId}-${videoQuality}`} // Force remount on episode or quality change
                ref={videoRef}
                src={useProxy ? `/api/proxy/video?url=${encodeURIComponent(currentVideoUrl)}` : currentVideoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain max-h-[100dvh]"
                poster={drama.cover}
                onEnded={handleVideoEnded}
                // @ts-ignore
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center z-20 flex-col gap-4">
                 <p className="text-white/60">URL Video tidak ditemukan</p>
              </div>
            )}
         </div>

         {/* Navigation Controls Overlay - Bottom */}
         <div className="absolute bottom-20 md:bottom-12 left-0 right-0 z-40 pointer-events-none flex justify-center pb-safe-area-bottom">
            <div className="flex items-center gap-2 md:gap-6 pointer-events-auto bg-black/60 backdrop-blur-md px-3 py-1.5 md:px-6 md:py-3 rounded-full border border-white/10 shadow-lg transition-all scale-90 md:scale-100 origin-bottom">
                <button
                  onClick={() => {
                    const prev = episodes[currentIndex - 1];
                    if (prev) handleEpisodeChange(prev.id);
                  }}
                  disabled={currentIndex <= 0}
                  className="p-1.5 md:p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
                </button>
                
                <span className="text-white font-medium text-xs md:text-sm tabular-nums min-w-[60px] md:min-w-[80px] text-center">
                  Ep {currentEpisodeData ? (currentEpisodeData.index || 0) + 1 : 1} / {totalEpisodes}
                </span>

                <button
                  onClick={() => {
                    const next = episodes[currentIndex + 1];
                    if (next) handleEpisodeChange(next.id);
                  }}
                  disabled={currentIndex >= totalEpisodes - 1}
                  className="p-1.5 md:p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
                </button>
            </div>
         </div>
      </div>

      {/* Episode List Sidebar */}
      {showEpisodeList && (
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
              {episodes.map((ep: any) => (
                <button
                  key={ep.id}
                  onClick={() => handleEpisodeChange(ep.id)}
                  className={cn(
                    "aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all",
                    ep.id === activeEpisodeId 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {(ep.index || 0) + 1}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
