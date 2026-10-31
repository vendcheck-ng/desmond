const host = (() => { try { return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).hostname; } catch { return "localhost"; } })();

/** @type {import('next').NextConfig} */
export default {
  poweredByHeader: false,
  images: { remotePatterns: [{ protocol: "https", hostname: host, pathname: "/storage/v1/object/public/**" }] },
  experimental: { serverActions: { bodySizeLimit: "12mb" } },
  async headers() {
    return [{ source: "/(.*)", headers: [
      { key: "X-Content-Type-Options", value: "nosniff" },
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      { key: "X-Frame-Options", value: "DENY" },
    ] }];
  },
};
