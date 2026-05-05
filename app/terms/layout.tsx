import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use — Trialgrids",
  description: "Trialgrids terms of use. Free clinical research tools for BE/BA studies. Documentation aid only — not a medical device.",
  alternates: { canonical: "https://trialgrids.com/terms" },
};

export default function TermsLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
