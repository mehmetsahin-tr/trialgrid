import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Randomization Tool for BE/BA & Crossover Trials — Trialgrids",
  description:
    "Free, browser-based randomization generator for bioequivalence, bioavailability, and crossover clinical trials. Seeded, reproducible, SPIRIT-ready exports. No sign-up.",
  keywords: [
    "randomization for bioequivalence",
    "bioequivalence randomization tool",
    "crossover study randomization",
    "2x2 crossover randomization",
    "Williams design randomization",
    "Latin square randomization",
    "clinical trial randomization generator",
    "block randomization online",
    "biyoeşdeğerlik randomizasyon",
    "biyoyararlanım randomizasyon",
    "çapraz çalışma randomizasyon",
    "klinik araştırma randomizasyon",
  ],
  alternates: {
    canonical: "https://trialgrids.com/tools/randomization",
  },
  openGraph: {
    title: "Randomization Tool for BE/BA & Crossover Trials",
    description:
      "Free, browser-based randomization generator for bioequivalence and crossover clinical trials. SPIRIT-ready exports. No accounts.",
    url: "https://trialgrids.com/tools/randomization",
    type: "website",
    siteName: "Trialgrids",
  },
  twitter: {
    card: "summary_large_image",
    title: "Randomization Tool for BE/BA & Crossover Trials",
    description:
      "Free, browser-based randomization for bioequivalence and crossover studies. SPIRIT-ready exports.",
  },
};

export default function RandomizationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
