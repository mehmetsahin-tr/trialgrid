import type { Metadata } from "next";
import ShareButton from "./components/ShareButton";

export const metadata: Metadata = {
  title: "Trialgrids — Clinical Research Tools: Randomization & Time Table Generator",
  description:
    "Free, browser-based clinical research tools. Randomization for BE/BA and crossover trials. Time table and SPIRIT schedule of assessments. No accounts.",
  alternates: {
    canonical: "https://trialgrids.com",
  },
  openGraph: {
    title: "Trialgrids — Clinical Research Tools: Randomization & Time Table Generator",
    description:
      "Free, browser-based clinical research tools. Randomization for BE/BA and crossover trials. Time table and SPIRIT schedule of assessments.",
    url: "https://trialgrids.com",
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
    title: "Trialgrids — Clinical Research Tools: Randomization & Time Table Generator",
    description:
      "Free, browser-based clinical research tools. Randomization and time tables for clinical, BE/BA, and crossover trials.",
    images: ["/og-image.png"],
  },
};

export default function LandingPage() {
  return (
    <main>
      <div className="hero">
        <h1>
          Clinical research tables, <em>digitized.</em>
        </h1>
        <div className="meta">
          est. 2026
          <br />
          made for researchers
        </div>
      </div>

      <p className="lede">
        Free, browser-based clinical research tools. Generate randomization
        schedules for bioequivalence, bioavailability, and crossover studies;
        build time tables and SPIRIT-compliant schedule of assessments; keep
        meal intake logs for study periods; and calculate precise sample
        shipment counts for bioanalytical labs. Everything runs locally; your
        data never leaves this device. No accounts, no uploads.
      </p>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "2rem",
          borderTop: "1px solid var(--rule)",
          paddingTop: "2.5rem",
        }}
      >
        {[
          {
            label: "01 / private",
            title: "Your data stays local",
            body: "Everything runs in your browser. No server ever sees your study data.",
          },
          {
            label: "02 / practical",
            title: "Done in minutes",
            body: "Generate a randomization table or a full time table in minutes — no setup, no learning curve.",
          },
          {
            label: "03 / publication-ready",
            title: "Export without reformatting",
            body: "Clean PDFs and tables that drop straight into protocols, supplements, and submissions — no cleanup required.",
          },
        ].map((item) => (
          <div key={item.label}>
            <div className="mono" style={{ marginBottom: ".5rem" }}>{item.label}</div>
            <h3 className="serif" style={{ fontSize: "1.1rem", marginBottom: ".4rem" }}>
              {item.title}
            </h3>
            <p style={{ color: "var(--muted)", fontSize: ".9rem", lineHeight: 1.6 }}>
              {item.body}
            </p>
          </div>
        ))}
      </div>

<div style={{ marginTop: "2rem", borderTop: "1px solid var(--rule)", paddingTop: "1.5rem" }}>
        <ShareButton />
      </div>
    </main>
  );
}
