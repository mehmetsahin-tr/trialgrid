import ShareButton from "./components/ShareButton";

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
        Create randomization tables and time table for clinical trials. Access
        them directly from your browser without any privacy concerns—for free,
        for now. We&apos;ll be offering many more tools soon.
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

      <div style={{ marginTop: "2.5rem", borderTop: "1px solid var(--rule)", paddingTop: "1.5rem" }}>
        <ShareButton />
      </div>
    </main>
  );
}
