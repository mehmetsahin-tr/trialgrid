import type { Metadata } from "next";
import { Fraunces, JetBrains_Mono, Inter } from "next/font/google";
import "./globals.css";
import Header from "./components/Header";
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

export const metadata: Metadata = {
  title: "Trialgrid — Clinical Research Tables, Digitized",
  description:
    "Generate randomization schedules and SPIRIT-style assessment tables in your browser. No accounts. No uploads. Your data never leaves this device.",
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
        {children}
        <footer>
          © 2026 Trialgrid ·{" "}
          <Link href="/privacy">Privacy</Link> ·{" "}
          <Link href="/terms">Terms</Link> ·{" "}
          <Link href="/contact">Contact</Link> · Built for clinical researchers
        </footer>
      </body>
    </html>
  );
}
