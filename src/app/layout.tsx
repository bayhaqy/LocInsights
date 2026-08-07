import type { Metadata } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "@/components/ui/toaster";

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
    "LocInsight (Location Insight) — data-driven retail expansion decisioning system for PT MAP Aktif Adiperkasa Tbk. Identifies optimal store expansion opportunities across Bali (Phase 1) using composite ML scoring and Huff gravity market-share modeling.",
  keywords: [
    "LocInsight",
    "Location Intelligence",
    "MAP Active",
    "Adiperkasa",
    "Retail Site Selection",
    "Geomarketing",
    "Huff Model",
    "Bali",
    "Expansion Strategy",
  ],
  authors: [{ name: "MAP Active Data Team" }],
  icons: {
    icon: "https://z-cdn.chatglm.cn/z-ai/static/logo.svg",
  },
  openGraph: {
    title: "LocInsight — Location Intelligence",
    description: "Data-driven retail expansion decisioning for MAP Active",
    siteName: "LocInsight",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" suppressHydrationWarning>
      <body
        className={`${inter.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        {children}
        <Toaster />
      </body>
    </html>
  );
}
