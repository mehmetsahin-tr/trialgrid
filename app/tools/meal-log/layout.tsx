import type { Metadata } from "next";

const TITLE = "Meal Log for BE/BA & Crossover Trials — Trialgrids";
const DESCRIPTION =
  "Free, browser-based meal intake log for bioequivalence, bioavailability, and crossover clinical trials. Track start and end times, completion, and dropouts. SPIRIT-ready PDF export. No sign-up.";

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  keywords: [
    "meal log clinical trial",
    "meal intake tracking bioequivalence",
    "BE/BA study meal log",
    "clinical trial food intake log",
    "standardized meal tracking clinical study",
    "crossover trial meal schedule",
    "high-fat breakfast tracking clinical",
    "yemek takip formu",
    "biyoeşdeğerlik yemek takibi",
    "klinik araştırma öğün takibi",
    "BE/BA öğün formu",
    "gönüllü yemek çizelgesi",
    "çapraz çalışma yemek takibi",
  ],
  alternates: {
    canonical: "https://trialgrids.com/tools/meal-log",
  },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://trialgrids.com/tools/meal-log",
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
    description:
      "Free, browser-based meal intake log for BE/BA, bioavailability, and crossover trials. Track meal times, completion, and dropouts.",
    images: ["/og-image.png"],
  },
};

export default function MealLogLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
