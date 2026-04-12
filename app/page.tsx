import Link from "next/link";

export default function HomePage() {
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
        Generate randomization schedules and build SPIRIT-style
        schedule-of-assessments tables in your browser. No accounts. No
        uploads. Your data never leaves this device.
      </p>

      <div className="panel">
        <div className="panel-head">
          <h2>Tools</h2>
          <span className="tag">02 available</span>
        </div>
        <div
          className="panel-body"
          style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "1rem" }}
        >
          <Link
            href="/randomization"
            className="tool-card"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="mono">01 / randomization</div>
            <h3 className="serif" style={{ fontSize: "1.3rem", margin: ".4rem 0" }}>
              Allocation Schedule Generator
            </h3>
            <p style={{ color: "var(--muted)", fontSize: ".9rem" }}>
              Simple, block, and stratified block randomization with reproducible seeds.
            </p>
          </Link>
          <Link
            href="/time-table"
            className="tool-card"
            style={{ textDecoration: "none", color: "inherit" }}
          >
            <div className="mono">02 / time table</div>
            <h3 className="serif" style={{ fontSize: "1.3rem", margin: ".4rem 0" }}>
              Schedule of Assessments
            </h3>
            <p style={{ color: "var(--muted)", fontSize: ".9rem" }}>
              SPIRIT-style visit × procedure matrix. Click to mark, export to CSV.
            </p>
          </Link>
        </div>
      </div>
    </main>
  );
}
