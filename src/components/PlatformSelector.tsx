"use client";

import Image from "next/image";
import { ChevronDown } from "lucide-react";
import { usePlatform, type PlatformInfo } from "@/hooks/usePlatform";
import { useState, useRef, useEffect } from "react";

export function PlatformSelector() {
  const { currentPlatform, setPlatform, platforms, getPlatformInfo } = usePlatform();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  
  const currentPlatformInfo = getPlatformInfo(currentPlatform);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="w-full py-4 px-4">
      {/* Mobile: Dropdown */}
      <div className="block md:hidden" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl bg-muted/50 hover:bg-muted/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="relative w-6 h-6 rounded-md overflow-hidden">
              <Image
                src={currentPlatformInfo.logo}
                alt={currentPlatformInfo.name}
                fill
                className="object-cover"
                sizes="24px"
              />
            </div>
            <span className="font-medium text-foreground">
              {currentPlatformInfo.name}
            </span>
          </div>
          <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {/* Dropdown Menu */}
        {isOpen && (
          <div className="absolute left-4 right-4 mt-2 bg-card rounded-xl shadow-lg border border-border overflow-hidden z-50">
            {platforms.map((platform) => (
              <button
                key={platform.id}
                onClick={() => {
                  setPlatform(platform.id);
                  setIsOpen(false);
                }}
                className={`w-full flex items-center gap-3 px-4 py-3 transition-colors ${
                  currentPlatform === platform.id 
                    ? 'bg-primary/10 text-primary' 
                    : 'hover:bg-muted/50'
                }`}
              >
                <div className="relative w-6 h-6 rounded-md overflow-hidden">
                  <Image
                    src={platform.logo}
                    alt={platform.name}
                    fill
                    className="object-cover"
                    sizes="24px"
                  />
                </div>
                <span className="font-medium">{platform.name}</span>
                {currentPlatform === platform.id && (
                  <span className="ml-auto w-2 h-2 rounded-full bg-primary" />
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Desktop: Horizontal scrollable tabs */}
      <div className="hidden md:flex items-center gap-3 overflow-x-auto scrollbar-hide pb-1">
        {platforms.map((platform) => (
          <PlatformButton
            key={platform.id}
            platform={platform}
            isActive={currentPlatform === platform.id}
            onClick={() => setPlatform(platform.id)}
          />
        ))}
      </div>
    </div>
  );
}

interface PlatformButtonProps {
  platform: PlatformInfo;
  isActive: boolean;
  onClick: () => void;
}

function PlatformButton({ platform, isActive, onClick }: PlatformButtonProps) {
  return (
    <button
      onClick={onClick}
      className={`
        relative flex items-center gap-2 px-4 py-2.5 rounded-full
        transition-all duration-300 ease-out flex-shrink-0
        ${
          isActive
            ? "bg-primary/20 ring-2 ring-primary shadow-lg shadow-primary/20"
            : "bg-muted/50 hover:bg-muted/80"
        }
      `}
    >
      <div className="relative w-6 h-6 rounded-md overflow-hidden">
        <Image
          src={platform.logo}
          alt={platform.name}
          fill
          className="object-cover"
          sizes="24px"
        />
      </div>
      <span
        className={`
          font-medium text-sm whitespace-nowrap
          ${isActive ? "text-primary" : "text-muted-foreground"}
        `}
      >
        {platform.name}
      </span>
      {isActive && (
        <span className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-primary animate-pulse" />
      )}
    </button>
  );
}
