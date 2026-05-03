import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tube Label Generator — Trialgrids",
  description:
    "Generate printable tube labels for bioequivalence/bioavailability studies. Tanex TW-2052 compatible. Auto-packed sheets, point-transition separators, audit-ready output. Free, browser-based, no signup.",
  alternates: { canonical: "https://trialgrids.com/tools/tube-labels" },
  openGraph: {
    title: "Tube Label Generator — Trialgrids",
    description:
      "Auto-generated tube labels for BE/BA studies. Tanex compatible, point-transition separators, no waste.",
    url: "https://trialgrids.com/tools/tube-labels",
    images: [{ url: "/og-image.png" }],
  },
};

export default function TubeLabelsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
