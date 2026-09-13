"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useFlickReelsEpisode, useFlickReelsDetail } from "@/hooks/useFlickReels";
import { ChevronLeft, ChevronRight, Loader2, AlertCircle, List } from "lucide-react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import Hls from "hls.js";
import { getWatchSession, updateWatchSession } from "@/lib/watch-session";

export default function FlickReelsWatchPage() {
  const params = useParams<{ playletId: string }>();
  const searchParams = useSearchParams();
  const playletId = params.playletId;
  const router = useRouter();

  const urlToken = searchParams.get("t") || "";
  const [currentToken, setCurrentToken] = useState(urlToken);
  const session = getWatchSession(currentToken);
  const [currentEpisode, setCurrentEpisode] = useState(session?.episodeNumber || 1);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);

  useEffect(() => {
    if (!session && urlToken) {
      router.replace(`/detail/flickreels/${playletId}`);
    }
  }, [session, urlToken, playletId, router]);

  const { data: detailData } = useFlickReelsDetail(playletId || "");
  const { data: episodeData, isLoading, error } = useFlickReelsEpisode(playletId || "", currentEpisode);

  const totalEpisodes = detailData?.totalEpisodes || 1;
  const title = detailData?.title || episodeData?.title || "Loading...";
  const videoUrl = episodeData?.hlsUrl || null;

  const handleVideoEnded = useCallback(() => {
    const nextEp = currentEpisode + 1;
    if (nextEp <= totalEpisodes) {
      setCurrentEpisode(nextEp);
      const newToken = updateWatchSession(currentToken, { episodeNumber: nextEp });
      setCurrentToken(newToken);
      window.history.replaceState(null, '', `/watch/flickreels/${playletId}?t=${newToken}`);
    }
  }, [currentEpisode, totalEpisodes, playletId, currentToken]);

  useEffect(() => {
    if (!videoUrl || !videoRef.current) return;
    const video = videoRef.current;

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    if (Hls.isSupported()) {
      const hls = new Hls({ debug: false, enableWorker: true });
      hlsRef.current = hls;
      hls.loadSource(videoUrl);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => { video.play().catch(() => {}); });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data.fatal) { console.error("HLS Fatal Error:", data.type, data.details); hls.destroy(); }
      });
    } else {
      video.src = videoUrl;
      video.load();
      video.play().catch(() => {});
    }

    return () => {
      if (hlsRef.current) { hlsRef.current.destroy(); hlsRef.current = null; }
    };
  }, [videoUrl]);

  const goToEpisode = (ep: number) => {
    setCurrentEpisode(ep);
    const newToken = updateWatchSession(currentToken, { episodeNumber: ep });
    setCurrentToken(newToken);
    router.replace(`/watch/flickreels/${playletId}?t=${newToken}`, { scroll: false });
    setShowEpisodeList(false);
  };

  return (
    <main className="fixed inset-0 bg-black flex flex-col">
      <div className="absolute top-0 left-0 right-0 z-40 h-16 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent" />
        <div className="relative z-10 flex items-center justify-between h-full px-4 max-w-7xl mx-auto pointer-events-auto">
          <Link href={`/detail/flickreels/${playletId}`} className="flex items-center gap-2 text-white/90 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-white/10">
            <ChevronLeft className="w-6 h-6" />
            <span className="text-primary font-bold hidden sm:inline shadow-black drop-shadow-md">SekaiDrama</span>
          </Link>
          <div className="text-center flex-1 px-4 min-w-0">
            <h1 className="text-white font-medium truncate text-sm sm:text-base drop-shadow-md">{title}</h1>
            <p className="text-white/80 text-xs drop-shadow-md">Episode {currentEpisode}</p>
          </div>
          <button onClick={() => setShowEpisodeList(!showEpisodeList)} className="p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10">
            <List className="w-6 h-6 drop-shadow-md" />
          </button>
        </div>
      </div>

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
              <button onClick={() => router.refresh()} className="px-4 py-2 bg-primary text-white rounded-lg text-sm">Coba Lagi</button>
            </div>
          )}
          <video ref={videoRef} className="w-full h-full object-contain max-h-[100dvh]" controls playsInline autoPlay crossOrigin="anonymous" {...({ disableRemotePlayback: true, referrerPolicy: "no-referrer" } as any)} onEnded={handleVideoEnded} />
        </div>

        <div className="absolute bottom-20 md:bottom-12 left-0 right-0 z-40 pointer-events-none flex justify-center pb-safe-area-bottom">
          <div className="flex items-center gap-2 md:gap-6 pointer-events-auto bg-black/60 backdrop-blur-md px-3 py-1.5 md:px-6 md:py-3 rounded-full border border-white/10 shadow-lg transition-all scale-90 md:scale-100 origin-bottom">
            <button onClick={() => currentEpisode > 1 && goToEpisode(currentEpisode - 1)} disabled={currentEpisode <= 1} className="p-1.5 md:p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
            </button>
            <span className="text-white font-medium text-xs md:text-sm tabular-nums min-w-[60px] md:min-w-[80px] text-center">Ep {currentEpisode} / {totalEpisodes}</span>
            <button onClick={() => currentEpisode < totalEpisodes && goToEpisode(currentEpisode + 1)} disabled={currentEpisode >= totalEpisodes} className="p-1.5 md:p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors">
              <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
            </button>
          </div>
        </div>
      </div>

      {showEpisodeList && (
        <>
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[60]" onClick={() => setShowEpisodeList(false)} />
          <div className="fixed inset-y-0 right-0 w-72 bg-zinc-900 z-[70] overflow-y-auto border-l border-white/10 shadow-2xl animate-in slide-in-from-right">
            <div className="p-4 border-b border-white/10 sticky top-0 bg-zinc-900 z-10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <h2 className="font-bold text-white">Daftar Episode</h2>
                <span className="text-xs text-white/60 bg-white/10 px-2 py-0.5 rounded-full">Total {totalEpisodes}</span>
              </div>
              <button onClick={() => setShowEpisodeList(false)} className="p-1 text-white/70 hover:text-white">
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
            <div className="p-3 grid grid-cols-5 gap-2">
              {Array.from({ length: totalEpisodes }, (_, i) => i + 1).map((epNum) => (
                <button key={epNum} onClick={() => goToEpisode(epNum)} className={`aspect-square flex items-center justify-center rounded-lg text-sm font-medium transition-all ${epNum === currentEpisode ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"}`}>
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
