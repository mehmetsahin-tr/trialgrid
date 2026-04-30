import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sample Shipment Calculator — Trialgrids",
  description:
    "Calculate the exact number of bioanalytical samples to ship at study end. Tracks drop-outs, no-shows, and lost samples with master/backup aliquoting. Audit-ready PDF export. Free, browser-based, no signup.",
  alternates: { canonical: "https://trialgrids.com/tools/sample-shipment" },
  openGraph: {
    title: "Sample Shipment Calculator — Trialgrids",
    description:
      "Audit-ready sample counting for BE/BA studies. Master + backup aliquots, drop-out handling, lost sample tracking.",
    url: "https://trialgrids.com/tools/sample-shipment",
    images: [{ url: "/og-image.png" }],
  },
};

export default function SampleShipmentLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
