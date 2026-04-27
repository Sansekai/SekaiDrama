"use client";

import Link from "next/link";
import { Play } from "lucide-react";
import { optimizeCover } from "@/lib/image-utils";

export interface BadgeConfig {
  text: string;
  color?: string;       // Background color (e.g., "#E52E2E" or "hsl(var(--primary))")
  textColor?: string;   // Text color (default white)
  isTransparent?: boolean; // If true, uses black/60 backdrop
}

export interface UnifiedMediaCardProps {
  title: string;
  cover: string;
  link: string;
  episodes?: number;
  topLeftBadge?: BadgeConfig | null;
  topRightBadge?: BadgeConfig | null;
  index?: number;
}

export function UnifiedMediaCard({
  title,
  cover,
  link,
  episodes = 0,
  topLeftBadge,
  topRightBadge,
  index = 0,
}: UnifiedMediaCardProps) {
  
  // SHARED STYLES
  // Responsive: Mobile (Default) -> smaller | Desktop (md:) -> regular 10px
  // Using text-[8px] for mobile and text-[10px] for desktop
  // Note: Removed absolute positioning from BASE, moving it to container
  const BADGE_BASE = "px-1 py-0.5 md:px-1.5 rounded font-bold text-white shadow-sm leading-none tracking-wide flex items-center justify-center font-sans text-[8px] md:text-[10px]";
  
  const BADGE_FONT = { 
    lineHeight: "1",      
    fontFamily: "inherit"
  };

  return (
    <Link
      href={link}
      className="group relative block"
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Visual Container */}
      <div className="aspect-[2/3] relative overflow-hidden rounded-xl bg-muted/20">
        <img
          src={optimizeCover(cover)}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
          loading="lazy"
          referrerPolicy="no-referrer"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent pointer-events-none" />

        {/* Badges Container - Flexbox to prevent overlap */}
        <div className="absolute top-1.5 left-1.5 right-1.5 md:top-2 md:left-2 md:right-2 flex justify-between items-start pointer-events-none z-10">
          
          {/* Top Left Badge - Allowed to truncate */}
          <div className="flex-1 min-w-0 pr-1 flex justify-start"> 
            {topLeftBadge && (
              <div 
                className={`${BADGE_BASE} truncate max-w-full`}
                style={{ 
                  ...BADGE_FONT,
                  backgroundColor: topLeftBadge.color || "#E52E2E",
                  color: topLeftBadge.textColor || "#FFFFFF"
                }}
              >
                {topLeftBadge.text}
              </div>
            )}
          </div>

          {/* Top Right Badge - Fixed width/Shrink 0 */}
          <div className="shrink-0 flex justify-end">
            {topRightBadge && (
              <div 
                className={`${BADGE_BASE} ${topRightBadge.isTransparent ? 'backdrop-blur-sm' : ''}`}
                style={{ 
                  ...BADGE_FONT,
                  backgroundColor: topRightBadge.isTransparent ? "rgba(0,0,0,0.6)" : (topRightBadge.color || "rgba(0,0,0,0.6)"),
                  color: topRightBadge.textColor || "#FFFFFF"
                }}
              >
                {topRightBadge.text}
              </div>
            )}
          </div>
        </div>

        {/* Episode Count */}
        {episodes > 0 && (
          <div className="absolute bottom-1.5 left-1.5 md:bottom-2 md:left-2 flex items-center gap-1 text-[9px] md:text-xs text-white font-medium pointer-events-none">
            <Play className="w-2.5 h-2.5 md:w-3 md:h-3 fill-white" />
            <span>{episodes} Ep</span>
          </div>
        )}

        {/* Center Play Button */}
        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300">
          <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-primary flex items-center justify-center shadow-lg transform scale-75 group-hover:scale-100 transition-transform duration-300">
            <Play className="w-4 h-4 md:w-5 md:h-5 text-white fill-white ml-0.5" />
          </div>
        </div>
      </div>

      {/* Title */}
      <div className="pt-2 md:pt-3 pb-1">
        <h3 className="font-display font-semibold text-xs md:text-sm leading-snug line-clamp-2 text-foreground group-hover:text-primary transition-colors">
          {title}
        </h3>
      </div>
    </Link>
  );
}
