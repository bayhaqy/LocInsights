import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { LanguageProvider } from "@/lib/i18n/language-provider";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LocInsight — Location Intelligence for MAP Active",
  description:
    "LocInsight (Location Insight) — data-driven retail expansion decisioning system for PT MAP Aktif Adiperkasa Tbk. Identifies optimal store expansion opportunities across Bali using composite ML scoring, Huff gravity modeling, competitor intel, GBR revenue prediction, and field-surveyor PWA.",
  keywords: [
    "LocInsight",
    "Location Intelligence",
    "MAP Active",
    "Adiperkasa",
    "Retail Site Selection",
    "Geomarketing",
    "Huff Model",
    "Gradient Boosting",
    "Bali",
    "Expansion Strategy",
  ],
  authors: [{ name: "MAP Active Data Team" }],
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/logo-192.png", sizes: "192x192", type: "image/png" },
      { url: "/logo-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  appleWebApp: {
    capable: true,
    title: "LocInsight",
    statusBarStyle: "black-translucent",
  },
  applicationName: "LocInsight",
  openGraph: {
    title: "LocInsight — Location Intelligence",
    description: "Data-driven retail expansion decisioning for MAP Active",
    siteName: "LocInsight",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#7A0A1A",
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <LanguageProvider>
          {children}
          <Toaster />
          <SonnerToaster position="top-right" richColors closeButton />
        </LanguageProvider>
        {/* PWA service worker — registers after page load, defers to avoid blocking */}
        <script
          dangerouslySetInnerHTML={{
            __html: `if ('serviceWorker' in navigator) {
              window.addEventListener('load', function() {
                navigator.serviceWorker.register('/sw.js').catch(function(e) {
                  console.warn('SW registration failed:', e);
                });
              });
            }`,
          }}
        />
      </body>
    </html>
  );
}
