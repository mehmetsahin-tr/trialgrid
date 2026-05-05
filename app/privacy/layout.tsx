import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Trialgrids",
  description: "Trialgrids privacy policy. Privacy-first clinical research tools — no data collection, no cookies, no tracking.",
  alternates: { canonical: "https://trialgrids.com/privacy" },
};

export default function PrivacyLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
