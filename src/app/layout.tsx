import type { Metadata, Viewport } from "next";
import { Inter, Geist_Mono } from "next/font/google";
import "./globals.css";
import "leaflet/dist/leaflet.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";

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
        <SonnerToaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
