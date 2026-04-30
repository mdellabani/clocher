import type { NextConfig } from "next";

const supabaseUrl = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? "http://localhost:54321");

const nextConfig: NextConfig = {
  transpilePackages: ["@pretou/shared"],
  images: {
    remotePatterns: [
      // Whatever NEXT_PUBLIC_SUPABASE_URL points at — handles both prod
      // (https://*.supabase.co) and local dev (http://localhost or 127.0.0.1).
      {
        protocol: supabaseUrl.protocol.replace(":", "") as "http" | "https",
        hostname: supabaseUrl.hostname,
        pathname: "/storage/v1/object/public/**",
      },
      // Fallback for the alternate localhost form so a 127.0.0.1 env doesn't
      // break when the image URL was generated from a "localhost" build (and
      // vice versa).
      { protocol: "http", hostname: "localhost", pathname: "/storage/v1/object/public/**" },
      { protocol: "http", hostname: "127.0.0.1", pathname: "/storage/v1/object/public/**" },
    ],
  },
};

export default nextConfig;
