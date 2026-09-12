"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useShortMaxEpisode, useShortMaxDetail } from "@/hooks/useShortMax";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, List, Settings } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Hls from "hls.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getWatchSession, updateWatchSession } from "@/lib/watch-session";

export default function ShortMaxWatchPage() {
  const params = useParams<{ shortPlayId: string }>();
  const searchParams = useSearchParams();
  const shortPlayId = params.shortPlayId;
  const router = useRouter();
  
  // Read token from URL query param ?t=
  const urlToken = searchParams.get("t") || "";
  const [currentToken, setCurrentToken] = useState(urlToken);
  const session = getWatchSession(currentToken);
  const [currentEpisode, setCurrentEpisode] = useState(session?.episodeNumber || 1);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<string>("720");
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  // Redirect if no valid session (direct URL access)
  useEffect(() => {
    if (!session && urlToken) {
      router.replace(`/detail/shortmax/${shortPlayId}`);
    }
  }, [session, urlToken, shortPlayId, router]);

  // Fetch detail for total episodes count and title
  const { data: detailData } = useShortMaxDetail(shortPlayId || "");

  // Fetch current episode data
  const { data: episodeData, isLoading, error } = useShortMaxEpisode(
    shortPlayId || "",
    currentEpisode
  );

  const totalEpisodes = detailData?.totalEpisodes || episodeData?.totalEpisodes || 1;
  const title = detailData?.title || episodeData?.shortPlayName || "Loading...";

  // Available quality options from episode data
  const qualityOptions = useMemo(() => {
    const urls = episodeData?.episode?.videoUrl;
    if (!urls) return [];
    const options: { key: string; label: string; quality: number }[] = [];
    if (urls.video_480) options.push({ key: "480", label: "480p", quality: 480 });
    if (urls.video_720) options.push({ key: "720", label: "720p", quality: 720 });
    if (urls.video_1080) options.push({ key: "1080", label: "1080p", quality: 1080 });
    return options.sort((a, b) => b.quality - a.quality);
  }, [episodeData]);

  // Get video URL based on selected quality (default 720p)
  // URLs are already proxied through /api/shortmax/hls by the episode API (AES-128-CBC decryption)
  const getVideoUrl = useCallback(() => {
    const urls = episodeData?.episode?.videoUrl;
    if (!urls) return null;
    const qualityKey = `video_${selectedQuality}` as keyof typeof urls;
    // Try selected quality first, then fallback: 720p > 1080p > 480p
    return urls[qualityKey] || urls.video_720 || urls.video_1080 || urls.video_480 || null;
  }, [episodeData, selectedQuality]);

  // Handle video ended - auto next episode
  const handleVideoEnded = useCallback(() => {
    const nextEp = currentEpisode + 1;
    if (nextEp <= totalEpisodes) {
      setCurrentEpisode(nextEp);
      const newToken = updateWatchSession(currentToken, { episodeNumber: nextEp });
      setCurrentToken(newToken);
      window.history.replaceState(null, '', `/watch/shortmax/${shortPlayId}?t=${newToken}`);
    }
  }, [currentEpisode, totalEpisodes, shortPlayId, currentToken]);

  // Load video with HLS.js
  useEffect(() => {
    const videoUrl = getVideoUrl();
    if (!videoUrl || !videoRef.current) return;

    const video = videoRef.current;

    // Clean up previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const isHlsUrl = videoUrl.includes('.m3u8');

    if (isHlsUrl && Hls.isSupported()) {
      const hls = new Hls({
        debug: false,
        enableWorker: true,
        xhrSetup: function (xhr) {
          xhr.withCredentials = false;
        },
      });
      hlsRef.current = hls;

      hls.loadSource(videoUrl);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });

      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) {
          console.error("HLS Fatal Error:", data.type, data.details, data.reason, data.error);
          hls.destroy();
        }
      });
    } else {
      // Native playback (Safari HLS or MP4)
      video.src = videoUrl;
      video.load();
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [getVideoUrl]);

  const goToEpisode = (ep: number) => {
    setCurrentEpisode(ep);
    const newToken = updateWatchSession(currentToken, { episodeNumber: ep });
    setCurrentToken(newToken);
    router.replace(`/watch/shortmax/${shortPlayId}?t=${newToken}`, { scroll: false });
    setShowEpisodeList(false);
  };

  return (
    <main className="fixed inset-0 bg-black flex flex-col">
      {/* Header - Fixed Overlay */}
      <div className="absolute top-0 left-0 right-0 z-40 h-16 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent" />
        
        <div className="relative z-10 flex items-center justify-between h-full px-4 max-w-7xl mx-auto pointer-events-auto">
          <Link
            href={`/detail/shortmax/${shortPlayId}`}
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-white/10"
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="text-primary font-bold hidden sm:inline shadow-black drop-shadow-md">SekaiDrama</span>
          </Link>
          
          <div className="text-center flex-1 px-4 min-w-0">
            <h1 className="text-white font-medium truncate text-sm sm:text-base drop-shadow-md">
              {title}
            </h1>
            <p className="text-white/80 text-xs drop-shadow-md">Episode {currentEpisode}</p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quality Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10">
                  <Settings className="w-6 h-6 drop-shadow-md" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="z-[100]">
                {qualityOptions.map((option) => (
                  <DropdownMenuItem
                    key={option.key}
                    onClick={() => setSelectedQuality(option.key)}
                    className={selectedQuality === option.key ? "text-primary font-semibold" : ""}
                  >
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Episode List Toggle */}
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
            {isLoading && (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            )}

            {error && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-20">
                <AlertCircle className="w-10 h-10 text-destructive mb-4" />
                <p className="text-white mb-4">Gagal memuat video</p>
                <button
                  onClick={() => router.refresh()}
                  className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
                >
                  Coba Lagi
                </button>
              </div>
            )}

            {episodeData?.episode?.locked && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-4 z-20 bg-black/80">
                <AlertCircle className="w-10 h-10 text-yellow-500 mb-4" />
                <p className="text-white mb-2 font-semibold">Episode Terkunci</p>
                <p className="text-white/70 text-sm">Episode ini memerlukan akses premium</p>
              </div>
            )}
            
            <video
              ref={videoRef}
              className="w-full h-full object-contain max-h-[100dvh]"
              controls
              playsInline
              autoPlay
              crossOrigin="anonymous"
              {...({ disableRemotePlayback: true, referrerPolicy: "no-referrer" } as any)}
              onEnded={handleVideoEnded}
            />
         </div>

         {/* Navigation Controls Overlay - Bottom */}
         <div className="absolute bottom-20 md:bottom-12 left-0 right-0 z-40 pointer-events-none flex justify-center pb-safe-area-bottom">
            <div className="flex items-center gap-2 md:gap-6 pointer-events-auto bg-black/60 backdrop-blur-md px-3 py-1.5 md:px-6 md:py-3 rounded-full border border-white/10 shadow-lg transition-all scale-90 md:scale-100 origin-bottom">
                <button
                  onClick={() => currentEpisode > 1 && goToEpisode(currentEpisode - 1)}
                  disabled={currentEpisode <= 1}
                  className="p-1.5 md:p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
                </button>
                
                <span className="text-white font-medium text-xs md:text-sm tabular-nums min-w-[60px] md:min-w-[80px] text-center">
                  Ep {currentEpisode} / {totalEpisodes}
                </span>

                <button
                  onClick={() => currentEpisode < totalEpisodes && goToEpisode(currentEpisode + 1)}
                  disabled={currentEpisode >= totalEpisodes}
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
              {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((epNum) => (
                <button
                  key={epNum}
                  onClick={() => goToEpisode(epNum)}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all
                    ${epNum === currentEpisode 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    }
                  `}
                >
                  {epNum}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
