
"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import { useMeloloDetail, useMeloloStream } from "@/hooks/useMelolo";
import { ChevronLeft, ChevronRight, Loader2, List, AlertCircle, Settings } from "lucide-react";
import Link from "next/link";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getWatchSession, updateWatchSession } from "@/lib/watch-session";

interface VideoQuality {
  name: string;
  url: string;
}

export default function MeloloWatchPage() {
  const params = useParams<{ bookId: string; videoId: string }>();
  const router = useRouter();
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [userSelectedQualityName, setUserSelectedQualityName] = useState<string | null>(null);
  
  // params.videoId is now a random token, not the real video ID
  const [currentToken, setCurrentToken] = useState(params.videoId || "");
  
  // Resolve real videoId from session token
  const session = getWatchSession(currentToken);
  const [currentVideoId, setCurrentVideoId] = useState(session?.episodeId || "");

  // Redirect to detail page if no valid session (direct URL access)
  useEffect(() => {
    if (!session && params.videoId) {
      router.replace(`/detail/melolo/${params.bookId}`);
    }
  }, [session, params.videoId, params.bookId, router]);

  // Keep previous data to avoid unmounting video during transitions
  const { data: detailData, isLoading: detailLoading } = useMeloloDetail(params.bookId || "");
  const { data: streamData, isLoading: streamLoading, isFetching: streamFetching } = useMeloloStream(currentVideoId);

  const drama = detailData?.data?.video_data;
  const rawVideoModel = streamData?.data?.video_model;

  // Process video qualities
  const qualities = useMemo(() => {
    const fixProtocol = (urlStr?: string) => {
      if (!urlStr) return "";
      if (urlStr.startsWith("http://api.sansekai.my.id")) {
        return urlStr.replace("http://api.sansekai.my.id", "https://api.sansekai.my.id");
      }
      return urlStr;
    };

    if (!streamData) return [];
    const availableQualities: VideoQuality[] = [];

    // 1. Direct qualities array from streamData (new endpoint /melolo/episode response)
    if (Array.isArray(streamData.qualities) && streamData.qualities.length > 0) {
      streamData.qualities.forEach((q: any) => {
        const streamUrl = fixProtocol(q.streamUrl || q.url || q.main_url || q.backupUrl);
        if (streamUrl) {
          availableQualities.push({
            name: q.definition || q.quality || "Default",
            url: streamUrl,
          });
        }
      });
    }

    // 2. Direct qualities inside streamData.data
    if (availableQualities.length === 0 && Array.isArray(streamData.data?.qualities)) {
      streamData.data.qualities.forEach((q: any) => {
        const streamUrl = fixProtocol(q.streamUrl || q.url || q.main_url || q.backupUrl);
        if (streamUrl) {
          availableQualities.push({
            name: q.definition || q.quality || "Default",
            url: streamUrl,
          });
        }
      });
    }

    // 3. Top-level streamUrl / url in streamData
    if (availableQualities.length === 0 && (streamData.streamUrl || streamData.url || streamData.main_url)) {
      const mainUrl = fixProtocol(streamData.streamUrl || streamData.url || streamData.main_url);
      if (mainUrl) {
        availableQualities.push({
          name: streamData.definition || "Default",
          url: mainUrl,
        });
      }
    }

    // 4. Legacy fallback (video_model / data.main_url)
    if (availableQualities.length === 0) {
      try {
        let parsedModel = null;
        if (rawVideoModel) {
          parsedModel = typeof rawVideoModel === "string" ? JSON.parse(rawVideoModel) : rawVideoModel;
        }
        const videoList = parsedModel?.video_list;

        if (videoList) {
          const qualityMap: Record<string, string> = {
            video_1: "240p",
            video_2: "360p",
            video_3: "480p",
            video_4: "540p",
            video_5: "720p",
          };

          Object.entries(videoList).forEach(([key, value]: [string, any]) => {
            const finalUrl = fixProtocol(value?.main_url_decoded || value?.main_url);
            if (finalUrl) {
              availableQualities.push({
                name: value?.definition || qualityMap[key] || key,
                url: finalUrl,
              });
            }
          });
        }

        if (availableQualities.length === 0 && streamData?.data?.main_url) {
          availableQualities.push({
            name: "Default",
            url: fixProtocol(streamData.data.main_url),
          });
        }
      } catch (e) {
        console.error("Error parsing video model", e);
      }
    }

    // Sort qualities from highest to lowest resolution for display in dropdown menu
    availableQualities.sort((a, b) => {
      const parseRes = (name: string) => parseInt(name.replace(/[^0-9]/g, "")) || 0;
      return parseRes(b.name) - parseRes(a.name);
    });

    return availableQualities;
  }, [rawVideoModel, streamData]);

  // Determine active quality (prefer user choice if set, else 540p, 480p, 360p, 240p, or qualities[0])
  const activeQuality = useMemo(() => {
    if (qualities.length === 0) return null;

    if (userSelectedQualityName) {
      const match = qualities.find((q) => q.name === userSelectedQualityName);
      if (match) return match;
    }

    return (
      qualities.find((q) => q.name.includes("540")) ||
      qualities.find((q) => q.name.includes("480")) ||
      qualities.find((q) => q.name.includes("360")) ||
      qualities.find((q) => q.name.includes("240")) ||
      qualities[0]
    );
  }, [qualities, userSelectedQualityName]);

  // Find current episode index
  const currentEpisodeIndex = drama?.video_list?.findIndex(v => v.vid === currentVideoId) ?? -1;
  const totalEpisodes = drama?.video_list?.length || 0;

  const handleEpisodeChange = (index: number) => {
    if (!drama?.video_list?.[index]) return;
    const nextVideoId = drama.video_list[index].vid;
    
    // Update internal state with REAL videoId for API calls
    setCurrentVideoId(nextVideoId);
    
    // Update session token and URL with NEW random token
    const newToken = updateWatchSession(currentToken, { episodeId: nextVideoId });
    setCurrentToken(newToken);
    const newUrl = `/watch/melolo/${params.bookId}/${newToken}`;
    window.history.pushState({ path: newUrl }, "", newUrl);
    
    setShowEpisodeList(false);
  };

  const handleVideoEnded = () => {
    if (currentEpisodeIndex !== -1 && currentEpisodeIndex < totalEpisodes - 1) {
      handleEpisodeChange(currentEpisodeIndex + 1);
    }
  };

  // Guard: If logic fails completely and we have no data after loading
  if (!detailLoading && !drama) {
    return (
       <main className="fixed inset-0 bg-black flex flex-col items-center justify-center p-4">
        <AlertCircle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold text-white mb-4">Video tidak ditemukan</h2>
        <button onClick={() => router.back()} className="text-primary hover:underline">
          Kembali
        </button>
      </main>
    )
  }

  return (
    <main className="fixed inset-0 bg-black flex flex-col">
       {/* Header Overlay */}
       <div className="absolute top-0 left-0 right-0 z-40 h-16 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-b from-black/90 via-black/50 to-transparent" />
        <div className="relative z-10 flex items-center justify-between h-full px-4 max-w-7xl mx-auto pointer-events-auto">
          <Link
            href={`/detail/melolo/${params.bookId}`}
            className="flex items-center gap-2 text-white/90 hover:text-white transition-colors p-2 -ml-2 rounded-full hover:bg-white/10"
          >
            <ChevronLeft className="w-6 h-6" />
            <span className="text-primary font-bold hidden sm:inline shadow-black drop-shadow-md">SekaiDrama</span>
          </Link>

          <div className="text-center flex-1 px-4 min-w-0">
            <h1 className="text-white font-medium truncate text-sm sm:text-base drop-shadow-md">
              {drama?.series_title || "Loading..."}
            </h1>
            <p className="text-white/80 text-xs drop-shadow-md">
              Episode {currentEpisodeIndex !== -1 ? currentEpisodeIndex + 1 : "..."}
            </p>
          </div>

          <div className="flex items-center gap-2">
             {/* Quality Selector */}
             <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-2 text-white/90 hover:text-white transition-colors rounded-full hover:bg-white/10 flex items-center gap-1">
                  <Settings className="w-6 h-6 drop-shadow-md" />
                  <span className="text-xs font-bold drop-shadow-md hidden sm:inline">{activeQuality?.name || "..."}</span>
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="bg-black/90 border-white/10 text-white">
                {qualities.map((q) => (
                  <DropdownMenuItem 
                    key={q.name}
                    className={`cursor-pointer ${activeQuality?.name === q.name ? "bg-white/20 font-bold text-primary" : "hover:bg-white/10"}`}
                    onClick={() => setUserSelectedQualityName(q.name)}
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
            {activeQuality ? (
              <video
                ref={videoRef}
                src={activeQuality.url}
                controls
                autoPlay
                playsInline
                onEnded={handleVideoEnded}
                className="w-full h-full object-contain max-h-[100dvh]"
              />
            ) : (
                // Fallback while loading quality
                <div className="w-full h-full flex items-center justify-center text-white/50">
                    {streamLoading || streamFetching ? (
                      <Loader2 className="w-12 h-12 animate-spin text-primary drop-shadow-md" />
                    ) : (
                      "Video unavailable"
                    )}
                </div>
            )}
            
            {/* Loading Overlay */}
            {(streamLoading || streamFetching || detailLoading) && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-30 pointer-events-none">
                 <Loader2 className="w-12 h-12 animate-spin text-primary drop-shadow-md" />
              </div>
            )}
         </div>

         {/* Navigation Controls */}
         <div className="absolute bottom-20 md:bottom-12 left-0 right-0 z-40 pointer-events-none flex justify-center pb-safe-area-bottom">
            <div className={`flex items-center gap-2 md:gap-6 pointer-events-auto bg-black/60 backdrop-blur-md px-3 py-1.5 md:px-6 md:py-3 rounded-full border border-white/10 shadow-lg transition-all scale-90 md:scale-100 origin-bottom ${showEpisodeList ? 'opacity-0' : 'opacity-100'}`}>
                <button
                  onClick={() => currentEpisodeIndex > 0 && handleEpisodeChange(currentEpisodeIndex - 1)}
                  disabled={currentEpisodeIndex <= 0}
                  className="p-1.5 md:p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4 md:w-6 md:h-6" />
                </button>
                
                <span className="text-white font-medium text-xs md:text-sm tabular-nums min-w-[60px] md:min-w-[80px] text-center">
                  Ep {currentEpisodeIndex !== -1 ? currentEpisodeIndex + 1 : "-"} / {totalEpisodes}
                </span>

                <button
                  onClick={() => currentEpisodeIndex < totalEpisodes - 1 && handleEpisodeChange(currentEpisodeIndex + 1)}
                  disabled={currentEpisodeIndex >= totalEpisodes - 1}
                  className="p-1.5 md:p-2 rounded-full text-white disabled:opacity-30 hover:bg-white/10 transition-colors"
                >
                  <ChevronRight className="w-4 h-4 md:w-6 md:h-6" />
                </button>
            </div>
         </div>
       </div>

       {/* Episode List Sidebar */}
       {showEpisodeList && drama && (
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
              {drama.video_list.map((video, idx) => (
                <button
                  key={video.vid}
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
