import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Trialgrid",
};

export default function PrivacyPage() {
  return (
    <main>
      <div className="hero">
        <h1>Privacy policy.</h1>
        <div className="meta">
          last updated
          <br />
          April 2026
        </div>
      </div>

      <div className="prose-block">
        <h2>1. No data collection</h2>
        <p>
          Trialgrid runs entirely in your browser. We do not collect, transmit,
          store, or process any data you enter into the tools. Your randomization
          parameters, study titles, visit names, and assessment marks never leave
          your device.
        </p>

        <h2>2. Local storage</h2>
        <p>
          The Time Table tool uses your browser&apos;s <code>localStorage</code>{" "}
          to auto-save your work between sessions. This data is stored locally on
          your device only and is never sent to any server. You can clear it at
          any time through your browser settings.
        </p>

        <h2>3. Analytics</h2>
        <p>
          We may use privacy-respecting, aggregate analytics (e.g. page view
          counts, referrer domains) that do not track individual users or
          collect personal data. No cookies are set for tracking purposes.
        </p>

        <h2>4. Advertising</h2>
        <p>
          Trialgrid may display non-personalised Google AdSense ads to support
          free access. Google&apos;s ad serving does not use any data you enter
          into the tools. For Google&apos;s own privacy practices, see{" "}
          <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
            policies.google.com/privacy
          </a>
          .
        </p>

        <h2>5. Third-party fonts</h2>
        <p>
          Fonts (Fraunces, JetBrains Mono, Inter) are loaded from Google Fonts.
          This may result in a connection to Google servers. See Google&apos;s
          privacy policy for details.
        </p>

        <h2>6. Changes</h2>
        <p>
          We may update this policy to reflect changes in the service. The date
          at the top of this page will reflect the most recent revision.
        </p>

        <h2>7. Contact</h2>
        <p>
          Questions about privacy? Use the{" "}
          <a href="/contact">contact page</a>.
        </p>
      </div>
    </main>
  );
}
