export default function LandingPage() {
  return (
    <main>
      <div className="hero">
        <h1>
          Clinical research tables, <em>digitized.</em>
        </h1>
        <div className="meta">
          v0.1 · prototype
          <br />
          est. 2026
          <br />
          made for researchers
        </div>
      </div>

      <p className="lede">
        Generate randomization schedules and SPIRIT-style
        schedule-of-assessments tables — entirely in your browser. No
        accounts. No uploads. Your data never leaves this device.
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
            label: "02 / reproducible",
            title: "Seeded randomization",
            body: "Set a seed and get the same sequence every time — auditable and shareable.",
          },
          {
            label: "03 / standard",
            title: "SPIRIT-compliant tables",
            body: "Assessment schedules built to the structure clinical reviewers expect.",
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
    </main>
  );
}
