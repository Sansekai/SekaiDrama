"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import type { ReelShortBanner } from "@/types/reelshort";
import { optimizeBanner } from "@/lib/image-utils";

interface BannerCarouselProps {
  banners: ReelShortBanner[];
  autoPlayInterval?: number;
}

export function BannerCarousel({
  banners,
  autoPlayInterval = 5000,
}: BannerCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % banners.length);
  }, [banners.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + banners.length) % banners.length);
  }, [banners.length]);

  // Auto-play
  useEffect(() => {
    if (isHovered || banners.length <= 1) return;

    const interval = setInterval(nextSlide, autoPlayInterval);
    return () => clearInterval(interval);
  }, [isHovered, nextSlide, autoPlayInterval, banners.length]);

  if (banners.length === 0) return null;

  const currentBanner = banners[currentIndex];

  return (
    <div
      className="relative w-full aspect-[3/1] md:aspect-[4/1] rounded-2xl overflow-hidden group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Banner Image */}
      <Link href={`/detail/reelshort/${currentBanner.jump_param.book_id}`}>
        <img
          src={optimizeBanner(currentBanner.pic)}
          alt={currentBanner.jump_param.book_title}
          className="w-full h-full object-cover transition-transform duration-700"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-r from-background/90 via-background/40 to-transparent" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 via-transparent to-transparent" />

        {/* Content */}
        <div className="absolute bottom-6 left-6 right-20 space-y-3">
          {/* Artistic Title */}
          {currentBanner.pic_artistic_word && (
            <img
              src={optimizeBanner(currentBanner.pic_artistic_word)}
              alt=""
              className="h-12 md:h-16 object-contain"
            />
          )}

          <h3 className="text-lg md:text-xl font-bold text-white line-clamp-1">
            {currentBanner.jump_param.book_title}
          </h3>

          {/* Tags */}
          {currentBanner.jump_param.book_theme && (
            <div className="flex flex-wrap gap-2">
              {currentBanner.jump_param.book_theme.slice(0, 3).map((theme) => (
                <span
                  key={theme}
                  className="px-2 py-0.5 rounded-full text-xs bg-white/20 text-white backdrop-blur-sm"
                >
                  {theme}
                </span>
              ))}
            </div>
          )}

          {/* Play Button */}
          {currentBanner.play_button === 1 && (
            <button className="flex items-center gap-2 px-4 py-2 rounded-full bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <Play className="w-4 h-4 fill-current" />
              Tonton
            </button>
          )}
        </div>

        {/* Badge */}
        {currentBanner.book_mark?.text && (
          <div
            className="absolute top-4 left-4 px-3 py-1 rounded-md text-xs font-bold"
            style={{
              backgroundColor: currentBanner.book_mark.color || "#E52E2E",
              color: currentBanner.book_mark.text_color || "#FFFFFF",
            }}
          >
            {currentBanner.book_mark.text}
          </div>
        )}
      </Link>

      {/* Navigation Arrows */}
      {banners.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.preventDefault();
              prevSlide();
            }}
            className="absolute left-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            onClick={(e) => {
              e.preventDefault();
              nextSlide();
            }}
            className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full bg-background/80 backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity hover:bg-background"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {banners.length > 1 && (
        <div className="absolute bottom-4 right-4 flex items-center gap-1.5">
          {banners.slice(0, 10).map((_, idx) => (
            <button
              key={idx}
              onClick={(e) => {
                e.preventDefault();
                setCurrentIndex(idx);
              }}
              className={`
                w-2 h-2 rounded-full transition-all duration-200
                ${
                  idx === currentIndex
                    ? "bg-primary w-6"
                    : "bg-white/50 hover:bg-white/80"
                }
              `}
            />
          ))}
        </div>
      )}
    </div>
  );
}
