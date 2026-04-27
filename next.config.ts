import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  logging: {
    fetches: {
      fullUrl: false,
    },
  },
  images: {
    minimumCacheTTL: 7200, // Cache optimized images for 2 hours
    remotePatterns: [
      {
        protocol: "https",
        hostname: "imgcdnmi.dramaboxdb.com",
      },
      {
        protocol: "https",
        hostname: "hwztchapter.dramaboxdb.com",
      },
      {
        protocol: "https",
        hostname: "awscover.netshort.com",
      },
      {
        protocol: "https",
        hostname: "static.netshort.com",
      },
      {
        protocol: "https",
        hostname: "cover.netshort.com",
      },
      {
        protocol: "https",
        hostname: "alicdn.netshort.com",
      },
      {
        protocol: "https",
        hostname: "zshipubcdn.farsunpteltd.com",
      },
      {
        protocol: "https",
        hostname: "zshipricf.farsunpteltd.com",
      },
      {
        protocol: "https",
        hostname: "wsrv.nl",
      },
    ],
  },
  async headers() {
    return [
      {
        // Cache all static assets (JS, CSS, fonts, etc.) for 1 year (immutable)
        source: "/_next/static/:path*",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
      {
        // Cache Next.js optimized images for 2 hours
        source: "/_next/image",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=7200, stale-while-revalidate=3600",
          },
        ],
      },
      {
        // Cache public assets (favicon, logos, etc.) for 2 hours
        source: "/:path(.*\\.(?:ico|png|jpg|jpeg|svg|webp|gif))",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=7200, stale-while-revalidate=3600",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
