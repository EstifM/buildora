import type { Metadata } from "next";
import { Geist, Noto_Sans_Ethiopic } from "next/font/google";
import { NotFoundCard } from "@/components/NotFoundCard";
import { getTranslator } from "@/lib/i18n";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const notoEthiopic = Noto_Sans_Ethiopic({ variable: "--font-noto-ethiopic", subsets: ["ethiopic"] });

export const metadata: Metadata = { title: getTranslator("en")("seo.notFound.title") };

// The 404 page for every unknown address. It replaces the layouts, so it brings its own <html>.
export default function GlobalNotFound() {
  return (
    <html lang="en" className={`${geistSans.variable} ${notoEthiopic.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <NotFoundCard />
      </body>
    </html>
  );
}
