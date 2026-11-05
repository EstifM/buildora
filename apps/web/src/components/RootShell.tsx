import type { ReactNode } from "react";
import { Geist, Geist_Mono, Noto_Sans_Ethiopic } from "next/font/google";
import type { Locale } from "@resume-builder/shared";
import { LocalePreference } from "@/components/LocalePreference";
import { LocaleProvider } from "@/components/LocaleProvider";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import "../app/globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });
// Geist has no Ethiopic letters; this keeps Amharic consistent on every device.
const notoEthiopic = Noto_Sans_Ethiopic({ variable: "--font-noto-ethiopic", subsets: ["ethiopic"] });

// Shared <html>/<body> for each language's root layout (English at "/", Amharic at "/am").
export function RootShell({ locale, children }: { locale: Locale; children: ReactNode }) {
  const fonts = [geistSans.variable, geistMono.variable, locale === "am" ? notoEthiopic.variable : ""].join(" ");
  return (
    <html lang={locale} className={`${fonts} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <LocaleProvider locale={locale}>
          <LocalePreference />
          <SiteHeader />
          <main className="flex-1">{children}</main>
          <SiteFooter locale={locale} />
        </LocaleProvider>
      </body>
    </html>
  );
}
