import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "About Trialgrids — Free Clinical Research Tools for Randomization & Time Tables",
  description:
    "Trialgrids is a free, browser-based toolkit for clinical researchers. Randomization for BE/BA and crossover trials, plus SPIRIT schedule of assessments and time tables.",
  alternates: {
    canonical: "https://trialgrids.com/about",
  },
  openGraph: {
    title: "About Trialgrids — Free Clinical Research Tools",
    description:
      "Trialgrids is a free, browser-based toolkit for clinical researchers. Randomization and time tables for clinical, BE/BA, and crossover trials.",
    url: "https://trialgrids.com/about",
    siteName: "Trialgrids",
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "About Trialgrids — Free Clinical Research Tools",
    description:
      "Free, browser-based clinical research tools. Randomization and time tables for BE/BA and crossover trials.",
  },
};

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
        <h2 style={{ marginTop: "0", marginBottom: "1rem" }}>The story</h2>
        <p style={{ marginBottom: "1rem" }}>
          Trialgrids was built by Mehmet Şahin, a clinical research professional
          based in Turkey, with 13 years of experience in
          bioequivalence and bioavailability (BE/BA) studies.
        </p>
        <p style={{ marginBottom: "1rem" }}>
          The tools came out of a familiar frustration: the daily friction of
          working in BE/BA research. Generating randomization lists in Excel.
          Building tube labels in Word with copy-paste-replace cycles. Manually
          counting samples for shipment. Writing the same time table from
          scratch every time a new protocol arrived.
        </p>
        <p style={{ marginBottom: "1rem" }}>
          Each task takes minutes, but multiplied across studies, subjects,
          periods, and timepoints, those minutes become hours. Hours that should
          go into actual research.
        </p>
        <p style={{ marginBottom: "2rem" }}>
          After watching this play out across enough studies, the question
          became: why is there no simple, fast, free tool that does any of
          this? The answer turned out to be that{" "}
          <strong>somebody had to build one</strong>.
        </p>

        <h2 style={{ marginTop: "2rem", marginBottom: "1rem" }}>The philosophy</h2>
        <p style={{ marginBottom: "1rem" }}>
          Trialgrids is built on three principles.
        </p>
        <p style={{ marginBottom: "1rem" }}>
          <strong className="serif">Privacy-first.</strong> Every tool runs
          entirely in your browser. No accounts. No uploads. No servers
          receiving your data. When you close the tab, the data in memory is
          gone. This isn&apos;t a marketing claim — it&apos;s a technical fact
          about how the tools are written. If a malicious actor compromised our
          infrastructure tomorrow, they would find nothing about your studies,
          because nothing is there.
        </p>
        <p style={{ marginBottom: "1rem" }}>
          <strong className="serif">Documentation aid, not a clinical system.</strong>{" "}
          Trialgrids generates documents that help with documentation work. It
          is deliberately not a Clinical Data Management System (CDMS), not an
          Electronic Data Capture (EDC) tool, and not a substitute for your
          institution&apos;s validated systems. The line is intentional —
          building those systems requires regulatory validation that an indie
          project cannot deliver responsibly.
        </p>
        <p style={{ marginBottom: "2rem" }}>
          <strong className="serif">Free to use.</strong> The tools are free
          for individual researchers, study coordinators, biostatisticians,
          small CROs, and investigator sites. No paywall. No &ldquo;free
          trial&rdquo; with hidden conversions. If a tool helps you, use it.
        </p>

        <h2 style={{ marginTop: "2rem", marginBottom: "1rem" }}>The toolkit</h2>
        <p style={{ marginBottom: "1rem" }}>
          Six tools live today, each targeting a specific friction point:
        </p>
        <ul style={{ marginBottom: "2rem", paddingLeft: "1.5rem" }}>
          <li style={{ marginBottom: "0.8rem" }}>
            <Link href="/tools/randomization"><strong>Randomization Lists</strong></Link> — Generate block
            randomization schedules with allocation ratios. Outputs audit-ready
            PDFs with timestamps, parameters, and seed values for
            reproducibility. Used at study setup before subject enrollment
            begins.
          </li>
          <li style={{ marginBottom: "0.8rem" }}>
            <Link href="/tools/timetable"><strong>Schedule of Assessments</strong></Link> — Build
            SPIRIT-compliant time tables for trials. Add visits, mark
            assessments, generate the kind of grid that appears in every
            protocol synopsis.
          </li>
          <li style={{ marginBottom: "0.8rem" }}>
            <Link href="/tools/meal-log"><strong>Meal Intake Logs</strong></Link> — Track meal
            compliance across study periods. Fasting confirmation, standardized
            meals, post-dose feeding — the timing constraints that BE/BA studies
            depend on.
          </li>
          <li style={{ marginBottom: "0.8rem" }}>
            <Link href="/tools/sample-shipment"><strong>Sample Shipment Counts</strong></Link> — Calculate
            exact tube counts for bioanalytical lab shipments. Handles master +
            backup aliquot schemes, dropouts, did-not-start subjects, and lost
            samples. Outputs an audit-ready PDF for shipping documentation.
          </li>
          <li style={{ marginBottom: "0.8rem" }}>
            <Link href="/tools/tube-labels"><strong>Tube Label Generator</strong></Link> — Generate
            printable tube labels formatted for Tanex TW-2052 sheets. Separates
            blood tube and plasma labels onto different sheets, tight-packs
            labels with no waste between timepoints, and inserts point-transition
            separator labels for personnel guidance. Replaces 4-6 hours of
            manual Word work in seconds.
          </li>
          <li style={{ marginBottom: "0.8rem" }}>
            <Link href="/tools/adverse-event"><strong>Adverse Event Form</strong></Link> — Generate printable AE forms for clinical documentation. Fill in the volunteer&apos;s details at the bedside on phone or tablet, export a clean PDF, print, sign, and attach to the CRF. Replaces 5-10 minutes of manual paper form-filling per event.
          </li>
        </ul>
        <p style={{ marginBottom: "2rem" }}>
          Each tool is intentionally narrow. The randomization tool does
          randomization, not subject management. The sample shipment tool counts
          samples, not whole study logistics. Doing one thing well, and getting
          out of the way.
        </p>

        <h2 style={{ marginTop: "2rem", marginBottom: "1rem" }}>What Trialgrids is not</h2>
        <p style={{ marginBottom: "1rem" }}>Trialgrids does <strong>not</strong>:</p>
        <ul style={{ marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li style={{ marginBottom: "0.4rem" }}>Handle patient-identifying information</li>
          <li style={{ marginBottom: "0.4rem" }}>Store subject data on any server</li>
          <li style={{ marginBottom: "0.4rem" }}>Replace your institution&apos;s validated systems</li>
          <li style={{ marginBottom: "0.4rem" }}>Integrate with EDC or CDMS platforms</li>
          <li style={{ marginBottom: "0.4rem" }}>Provide regulatory consulting</li>
        </ul>
        <p style={{ marginBottom: "2rem" }}>
          If your study requires a CDMS, look at OpenClinica, Castor, or REDCap.
          If you need a full eClinical platform, look at Medidata Rave or Veeva
          Vault. Trialgrids exists in the spaces those platforms don&apos;t
          bother filling — the small, manual, repetitive tasks that nobody else
          has thought worth automating.
        </p>

        <h2 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Coming soon</h2>
        <p style={{ marginBottom: "1rem" }}>
          The roadmap is short, intentional, and shaped by what BE/BA
          researchers actually need:
        </p>
        <ul style={{ marginBottom: "1rem", paddingLeft: "1.5rem" }}>
          <li style={{ marginBottom: "0.4rem" }}>
            <strong>CRF Template Generator</strong> — Standard case report
            forms (demographic, vital signs, sample collection, adverse event,
            concomitant medication) generated with study-specific headers. PDF
            and Word output planned.
          </li>
          <li style={{ marginBottom: "0.4rem" }}>
            <strong>Sample Size Calculator</strong> — For BE/BA crossover
            designs with EMA and FDA criteria. Scaled average bioequivalence
            support. Designed for protocol planning.
          </li>
        </ul>
        <p style={{ marginBottom: "2rem" }}>
          New tools are released only when they meet the same bar: a real
          friction point that a small browser-based tool can genuinely solve.
        </p>

        <h2 style={{ marginTop: "2rem", marginBottom: "1rem" }}>Open questions, welcomed</h2>
        <p style={{ marginBottom: "1rem" }}>
          Trialgrids is built by a researcher who still works in the field, for
          researchers who work in the field. If you spot a missing tool, a
          friction point we haven&apos;t addressed, or a feature that would
          change how a study runs — write in.
        </p>
        <p style={{ marginBottom: "0.5rem" }}>
          <strong>Email:</strong>{" "}
          <a href="mailto:info@trialgrids.com">info@trialgrids.com</a>
        </p>
        <p style={{ marginBottom: "1.5rem" }}>
          <strong>Response:</strong> within 1 business day
        </p>
        <p>
          The tools improve when the people using them push back.
        </p>
      </div>
    </main>
  );
}
