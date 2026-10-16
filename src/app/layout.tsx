import type { Metadata, Viewport } from "next";
import Link from "next/link";
import { Nav } from "@/components/Nav";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Padli – Vind. Speel. Verbind.", template: "%s · Padli" },
  description: "Vind padelspelers van jouw niveau in Leuven en omgeving. Plaats een oproep, reageer en speel.",
  applicationName: "Padli",
  metadataBase: new URL(process.env.APP_URL ?? "http://localhost:3000"),
  openGraph: { siteName: "Padli", locale: "nl_BE", type: "website" },
};

export const viewport: Viewport = { themeColor: "#15803d", width: "device-width", initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="nl-BE">
      <body className="flex min-h-dvh flex-col">
        <a href="#inhoud" className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-white focus:p-2">
          Naar de inhoud
        </a>
        <Nav />
        <main id="inhoud" className="mx-auto w-full max-w-5xl flex-1 px-4 py-6 pb-24 md:pb-10">
          {children}
        </main>
        <footer className="border-t border-stone-200 bg-white pb-20 md:pb-0">
          <div className="mx-auto flex max-w-5xl flex-wrap gap-x-5 gap-y-2 px-4 py-6 text-sm text-stone-600">
            <span className="font-semibold text-brand-700">Padli · Vind. Speel. Verbind.</span>
            <Link href="/over">Over</Link>
            <Link href="/faq">FAQ</Link>
            <Link href="/communityregels">Communityregels</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/voorwaarden">Voorwaarden</Link>
          </div>
        </footer>
      </body>
    </html>
  );
}
