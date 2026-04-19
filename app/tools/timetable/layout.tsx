import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SPIRIT Time Table Generator for Clinical & BE/BA Trials — Trialgrids",
  description:
    "Build SPIRIT-compliant schedule of assessments and study day time tables for clinical, bioequivalence, and bioavailability trials. Free, browser-based, no sign-up.",
  keywords: [
    "SPIRIT schedule generator",
    "schedule of assessments template",
    "SPIRIT compliant schedule",
    "clinical trial time table",
    "clinical trial visit schedule",
    "study day time table",
    "bioequivalence time table",
    "bioavailability study schedule",
    "crossover study time table",
    "BE/BA study schedule",
    "biyoeşdeğerlik time table",
    "klinik araştırma time table",
  ],
  alternates: {
    canonical: "https://trialgrids.com/tools/timetable",
  },
  openGraph: {
    title: "SPIRIT Time Table Generator for Clinical & BE/BA Trials",
    description:
      "Build SPIRIT-compliant schedule of assessments and study day time tables. Free, browser-based, no accounts.",
    url: "https://trialgrids.com/tools/timetable",
    type: "website",
    siteName: "Trialgrids",
  },
  twitter: {
    card: "summary_large_image",
    title: "SPIRIT Time Table Generator for Clinical & BE/BA Trials",
    description:
      "Build SPIRIT-compliant schedule of assessments for clinical and bioequivalence studies.",
  },
};

export default function TimetableLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
