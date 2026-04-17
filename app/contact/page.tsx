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
          trialgrids is maintained as an open-source project. The best ways to
          reach us:
        </p>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1.5rem",
            marginBottom: "2.5rem",
          }}
        >
          {[
            {
              label: "Bug reports & feature requests",
              body: "Open an issue on GitHub. Include steps to reproduce and your browser/OS.",
              link: { href: "https://github.com", text: "github.com/trialgrids" },
            },
            {
              label: "General questions",
              body: "Use GitHub Discussions for questions about usage, methodology, or the roadmap.",
              link: { href: "https://github.com", text: "Discussions →" },
            },
            {
              label: "Direct contact",
              body: "For anything else — partnerships, enterprise use, or direct feedback.",
              link: { href: "mailto:info@trialgrids.com", text: "info@trialgrids.com" },
            },
          ].map((item) => (
            <div
              key={item.label}
              style={{
                border: "1px solid var(--rule)",
                padding: "1.2rem",
                background: "var(--paper-2)",
              }}
            >
              <div
                className="mono"
                style={{ marginBottom: ".5rem", color: "var(--accent)" }}
              >
                {item.label}
              </div>
              <p style={{ fontSize: ".9rem", color: "var(--muted)", marginBottom: ".8rem", lineHeight: 1.6 }}>
                {item.body}
              </p>
              <a href={item.link.href} target="_blank" rel="noopener noreferrer"
                style={{ fontSize: ".85rem", color: "var(--accent-2)", fontFamily: "var(--font-jetbrains-mono)", textDecoration: "none" }}>
                {item.link.text}
              </a>
            </div>
          ))}
        </div>

        <div className="notice">
          <strong>Note.</strong> trialgrids is a volunteer-maintained project.
          We aim to respond within a few days but cannot guarantee response
          times.
        </div>
      </div>
    </main>
  );
}
