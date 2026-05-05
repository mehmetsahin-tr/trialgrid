import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — Trialgrids",
  description: "Contact Trialgrids. Questions, feedback, bug reports — reach out directly. Response within 1 business day.",
  alternates: { canonical: "https://trialgrids.com/contact" },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
