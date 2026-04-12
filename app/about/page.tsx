export default function AboutPage() {
  return (
    <main>
      <div className="hero">
        <h1>About.</h1>
        <div className="meta">
          mission
          <br />
          privacy
          <br />
          roadmap
        </div>
      </div>

      <div style={{ maxWidth: "62ch", fontSize: "1.02rem", lineHeight: 1.7 }}>
        <p style={{ marginBottom: "1rem" }}>
          <strong className="serif">Trialgrid</strong> is a free browser-based
          toolkit for clinical research coordinators, investigators, and
          methodologists. It digitizes the small paper tables that still clutter
          most trial workflows — randomization lists, schedules of assessment,
          and more on the way.
        </p>
        <p style={{ marginBottom: "1rem" }}>
          <strong className="serif">Privacy.</strong> Everything runs locally in
          your browser. No account, no server, no analytics of your inputs. Your
          study data never leaves your device. Exported files are downloaded
          directly from your machine.
        </p>
        <p style={{ marginBottom: "1rem" }}>
          <strong className="serif">Not a medical device.</strong> Trialgrid is
          a documentation aid. It does not handle patient-identifying information
          and is not intended for primary trial data capture. Always follow your
          sponsor&apos;s data management plan and applicable regulations (GCP, GDPR,
          HIPAA).
        </p>
        <p>
          <strong className="serif">Coming soon.</strong> Sample size calculator
          · CRF builder · Adverse event log · PDF export.
        </p>
      </div>
    </main>
  );
}
