"use client";

import { create } from "zustand";

export type Platform = "pinedrama" | "dramabox" | "reelshort" | "shortmax" | "netshort" | "melolo" | "freereels" | "dramanova" | "goodshort";

export interface PlatformInfo {
  id: Platform;
  name: string;
  logo: string;
  apiBase: string;
}

export const PLATFORMS: PlatformInfo[] = [
  {
    id: "pinedrama",
    name: "PineDrama",
    logo: "/pinedrama.png",
    apiBase: "/api/pinedrama",
  },
  {
    id: "dramabox",
    name: "DramaBox",
    logo: "/dramabox.webp",
    apiBase: "/api/dramabox",
  },
  {
    id: "reelshort",
    name: "ReelShort",
    logo: "/reelshort.webp",
    apiBase: "/api/reelshort",
  },
  {
    id: "shortmax",
    name: "ShortMax",
    logo: "/shortmax.webp",
    apiBase: "/api/shortmax",
  },
  {
    id: "netshort",
    name: "NetShort",
    logo: "/netshort.webp",
    apiBase: "/api/netshort",
  },
  // {
  //   id: "melolo",
  //   name: "Melolo",
  //   logo: "/melolo.webp",
  //   apiBase: "/api/melolo",
  // },

  {
    id: "freereels",
    name: "FreeReels",
    logo: "/freereels.webp",
    apiBase: "/api/freereels",
  },
  {
    id: "dramanova",
    name: "DramaNova",
    logo: "/dramanova.png",
    apiBase: "/api/dramanova",
  },
  {
    id: "goodshort",
    name: "GoodShort",
    logo: "/goodshort.jpg",
    apiBase: "/api/goodshort",
  },
];

interface PlatformState {
  currentPlatform: Platform;
  setPlatform: (platform: Platform) => void;
}

export const usePlatformStore = create<PlatformState>((set) => ({
  currentPlatform: "pinedrama",
  setPlatform: (platform) => set({ currentPlatform: platform }),
}));

export function usePlatform() {
  const { currentPlatform, setPlatform } = usePlatformStore();
  const platformInfo = PLATFORMS.find((p) => p.id === currentPlatform)!;

  const getPlatformInfo = (platformId: Platform) => {
    return PLATFORMS.find((p) => p.id === platformId) || PLATFORMS[0];
  };

  return {
    currentPlatform,
    platformInfo,
    setPlatform,
    platforms: PLATFORMS,
    getPlatformInfo,
    isPineDrama: currentPlatform === "pinedrama",
    isDramaBox: currentPlatform === "dramabox",
    isReelShort: currentPlatform === "reelshort",
    isShortMax: currentPlatform === "shortmax",
    isNetShort: currentPlatform === "netshort",
    isMelolo: currentPlatform === "melolo",
    isFreeReels: currentPlatform === "freereels",
    isDramaNova: currentPlatform === "dramanova",
    isGoodShort: currentPlatform === "goodshort",
  };
}
