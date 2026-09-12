"use client";

import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useFreeReelsDetail } from "@/hooks/useFreeReels";
import { ChevronLeft, ChevronRight, Loader2, List, AlertCircle } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import Hls from "hls.js";
import { getWatchSession, updateWatchSession } from "@/lib/watch-session";

export default function FreeReelsWatchPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const bookId = params.bookId as string;
  
  // Read token from URL query param ?t=
  const urlToken = searchParams.get("t") || "";
  const [currentToken, setCurrentToken] = useState(urlToken);
  const session = getWatchSession(currentToken);
  const [currentEpisodeIndex, setCurrentEpisodeIndex] = useState(() => {
    const ep = session?.episodeNumber || 1;
    return Math.max(0, ep - 1); // 1-based to 0-based
  });
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const [videoQuality, setVideoQuality] = useState<'h264' | 'h265'>('h264');
  const [useProxy, setUseProxy] = useState(true);
  
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hlsRef = useRef<Hls | null>(null);

  const { data, isLoading, error } = useFreeReelsDetail(bookId);

  // Redirect if no valid session (direct URL access)
  useEffect(() => {
    if (!session && urlToken) {
      router.replace(`/detail/freereels/${bookId}`);
    }
  }, [session, urlToken, bookId, router]);

  // Derived state
  const drama = data?.data;
  const episodes = useMemo(() => drama?.episodes || [], [drama]);
  const totalEpisodes = episodes.length;

  const currentEpisodeData = useMemo(() => {
    return episodes[currentEpisodeIndex] || episodes[0] || null;
  }, [episodes, currentEpisodeIndex]);

  // Determine current video URL based on quality selection
  const currentVideoUrl = useMemo(() => {
      if (!currentEpisodeData) return "";
      let sourceUrl = "";
      if (videoQuality === 'h265' && currentEpisodeData.external_audio_h265_m3u8) {
          sourceUrl = currentEpisodeData.external_audio_h265_m3u8;
      } else {
          sourceUrl = currentEpisodeData.external_audio_h264_m3u8 || currentEpisodeData.videoUrl || "";
      }
      
      // We will inject the subtitle URL into the video proxy call if available
      // This allows the proxy to rewrite the manifest to include the subtitle intrinsically
      if (currentEpisodeData.subtitleUrl && currentEpisodeData.originalAudioLanguage !== 'id-ID') {
           // We use a special convention: append &sub=... to the proxy URL
           // But here we return the raw source. The proxy wrapping happens in the effect.
           return sourceUrl;
      }
      
      return sourceUrl;
  }, [currentEpisodeData, videoQuality]);

  const proxiedSubtitleUrl = useMemo(() => {
    if (!currentEpisodeData?.subtitleUrl) return "";
    return `/api/proxy/video?url=${encodeURIComponent(currentEpisodeData.subtitleUrl)}`;
  }, [currentEpisodeData]);

  // Load video with HLS support
  useEffect(() => {
      // Don't auto-load if not available (wait for user interaction or initial load)
      if (!currentVideoUrl) return;

      // Smart fallback logic: Try direct first, then proxy
      // Check if we need to inject subtitle via proxy
      const subParam = ""; 
          // (currentEpisodeData?.subtitleUrl && currentEpisodeData?.originalAudioLanguage !== 'id-ID') 
          // ? `&sub=${encodeURIComponent(currentEpisodeData.subtitleUrl)}`
          // : "";

      const videoUrl = useProxy 
        ? `/api/proxy/video?url=${encodeURIComponent(currentVideoUrl)}${subParam}` 
        : currentVideoUrl;

      const video = videoRef.current;
      if (!video) return;

      // Clean up previous HLS instance
      if (hlsRef.current) {
          hlsRef.current.destroy();
          hlsRef.current = null;
      }

      // If we are using proxy or it's an m3u8 file, try HLS
      if (Hls.isSupported() && (videoUrl.includes('.m3u8') || useProxy)) {
          console.log(`Loading video: ${useProxy ? 'Proxy' : 'Direct'} from ${videoUrl}`);
          const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: false, // Usage of Low Latency is aggressive
            maxBufferLength: 10, // Only buffer 10s ahead
            maxMaxBufferLength: 20, 
            backBufferLength: 10,
            xhrSetup: function (xhr) {
                xhr.withCredentials = false;
            },
            // Reduce spamming on error
            manifestLoadingRetryDelay: 2000,
            manifestLoadingMaxRetry: 3,
            fragLoadingRetryDelay: 2000,
            fragLoadingMaxRetry: 3,
            levelLoadingMaxRetry: 3,
          });
          
          hlsRef.current = hls;
          hls.loadSource(videoUrl);
          hls.attachMedia(video);
          
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
              video.play().catch(() => console.log('Autoplay prevented'));
          });
          
          hls.on(Hls.Events.ERROR, (event, data) => {
              if (data.fatal) {
                  console.log("HLS Fatal Error:", data.type);
                  hls.destroy();
                  if (!useProxy) {
                      console.log("Direct play failed, switching to proxy...");
                      setUseProxy(true);
                  }
              }
          });
      } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // Native HLS support (Safari)
          video.src = videoUrl;
          video.play().catch(() => {});
      } else {
          // Direct play (MP4 etc)
          video.src = videoUrl;
          video.play().catch(() => {});
      }

      return () => {
          if (hlsRef.current) {
              hlsRef.current.destroy();
          }
      };
  }, [currentVideoUrl, useProxy]);


  // Manual Subtitle Injection & Enforcement
  // We handle this OUTSIDE of React's DOM management to coordinate with HLS.js
  useEffect(() => {
      const video = videoRef.current;
      if (!video) return;

      // Helper to inject track safely
      const injectTrack = () => {
          if (!proxiedSubtitleUrl || currentEpisodeData?.originalAudioLanguage === 'id-ID') return;

          // Check if already exists
          const tracks = Array.from(video.getElementsByTagName('track'));
          const existing = tracks.find(t => t.label === 'Indonesia' && t.srclang === 'id');
          
          // Use URL as specific identifier to ensure we have the RIGHT track
          if (existing) {
             if (existing.src === proxiedSubtitleUrl) {
                 return; // Already has correct track
             } else {
                 // Remove old track
                 video.removeChild(existing);
             }
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
          // console.log("Injected subtitle track:", proxiedSubtitleUrl);
      };

      // Helper to Enforce Visibility
      const enforce = () => {
          const tracks = Array.from(video.textTracks);
          const indo = tracks.find(t => t.label === 'Indonesia' || t.language === 'id');
          if (indo && indo.mode !== 'showing') {
              indo.mode = 'showing';
              // console.log("Enforced showing");
          }
      };

      // Inject immediately logic
      injectTrack();

      // Listeners for enforcement
      video.addEventListener('loadeddata', enforce);
      video.addEventListener('canplay', enforce);
      video.addEventListener('playing', enforce);
      video.addEventListener('seeked', enforce);

      // --- HLS Integration ---
      // We need to attach listeners to the HLS instance created in the previous effect?
      // Actually, we can just hook into video events, but MANIFEST_PARSED is best caught on the hls instance.
      // Since hlsRef is mutable, we can check it.
      if (hlsRef.current) {
          hlsRef.current.on(Hls.Events.MANIFEST_PARSED, () => {
              // HLS ready, reinject if wipe happened
              injectTrack();
              enforce();
          });
          hlsRef.current.on(Hls.Events.LEVEL_SWITCHED, () => {
              // Quality switch -> reinject/enforce
              injectTrack();
              enforce();
          });
      }

      // Polling for first 2 seconds (Race fix)
      let retries = 0;
      const poll = setInterval(() => {
          injectTrack(); // Ensure it exists
          enforce();     // Ensure it shows
          retries++;
          if (retries > 10) clearInterval(poll);
      }, 200);

      return () => {
          video.removeEventListener('loadeddata', enforce);
          video.removeEventListener('canplay', enforce);
          video.removeEventListener('playing', enforce);
          video.removeEventListener('seeked', enforce);
          clearInterval(poll);
          
          // Don't remove track, let it persist or be replaced on next run
          // Actually, we SHOULD remove it if component unmounts or URL changes?
          // Yes, to prevent duplicates if logic fails.
          try {
             const tracks = Array.from(video.getElementsByTagName('track'));
             const current = tracks.find(t => t.src === proxiedSubtitleUrl);
             if (current) video.removeChild(current);
          } catch(e) {}
      };
  }, [proxiedSubtitleUrl, currentVideoUrl, videoQuality, currentEpisodeData?.originalAudioLanguage]); // Deps ensure runs on change

  // Navigation Handler
  const handleEpisodeChange = (index: number) => {
    if (index === currentEpisodeIndex) return;
    
    setShowEpisodeList(false);
    setCurrentEpisodeIndex(index);

    const nextEp = index + 1;
    const newToken = updateWatchSession(currentToken, { episodeNumber: nextEp });
    setCurrentToken(newToken);
    router.push(`/watch/freereels/${bookId}?t=${newToken}`);
  };

  const handleVideoEnded = () => {
    const nextIndex = currentEpisodeIndex + 1;
    if (nextIndex < totalEpisodes) {
       const nextEp = nextIndex + 1;
       setCurrentEpisodeIndex(nextIndex);
       const newToken = updateWatchSession(currentToken, { episodeNumber: nextEp });
       setCurrentToken(newToken);
       router.replace(`/watch/freereels/${bookId}?t=${newToken}`);
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
              {currentEpisodeData ? `Episode ${(currentEpisodeData.index || currentEpisodeIndex) + 1}` : "Episode ?"}
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
                ref={videoRef}
                controls
                autoPlay
                className="w-full h-full object-contain max-h-[100dvh]"
                poster={drama.cover}
                onEnded={handleVideoEnded}
                {...({ disableRemotePlayback: true, referrerPolicy: "no-referrer" } as any)}
                crossOrigin="anonymous"
              >
              </video>
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
                  onClick={() => handleEpisodeChange(currentEpisodeIndex - 1)}
                  disabled={currentEpisodeIndex <= 0}
                  className="p-1.5 md:p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
                </button>
                
                <span className="text-white font-medium text-xs md:text-sm tabular-nums min-w-[60px] md:min-w-[80px] text-center">
                  Ep {currentEpisodeData ? (currentEpisodeData.index || currentEpisodeIndex) + 1 : 1} / {totalEpisodes}
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
              {episodes.map((ep: any, idx: number) => (
                <button
                  key={ep.id}
                  onClick={() => handleEpisodeChange(idx)}
                  className={cn(
                    "aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all",
                    idx === currentEpisodeIndex
                      ? "bg-primary text-white shadow-lg shadow-primary/20" 
                      : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
                  )}
                >
                  {(ep.index || idx) + 1}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
