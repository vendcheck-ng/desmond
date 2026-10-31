import type { Metadata, Viewport } from "next";
import { Fraunces, Instrument_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { DEFAULT_DESCRIPTION, DEFAULT_TITLE, OG_DEFAULT, SITE_NAME, SITE_URL } from "@/lib/site";

const display = Fraunces({
  subsets: ["latin"],
  style: ["normal", "italic"],
  axes: ["opsz"],
  variable: "--font-display-face",
  display: "swap",
});
const sans = Instrument_Sans({ subsets: ["latin"], variable: "--font-sans-face", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], variable: "--font-mono-face", display: "swap" });

// Search-console verification tokens are optional: set them in Vercel to claim the site, no code change needed.
const verification: Metadata["verification"] = {
  ...(process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION ? { google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION } : {}),
  ...(process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION ? { other: { "msvalidate.01": process.env.NEXT_PUBLIC_BING_SITE_VERIFICATION } } : {}),
};

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: DEFAULT_TITLE, template: `%s — ${SITE_NAME}` },
  description: DEFAULT_DESCRIPTION,
  applicationName: SITE_NAME,
  authors: [{ name: SITE_NAME, url: SITE_URL }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "en_NG",
    title: DEFAULT_TITLE,
    description: DEFAULT_DESCRIPTION,
    url: "/",
    images: [OG_DEFAULT],
  },
  twitter: { card: "summary_large_image", title: DEFAULT_TITLE, description: DEFAULT_DESCRIPTION, images: [OG_DEFAULT.url] },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1, "max-video-preview": -1 },
  },
  formatDetection: { telephone: false, email: false, address: false },
  ...(Object.keys(verification).length ? { verification } : {}),
};
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#0B0B0A",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${sans.variable} ${mono.variable}`}>
      <head>
        {/* Without JavaScript: show everything animated-in, and show the desktop nav on phones. */}
        <noscript>
          <style>{`[data-motion]{opacity:1!important;transform:none!important}.menu-btn{display:none!important}.nav-desktop{display:flex!important;flex-wrap:wrap}`}</style>
        </noscript>
      </head>
      <body>{children}</body>
    </html>
  );
}
