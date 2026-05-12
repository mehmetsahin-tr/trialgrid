import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Adverse Event Form Generator — Trialgrids",
  description:
    "Generate printable adverse event (AE) forms for BE/BA clinical studies. Free, browser-based, ICH E2A aligned. No accounts, no uploads.",
  alternates: { canonical: "https://trialgrids.com/tools/adverse-event" },
  openGraph: {
    title: "Adverse Event Form Generator — Trialgrids",
    description:
      "Free browser-based AE form generator for clinical research. Fill at the bedside, print, sign, attach to CRF.",
    url: "https://trialgrids.com/tools/adverse-event",
    siteName: "Trialgrids",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Adverse Event Form Generator — Trialgrids",
    description:
      "Free browser-based AE form generator for clinical research.",
  },
};

export default function AdverseEventLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
