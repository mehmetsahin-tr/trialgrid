import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Inter } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";
import "./globals.css";
import Header from "./components/Header";
import Sidebar from "./components/Sidebar";
import Link from "next/link";

const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  style: ["normal", "italic"],
  weight: ["400", "600"],
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
  weight: ["400", "500"],
});

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
  weight: ["400", "500", "600"],
});

const TITLE = "trialgrids — Clinical Research Tables, Digitized";
const DESCRIPTION =
  "Generate randomization schedules and SPIRIT-style assessment tables in your browser. No accounts. No uploads. Your data never leaves this device.";

export const metadata: Metadata = {
  metadataBase: new URL("https://trialgrids.com"),
  title: TITLE,
  description: DESCRIPTION,
  robots: { index: true, follow: true },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://trialgrids.com",
    siteName: "Trialgrids",
    type: "website",
    locale: "en_US",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "Trialgrids — Clinical Research Tables, Digitized",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-96x96.png", sizes: "96x96", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180" },
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${jetbrainsMono.variable} ${inter.variable}`}
    >
      <body>
        <Header />
        <div className="page-wrapper">
          <Sidebar />
          {children}
        </div>
        <footer>
          <div className="footer-tools">
            <Link href="/tools/randomization">Randomization</Link>
            <span className="footer-sep">·</span>
            <Link href="/tools/timetable">Time Table</Link>
            <span className="footer-sep">·</span>
            <Link href="/tools/meal-log">Meal Log</Link>
            <span className="footer-sep">·</span>
            <Link href="/tools/sample-shipment">Sample Shipment</Link>
            <span className="footer-sep">·</span>
            <Link href="/tools/tube-labels">Tube Labels</Link>
            <span className="footer-sep">·</span>
            <Link href="/tools/adverse-event">Adverse Event</Link>
          </div>
          <div className="footer-legal">
            © 2026 Trialgrids ·{" "}
            <Link href="/privacy">Privacy</Link> ·{" "}
            <Link href="/terms">Terms</Link> ·{" "}
            <Link href="/contact">Contact</Link> · Built for clinical researchers
          </div>
        </footer>
        <Analytics />
      </body>
    </html>
  );
}