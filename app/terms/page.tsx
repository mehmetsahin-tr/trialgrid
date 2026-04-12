import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Use — Trialgrid",
};

export default function TermsPage() {
  return (
    <main>
      <div className="hero">
        <h1>Terms of use.</h1>
        <div className="meta">
          last updated
          <br />
          April 2026
        </div>
      </div>

      <div className="prose-block">
        <h2>1. Acceptance</h2>
        <p>
          By using Trialgrid you agree to these terms. If you do not agree,
          please do not use the service.
        </p>

        <h2>2. Not a medical device</h2>
        <p>
          Trialgrid is a documentation aid. It is not a medical device, a
          clinical data management system, or a substitute for your
          institution&apos;s validated systems. It is not intended for primary
          capture of patient data. Always follow your sponsor&apos;s data
          management plan and applicable regulations (ICH E6 GCP, GDPR, HIPAA,
          21 CFR Part 11 where relevant).
        </p>

        <h2>3. No warranty</h2>
        <p>
          The service is provided &ldquo;as is&rdquo; without warranty of any
          kind. We do not guarantee that outputs are error-free. You are
          responsible for verifying all generated schedules and tables before
          use in a clinical context.
        </p>

        <h2>4. Limitation of liability</h2>
        <p>
          To the maximum extent permitted by law, Trialgrid and its authors
          shall not be liable for any direct, indirect, incidental, or
          consequential damages arising from your use of the service.
        </p>

        <h2>5. Intellectual property</h2>
        <p>
          The Trialgrid source code is open-source (see repository for
          licence). Content you generate using the tools belongs to you.
        </p>

        <h2>6. Changes</h2>
        <p>
          We may update these terms at any time. Continued use after changes
          constitutes acceptance.
        </p>

        <h2>7. Contact</h2>
        <p>
          Questions about these terms? Use the{" "}
          <a href="/contact">contact page</a>.
        </p>
      </div>
    </main>
  );
}
