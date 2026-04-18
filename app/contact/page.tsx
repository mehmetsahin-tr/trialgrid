import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Contact — trialgrids",
};

export default function ContactPage() {
  return (
    <main>
      <div className="hero">
        <h1>Contact.</h1>
        <div className="meta">
          questions
          <br />
          feedback
          <br />
          bugs
        </div>
      </div>

      <div className="prose-block">
        <p style={{ marginBottom: "2rem" }}>
          For questions, feedback, or anything else — reach out directly.
        </p>

        <div
          style={{
            border: "1px solid var(--rule)",
            padding: "1.2rem",
            background: "var(--paper-2)",
            display: "inline-block",
            marginBottom: "2.5rem",
          }}
        >
          <div className="mono" style={{ marginBottom: ".5rem", color: "var(--accent)" }}>
            Direct contact
          </div>
          <a
            href="mailto:info@trialgrids.com"
            style={{ fontSize: ".85rem", color: "var(--accent-2)", fontFamily: "var(--font-jetbrains-mono)", textDecoration: "none" }}
          >
            info@trialgrids.com
          </a>
        </div>
      </div>
    </main>
  );
}
