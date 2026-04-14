"use client";

import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGoodShortEpisodes } from "@/hooks/useGoodShort";
import { ChevronLeft, ChevronRight, Loader2, List, AlertCircle, Settings } from "lucide-react";
import Link from "next/link";
import Hls from "hls.js";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";


interface VideoQuality {
  name: string;
  url: string;
}

export default function GoodShortWatchPage() {
  const params = useParams<{ bookId: string; episodeIndex: string }>();
  const router = useRouter();
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [selectedQuality, setSelectedQuality] = useState<VideoQuality | null>(null);
  const [hlsReady, setHlsReady] = useState(false);

  // Episode index from URL (1-based in URL, 0-based internally)
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(() => {
    const idx = parseInt(params.episodeIndex || "1", 10) - 1;
    return isNaN(idx) ? 0 : Math.max(0, idx);
  });

  // Sync with URL params
  useEffect(() => {
    const idx = parseInt(params.episodeIndex || "1", 10) - 1;
    if (!isNaN(idx) && idx !== currentEpisodeIndex) {
      setCurrentEpisodeIndex(Math.max(0, idx));
    }
  }, [params.episodeIndex]);

  // Fetch all episodes
  const { data: episodeData, isLoading: episodesLoading } = useGoodShortEpisodes(params.bookId || "");

  const episodes = episodeData?.downloadList || [];
  const totalEpisodes = episodes.length;
  const dramaTitle = episodeData?.bookName || "Loading...";

  const currentEpisode = episodes[currentEpisodeIndex] || null;

  // Build qualities from the current episode's multiVideos
  const qualities = useMemo(() => {
    if (!currentEpisode?.multiVideos) return [];

    const available: VideoQuality[] = currentEpisode.multiVideos.map((v: any) => {
      // Use local proxy to avoid CORS; the proxy rewrites segment URLs too
      const decryptUrl = `/api/goodshort/stream-proxy?url=${encodeURIComponent(v.filePath)}`;
      return {
        name: v.type, // "720p", "540p", "1080p"
        url: decryptUrl,
      };
    });

    // Sort highest to lowest
    available.sort((a, b) => {
      const parseRes = (name: string) => parseInt(name.replace(/[^0-9]/g, "")) || 0;
      return parseRes(b.name) - parseRes(a.name);
    });

    return available;
  }, [currentEpisode]);

  // Set default quality when qualities change
  useEffect(() => {
    if (qualities.length > 0) {
      let nextQuality = null;
      if (selectedQuality) {
        nextQuality = qualities.find(q => q.name === selectedQuality.name);
      }
      if (!nextQuality) {
        nextQuality = qualities.find(q => q.name === "720p") || qualities.find(q => q.name === "1080p") || qualities[0];
      }
      if (nextQuality && nextQuality.url !== selectedQuality?.url) {
        setSelectedQuality(nextQuality);
      }
    }
  }, [qualities]);

  // HLS playback setup
  useEffect(() => {
    if (!selectedQuality?.url || !videoRef.current) return;

    const video = videoRef.current;

    // Cleanup previous HLS instance
    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    setHlsReady(false);

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
      });

      hls.loadSource(selectedQuality.url);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setHlsReady(true);
        video.play().catch(() => {}); // Auto-play may be blocked
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          console.error("HLS fatal error:", data);
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          }
        }
      });

      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari native HLS support
      video.src = selectedQuality.url;
      video.addEventListener("loadedmetadata", () => {
        setHlsReady(true);
        video.play().catch(() => {});
      });
    }

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };
  }, [selectedQuality?.url]);

  const handleEpisodeChange = useCallback((index: number) => {
    if (index < 0 || index >= totalEpisodes) return;

    setCurrentEpisodeIndex(index);

    // Update URL without full navigation
    const newUrl = `/watch/goodshort/${params.bookId}/${index + 1}`;
    window.history.pushState({ path: newUrl }, "", newUrl);

    setShowEpisodeList(false);
  }, [totalEpisodes, params.bookId]);

  const handleVideoEnded = useCallback(() => {
    if (currentEpisodeIndex < totalEpisodes - 1) {
      handleEpisodeChange(currentEpisodeIndex + 1);
    }
  }, [currentEpisodeIndex, totalEpisodes, handleEpisodeChange]);

  // Guard: no data after loading
  if (!episodesLoading && !episodeData) {
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
            href={`/detail/goodshort/${params.bookId}`}
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
              Episode {currentEpisodeIndex + 1}
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Quality Selector */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10 flex items-center gap-1">
                  <Settings className="w-6 h-6 drop-shadow-md" />
                  <span className="text-xs font-bold drop-shadow-md hidden sm:inline">{selectedQuality?.name || "..."}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-black/90 border-white/10 text-white">
                {qualities.map((q) => (
                  <DropdownMenuItem 
                    key={q.name}
                    className={`cursor-pointer ${selectedQuality?.name === q.name ? "bg-white/20" : "hover:bg-white/10"}`}
                    onClick={() => setSelectedQuality(q)}
                  >
                    {q.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

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
          {(episodesLoading || (!hlsReady && selectedQuality)) && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-30 pointer-events-none">
              <Loader2 className="w-12 h-12 animate-spin text-primary drop-shadow-md" />
            </div>
          )}
        </div>

        {/* Navigation Controls */}
        <div className="absolute bottom-20 md:bottom-12 left-0 right-0 z-40 pointer-events-none flex justify-center pb-safe-area-bottom">
          <div className={`flex items-center gap-2 md:gap-6 pointer-events-auto bg-black/60 backdrop-blur-md px-3 py-1.5 md:px-6 md:py-3 rounded-full border border-white/10 shadow-lg transition-all scale-90 md:scale-100 origin-bottom ${showEpisodeList ? 'opacity-0' : 'opacity-100'}`}>
            <button
              onClick={() => handleEpisodeChange(currentEpisodeIndex - 1)}
              disabled={currentEpisodeIndex <= 0}
              className="p-1.5 md:p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
            </button>
            
            <span className="text-white font-medium text-xs md:text-sm tabular-nums min-w-[60px] md:min-w-[80px] text-center">
              Ep {currentEpisodeIndex + 1} / {totalEpisodes}
            </span>

            <button
              onClick={() => handleEpisodeChange(currentEpisodeIndex + 1)}
              disabled={currentEpisodeIndex >= totalEpisodes - 1}
              className="p-1.5 md:p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
            >
              <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
            </button>
          </div>
        </div>
      </div>

      {/* Episode List Sidebar */}
      {showEpisodeList && episodes.length > 0 && (
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
              {episodes.map((episode: any, idx: number) => (
                <button
                  key={episode.id}
                  onClick={() => handleEpisodeChange(idx)}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all
                    ${idx === currentEpisodeIndex 
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                    }
                  `}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </main>
  );
}
