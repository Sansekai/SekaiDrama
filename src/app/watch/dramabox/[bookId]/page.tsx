"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import { useParams, useSearchParams, useRouter } from "next/navigation";
import { useDramaDetail, useEpisodes } from "@/hooks/useDramaDetail";
import { ChevronLeft, ChevronRight, Loader2, Settings, List, AlertCircle } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { DramaDetailDirect, DramaDetailResponseLegacy } from "@/types/drama";
import { getWatchSession, updateWatchSession } from "@/lib/watch-session";

// Helper to check if response is new format
function isDirectFormat(data: unknown): data is DramaDetailDirect {
  return data !== null && typeof data === 'object' && 'bookId' in data && 'coverWap' in data;
}

// Helper to check if response is legacy format
function isLegacyFormat(data: unknown): data is DramaDetailResponseLegacy {
  return data !== null && typeof data === 'object' && 'data' in data && (data as DramaDetailResponseLegacy).data?.book !== undefined;
}

export default function DramaBoxWatchPage() {
  const params = useParams<{ bookId: string }>();
  const bookId = params.bookId;
  const searchParams = useSearchParams();
  const router = useRouter();
  const [currentEpisode, setCurrentEpisode] = useState(0);
  const [currentToken, setCurrentToken] = useState("");
  const [quality, setQuality] = useState(720);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  const { data: detailData, isLoading: detailLoading } = useDramaDetail(bookId || "");
  const { data: episodes, isLoading: episodesLoading } = useEpisodes(bookId || "");

  // Initialize from URL params
  useEffect(() => {
    const token = searchParams.get("t");
    if (!token) {
      router.replace(`/detail/dramabox/${bookId}`);
      return;
    }
    
    const session = getWatchSession(token);
    if (!session || session.episodeIndex === undefined) {
      router.replace(`/detail/dramabox/${bookId}`);
      return;
    }
    
    setCurrentToken(token);
    setCurrentEpisode(session.episodeIndex);
  }, [searchParams, bookId, router]);

  // Update URL when episode changes (for manual navigation)
  const handleEpisodeChange = (index: number, preserveFullscreen = false) => {
    if (!currentToken) return;
    setCurrentEpisode(index);
    setShowEpisodeList(false);
    const newToken = updateWatchSession(currentToken, { episodeIndex: index });
    setCurrentToken(newToken);
    if (preserveFullscreen) {
      window.history.replaceState(null, '', `/watch/dramabox/${bookId}?t=${newToken}`);
    } else {
      router.push(`/watch/dramabox/${bookId}?t=${newToken}`);
    }
  };

  // All useMemo hooks must be called BEFORE any early returns
  const currentEpisodeData = useMemo(() => {
    if (!episodes) return null;
    return episodes[currentEpisode] || null;
  }, [episodes, currentEpisode]);

  const defaultCdn = useMemo(() => {
    if (!currentEpisodeData) return null;
    return (
      currentEpisodeData.cdnList.find((cdn) => cdn.isDefault === 1) || currentEpisodeData.cdnList[0] || null
    );
  }, [currentEpisodeData]);

  const availableQualities = useMemo(() => {
    const list = defaultCdn?.videoPathList
      ?.map((v) => v.quality)
      .filter((q): q is number => typeof q === "number");

    const unique = Array.from(new Set(list && list.length ? list : [720]));
    return unique.sort((a, b) => b - a);
  }, [defaultCdn]);

  // Get subtitle URL for Indonesian language when subtitle is separate
  const subtitleUrl = useMemo(() => {
    if (!currentEpisodeData) return "";
    if (currentEpisodeData.useMultiSubtitle !== 1) return "";
    if (!currentEpisodeData.subLanguageVoList?.length) return "";

    // Priority: find "in" (Indonesian), then isDefault === 1, then first non-"none"
    const indo = currentEpisodeData.subLanguageVoList.find(
      (s) => s.captionLanguage === "in" && s.url
    );
    if (indo) return indo.url;

    const defaultSub = currentEpisodeData.subLanguageVoList.find(
      (s) => s.isDefault === 1 && s.url
    );
    if (defaultSub) return defaultSub.url;

    const first = currentEpisodeData.subLanguageVoList.find(
      (s) => s.captionLanguage !== "none" && s.url
    );
    return first?.url || "";
  }, [currentEpisodeData]);

  const proxiedSubtitleUrl = useMemo(() => {
    if (!subtitleUrl) return "";
    return `/api/proxy/video?url=${encodeURIComponent(subtitleUrl)}`;
  }, [subtitleUrl]);

  // Keep selected quality valid for the current episode
  useEffect(() => {
    if (!availableQualities.length) return;
    if (!availableQualities.includes(quality)) {
      setQuality(availableQualities[0]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [availableQualities.join(",")]);

  // Build the video URL: decrypt the encrypted videoPath via our proxy API
  const videoUrl = useMemo(() => {
    if (!currentEpisodeData || !defaultCdn) return "";

    const videoPath =
      defaultCdn.videoPathList.find((v) => v.quality === quality) ||
      defaultCdn.videoPathList.find((v) => v.isDefault === 1) ||
      defaultCdn.videoPathList[0];

    const rawUrl = videoPath?.videoPath || "";
    if (!rawUrl) return "";

    // Route through our decrypt-stream proxy which streams the decrypted video
    return `/api/dramabox/decrypt-stream?url=${encodeURIComponent(rawUrl)}`;
  }, [currentEpisodeData, defaultCdn, quality]);

  const handleVideoEnded = () => {
    if (!episodes) return;
    const next = currentEpisode + 1;
    if (next <= episodes.length - 1) {
      handleEpisodeChange(next, true);
    }
  };

  // Manual Subtitle Injection & Enforcement (same as FreeReels/NetShort)
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const injectTrack = () => {
      if (!proxiedSubtitleUrl) return;

      const tracks = Array.from(video.getElementsByTagName('track'));
      const existing = tracks.find(t => t.label === 'Indonesia' && t.srclang === 'id');

      if (existing) {
        if (existing.src === proxiedSubtitleUrl) return;
        video.removeChild(existing);
      }

      const track = document.createElement('track');
      track.kind = 'subtitles';
      track.label = 'Indonesia';
      track.srclang = 'id';
      track.default = true;
      track.src = proxiedSubtitleUrl;

      track.onload = () => {
        if (track.track) track.track.mode = 'showing';
      };

      video.appendChild(track);
    };

    const enforce = () => {
      const tracks = Array.from(video.textTracks);
      const indo = tracks.find(t => t.label === 'Indonesia' || t.language === 'id');
      if (indo && indo.mode !== 'showing') {
        indo.mode = 'showing';
      }
    };

    injectTrack();

    video.addEventListener('loadeddata', enforce);
    video.addEventListener('canplay', enforce);
    video.addEventListener('playing', enforce);
    video.addEventListener('seeked', enforce);

    // Polling for first 2 seconds (race condition fix)
    let retries = 0;
    const poll = setInterval(() => {
      injectTrack();
      enforce();
      retries++;
      if (retries > 10) clearInterval(poll);
    }, 200);

    return () => {
      video.removeEventListener('loadeddata', enforce);
      video.removeEventListener('canplay', enforce);
      video.removeEventListener('playing', enforce);
      video.removeEventListener('seeked', enforce);
      clearInterval(poll);

      try {
        const tracks = Array.from(video.getElementsByTagName('track'));
        const current = tracks.find(t => t.src === proxiedSubtitleUrl);
        if (current) video.removeChild(current);
      } catch (e) {}
    };
  }, [proxiedSubtitleUrl]);

  // Handle both new and legacy API formats
  let book: { bookId: string; bookName: string } | null = null;

  if (isDirectFormat(detailData)) {
    book = { bookId: detailData.bookId, bookName: detailData.bookName };
  } else if (isLegacyFormat(detailData)) {
    book = { bookId: detailData.data.book.bookId, bookName: detailData.data.book.bookName };
  }

  const totalEpisodes = episodes?.length || 0;

  // Loading state
  if (detailLoading || episodesLoading) {
    return (
      <main className="fixed inset-0 bg-black flex flex-col items-center justify-center space-y-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <div className="text-center space-y-2">
            <h3 className="text-white font-medium text-lg">Memuat video...</h3>
            <p className="text-white/60 text-sm">Mohon tunggu sebentar, data sedang diambil.</p>
        </div>
      </main>
    );
  }

  // Error state
  if (!book || !episodes) {
    return (
      <main className="fixed inset-0 bg-black flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-white mb-4">Drama tidak ditemukan</h2>
        <Link href="/" className="text-primary hover:underline">
          Kembali ke beranda
        </Link>
      </main>
    );
  }

  return (
    <main className="fixed inset-0 bg-black flex flex-col">
      {/* Header - Fixed Overlay with improved visibility */}
      <div className="absolute top-0 left-0 right-0 z-40 h-16 pointer-events-none">
        {/* Gradient background for readability */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent" />

        <div className="relative z-10 flex items-center justify-between h-full px-4 max-w-7xl mx-auto pointer-events-auto">
          {/* Header content unchanged... */}
          <Link
            href={`/detail/dramabox/${bookId}`}
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-white/10"
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="text-primary font-bold hidden sm:inline shadow-black drop-shadow-md">SekaiDrama</span>
          </Link>
          
          <div className="text-center flex-1 px-4 min-w-0">
            <h1 className="text-white font-medium truncate text-sm sm:text-base drop-shadow-md">
              {book.bookName}
            </h1>
            <p className="text-white/80 text-xs drop-shadow-md">
              {currentEpisodeData?.chapterName || `Episode ${currentEpisode + 1}`}
            </p>
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
                {availableQualities.map((q) => (
                  <DropdownMenuItem
                    key={q}
                    onClick={() => setQuality(q)}
                    className={quality === q ? "text-primary font-semibold" : ""}
                  >
                    {q}p
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
         {/* Video Element Wrapper */}
         <div className="relative w-full h-full flex items-center justify-center">
            {currentEpisodeData ? (
              <video
                ref={videoRef}
                src={videoUrl}
                controls
                autoPlay
                onEnded={handleVideoEnded}
                className="w-full h-full object-contain max-h-[100dvh]"
                poster={currentEpisodeData.chapterImg}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center z-20">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
              </div>
            )}
         </div>

         {/* Navigation Controls Overlay - Bottom */}
         {/* Adjusted to bottom-20 on mobile per user feedback. */}
         <div className="absolute bottom-20 md:bottom-12 left-0 right-0 z-40 pointer-events-none flex justify-center pb-safe-area-bottom">
            <div className="flex items-center gap-2 md:gap-6 pointer-events-auto bg-black/60 backdrop-blur-md px-3 py-1.5 md:px-6 md:py-3 rounded-full border border-white/10 shadow-lg transition-all scale-90 md:scale-100 origin-bottom">
                <button
                  onClick={() => currentEpisode > 0 && handleEpisodeChange(currentEpisode - 1)}
                  disabled={currentEpisode <= 0}
                  className="p-1.5 md:p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
                </button>
                
                <span className="text-white font-medium text-xs md:text-sm tabular-nums min-w-[60px] md:min-w-[80px] text-center">
                  Ep {currentEpisode + 1} / {totalEpisodes}
                </span>

                <button
                  onClick={() => currentEpisode < totalEpisodes - 1 && handleEpisodeChange(currentEpisode + 1)}
                  disabled={currentEpisode >= totalEpisodes - 1}
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
              {episodes.map((episode, idx) => (
                <button
                  key={episode.chapterId}
                  onClick={() => handleEpisodeChange(idx)}
                  className={`
                    aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all
                    ${idx === currentEpisode 
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
