"use client";

import { useState } from "react";
import Select from "@/app/components/Select";
import { CELLS_PER_SHEET, ZERO_CALIBRATION } from "./label-layout";
import {
  type BuildParams,
  type SubjectIdDigits,
  type Timepoint,
  generateAllItems,
  packIntoSheets,
  pointLabel,
} from "./labels-shared";

// --- Constants ---

const ERROR_STYLE: React.CSSProperties = {
  marginTop: "1rem",
  padding: ".75rem 1rem",
  border: "1px solid #c85a40",
  color: "#c85a40",
  fontFamily: "var(--font-jetbrains-mono)",
  fontSize: ".75rem",
  background: "rgba(200, 90, 64, 0.05)",
  borderRadius: "4px",
};

const DEFAULT_TIMEPOINT_HINTS = [
  "0", "0.33", "0.50", "0.75", "1.00", "1.50", "2.00", "2.50",
  "3.00", "4.00", "6.00", "8.00", "10.00", "12.00", "16.00", "20.00", "24.00",
];

// --- Component ---

export default function TubeLabelsPage() {
  const [studyCode, setStudyCode] = useState("");
  const [drugName, setDrugName] = useState("");
  const [subjectsRaw, setSubjectsRaw] = useState("");
  const [periodsRaw, setPeriodsRaw] = useState("");
  const [timepointsPerPeriodRaw, setTimepointsPerPeriodRaw] = useState("");
  const [subjectIdDigitsRaw, setSubjectIdDigitsRaw] = useState("");
  const [duplicateTime0, setDuplicateTime0] = useState(false);
  const [timepointValues, setTimepointValues] = useState<string[]>([]);
  const [pasteOpen, setPasteOpen] = useState(false);
  const [pasteText, setPasteText] = useState("");
  const [exportError, setExportError] = useState("");

  const subjects = parseInt(subjectsRaw, 10);
  const periods = parseInt(periodsRaw, 10);
  const timepointsPerPeriod = parseInt(timepointsPerPeriodRaw, 10);
  const subjectIdDigits = subjectIdDigitsRaw === "2" || subjectIdDigitsRaw === "3"
    ? (parseInt(subjectIdDigitsRaw, 10) as SubjectIdDigits)
    : null;

  function handleTppChange(raw: string) {
    const n = parseInt(raw, 10);
    setTimepointsPerPeriodRaw(raw);
    if (!isNaN(n) && n >= 1 && n <= 30) {
      setTimepointValues((prev) =>
        Array.from({ length: n }, (_, i) => (i < prev.length ? prev[i] : ""))
      );
    } else if (raw === "") {
      setTimepointValues([]);
    }
  }

  function applyPaste() {
    const parts = pasteText
      .split(/[,\n]/)
      .map((s) => s.trim())
      .filter(Boolean);
    setTimepointValues((prev) => {
      const len = Math.max(prev.length, parts.length);
      const next: string[] = [];
      for (let i = 0; i < len; i++) {
        next[i] = i < parts.length ? parts[i] : (prev[i] ?? "");
      }
      return next;
    });
    setPasteOpen(false);
    setPasteText("");
  }

  // Live summary calculations
  const vs = !isNaN(subjects) && subjects >= 1 && subjects <= 100 ? subjects : 0;
  const vp = !isNaN(periods) && periods >= 1 && periods <= 4 ? periods : 0;
  const vt =
    !isNaN(timepointsPerPeriod) && timepointsPerPeriod >= 1 && timepointsPerPeriod <= 30
      ? timepointsPerPeriod
      : 0;
  const baseValid = vs > 0 && vp > 0 && vt > 0;

  const dupExtraPerVariant = duplicateTime0 && baseValid ? vs : 0;

  const bloodLabels = baseValid ? vs * vt * vp + dupExtraPerVariant : 0;
  const plasmaMasterLabels = baseValid ? vs * vt * vp + dupExtraPerVariant : 0;
  const plasmaBackupLabels = baseValid ? vs * vt * vp + dupExtraPerVariant : 0;
  const plasmaLabels = plasmaMasterLabels + plasmaBackupLabels;

  const withinPeriodSeps = baseValid ? (vt - 1) * vp : 0;
  const periodTransitionSeps = baseValid && vp > 1 ? vp - 1 : 0;
  const bloodSeps = withinPeriodSeps + periodTransitionSeps;
  // Plasma: each period contains [master block] + aliquot-sep + [backup block].
  // Within each block there are (vt - 1) point separators, so per period: 2*(vt-1) + 1.
  // Between consecutive periods there is one period-separator (vp - 1 total).
  const plasmaWithinPeriodSeps = baseValid ? (vt - 1) * vp * 2 : 0;
  const plasmaAliquotSeps = baseValid ? vp : 0;
  const plasmaPeriodSeps = periodTransitionSeps;
  const sectionTransitionSep = baseValid ? 1 : 0;
  const plasmaSeps = plasmaWithinPeriodSeps + plasmaAliquotSeps + plasmaPeriodSeps;
  const totalSeps = bloodSeps + plasmaSeps + sectionTransitionSep;

  const bloodSectionTotal = bloodLabels + bloodSeps;
  const plasmaSectionTotal = plasmaLabels + plasmaSeps + sectionTransitionSep;
  const grandTotal = bloodSectionTotal + plasmaSectionTotal;

  const bloodSheets = bloodSectionTotal > 0 ? Math.ceil(bloodSectionTotal / CELLS_PER_SHEET) : 0;
  const plasmaSheets = plasmaSectionTotal > 0 ? Math.ceil(plasmaSectionTotal / CELLS_PER_SHEET) : 0;
  const totalSheets = bloodSheets + plasmaSheets;

  const tppCount = !isNaN(timepointsPerPeriod) && timepointsPerPeriod >= 1 ? timepointsPerPeriod : 0;

  function validateForExport(): BuildParams | null {
    setExportError("");

    if (!studyCode.trim()) {
      setExportError("Study Code is required.");
      return null;
    }
    if (!drugName.trim()) {
      setExportError("Drug Name is required.");
      return null;
    }
    if (isNaN(subjects) || subjects < 1 || subjects > 100) {
      setExportError("Subjects must be a number between 1 and 100.");
      return null;
    }
    if (isNaN(periods) || periods < 1 || periods > 4) {
      setExportError("Please select the number of periods (1-4).");
      return null;
    }
    if (isNaN(timepointsPerPeriod) || timepointsPerPeriod < 1 || timepointsPerPeriod > 30) {
      setExportError("Timepoints per period must be between 1 and 30.");
      return null;
    }
    if (subjectIdDigits === null) {
      setExportError("Please select Subject ID format.");
      return null;
    }

    const tpSlice = timepointValues.slice(0, timepointsPerPeriod);
    if (tpSlice.length < timepointsPerPeriod) {
      setExportError(`Timepoint ${pointLabel(tpSlice.length + 1)} is required.`);
      return null;
    }
    for (let i = 0; i < tpSlice.length; i++) {
      if (!tpSlice[i] || !tpSlice[i].trim()) {
        setExportError(`Timepoint ${pointLabel(i + 1)} is required.`);
        return null;
      }
    }

    const timepoints: Timepoint[] = tpSlice.map((time, i) => ({
      index: i + 1,
      time: time.trim(),
    }));

    return {
      studyCode: studyCode.trim(),
      drugName: drugName.trim().toUpperCase(),
      subjects,
      periods,
      timepointsPerPeriod,
      timepoints,
      duplicateTime0,
    };
  }

  async function exportWord() {
    const buildParams = validateForExport();
    if (buildParams === null || subjectIdDigits === null) return;

    const items = generateAllItems(buildParams);
    const sheets = packIntoSheets(items, CELLS_PER_SHEET);

    const { exportSheetsToWordBlob } = await import("./word-export");
    const blob = await exportSheetsToWordBlob(sheets, {
      studyCode: buildParams.studyCode,
      drugName: buildParams.drugName,
      subjectIdDigits,
      calibration: ZERO_CALIBRATION,
    });

    const code = buildParams.studyCode.replace(/[^a-zA-Z0-9-]/g, "-");
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `tube-labels-${code}.docx`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <main>
      {/* Hero */}
      <div className="hero">
        <div>
          <p className="eyebrow">BE/BA · BIOANALYTICAL · TUBE-LABELS</p>
          <h1>
            Tube Label <em>Generator.</em>
          </h1>
          <p className="lede">
            Generate tube labels for bioequivalence/bioavailability studies. Blood tube and plasma
            labels are organized on separate sheets, with auto-packed layout and point-transition
            separator labels for personnel guidance.
          </p>
        </div>
        <div className="meta">
          tool 05
          <br />
          client-side only
          <br />
          tanex tw-2052
        </div>
      </div>

      {/* Study parameters */}
      <div className="panel">
        <div className="panel-head">
          <h2>Study parameters</h2>
          <span className="tag">configure</span>
        </div>
        <div className="panel-body">
          <div className="controls">
            <div>
              <label>Study Code</label>
              <input
                type="text"
                placeholder="Please specify"
                value={studyCode}
                onChange={(e) => setStudyCode(e.target.value)}
              />
            </div>
            <div>
              <label>Drug Name</label>
              <input
                type="text"
                placeholder="Please specify"
                value={drugName}
                onChange={(e) => setDrugName(e.target.value)}
              />
            </div>
            <div>
              <label>Subjects</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Numbers only"
                value={subjectsRaw}
                onChange={(e) => setSubjectsRaw(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            <div>
              <label>Periods</label>
              <div
                className="method-toggle method-toggle-grid"
                style={{ height: "2.5rem", alignItems: "stretch" }}
              >
                {[1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
                    className={`method-btn${periodsRaw === String(p) ? " active" : ""}`}
                    onClick={() => setPeriodsRaw(String(p))}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label>Timepoints per period</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Numbers only"
                value={timepointsPerPeriodRaw}
                onChange={(e) => handleTppChange(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            <div>
              <label>Subject ID format</label>
              <Select
                value={subjectIdDigitsRaw}
                onChange={(val) => setSubjectIdDigitsRaw(val)}
                placeholder="Select..."
                options={[
                  { value: "2", label: "2 digits (24)" },
                  { value: "3", label: "3 digits (024)" },
                ]}
              />
            </div>
            <div>
              <label>Label format</label>
              <input
                type="text"
                value="Tanex TW-2052"
                readOnly
                style={{ color: "var(--muted)", cursor: "default" }}
              />
            </div>
            <div>
              <p
                style={{
                  fontFamily: "var(--font-jetbrains-mono)",
                  fontSize: ".68rem",
                  color: "var(--muted)",
                  lineHeight: 1.5,
                  paddingBottom: ".4rem",
                }}
              >
                Need a different label format? Email{" "}
                <a href="mailto:info@trialgrids.com" style={{ color: "var(--accent)" }}>
                  info@trialgrids.com
                </a>
              </p>
            </div>
          </div>

          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: ".6rem",
              cursor: "pointer",
              textTransform: "none",
              letterSpacing: 0,
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: ".8rem",
              color: "var(--ink)",
              marginBottom: 0,
            }}
          >
            <input
              type="checkbox"
              checked={duplicateTime0}
              onChange={(e) => setDuplicateTime0(e.target.checked)}
              style={{ width: "auto", cursor: "pointer", accentColor: "var(--ink)" }}
            />
            Duplicate Time 0 samples (Period 1, validation)
          </label>
        </div>
      </div>

      {/* Sampling timepoints */}
      <div className="panel">
        <div className="panel-head">
          <h2>Sampling timepoints</h2>
          <span className="tag">configure</span>
        </div>
        <div className="panel-body">
          <div className="btn-row" style={{ marginTop: 0, marginBottom: "1.25rem" }}>
            <button className="btn ghost" onClick={() => setPasteOpen(true)}>
              Paste from protocol
            </button>
          </div>
          {tppCount === 0 ? (
            <p
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: ".78rem",
                color: "var(--muted)",
              }}
            >
              Set &quot;Timepoints per period&quot; above to add timepoint values.
            </p>
          ) : (
            <div className="tp-grid">
              {Array.from({ length: tppCount }, (_, i) => {
                const val = timepointValues[i] ?? "";
                return (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: ".75rem" }}>
                    <span
                      style={{
                        fontFamily: "var(--font-jetbrains-mono)",
                        fontSize: ".78rem",
                        color: "var(--muted)",
                        minWidth: "2.75rem",
                        flexShrink: 0,
                      }}
                    >
                      {pointLabel(i + 1)}
                    </span>
                    <input
                      type="text"
                      value={val}
                      placeholder={DEFAULT_TIMEPOINT_HINTS[i] ?? "Please specify"}
                      onChange={(e) => {
                        const next = [...timepointValues];
                        while (next.length <= i) next.push("");
                        next[i] = e.target.value;
                        setTimepointValues(next);
                      }}
                      style={{ flex: 1 }}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="panel">
        <div className="panel-body">
          <div className="btn-row">
            <button className="btn" onClick={exportWord}>
              Export Word
            </button>
          </div>
          {exportError && <div style={ERROR_STYLE}>⚠ {exportError}</div>}
        </div>
      </div>

      {/* Summary */}
      <div className="panel">
        <div className="panel-head">
          <h2>Summary</h2>
          <span className="tag">generate</span>
        </div>
        <div className="panel-body">
          <div className="result">
            <table>
              <tbody>
                <tr>
                  <td colSpan={2} style={{ fontWeight: 600, paddingTop: ".25rem" }}>
                    Blood tube section
                  </td>
                </tr>
                <tr>
                  <td>Blood tube labels</td>
                  <td>{bloodLabels > 0 ? bloodLabels.toLocaleString() : "—"}</td>
                </tr>
                <tr>
                  <td style={{ color: "var(--muted)", paddingLeft: "1.5rem", fontSize: ".78em" }}>
                    {vs} subjects × {vt} points × {vp} period{vp === 1 ? "" : "s"}
                    {duplicateTime0 && baseValid
                      ? ` + ${dupExtraPerVariant} (Time 0 duplicate)`
                      : ""}
                  </td>
                  <td />
                </tr>
                <tr>
                  <td>Separators (within-period + period transition)</td>
                  <td>{bloodSeps > 0 ? bloodSeps : "—"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Blood section sheets</td>
                  <td style={{ fontWeight: 600 }}>{bloodSheets > 0 ? bloodSheets : "—"}</td>
                </tr>

                <tr>
                  <td colSpan={2} style={{ fontWeight: 600, paddingTop: "1rem" }}>
                    Plasma section
                  </td>
                </tr>
                <tr>
                  <td>Master plasma labels</td>
                  <td>{plasmaMasterLabels > 0 ? plasmaMasterLabels.toLocaleString() : "—"}</td>
                </tr>
                <tr>
                  <td>Backup plasma labels</td>
                  <td>{plasmaBackupLabels > 0 ? plasmaBackupLabels.toLocaleString() : "—"}</td>
                </tr>
                <tr>
                  <td style={{ color: "var(--muted)", paddingLeft: "1.5rem", fontSize: ".78em" }}>
                    Per aliquot: {vs} × {vt} × {vp}
                    {duplicateTime0 && baseValid
                      ? ` + ${dupExtraPerVariant} (Time 0 duplicate)`
                      : ""}
                  </td>
                  <td />
                </tr>
                <tr>
                  <td>Separators (within-period + aliquot transition + period transition + section transition)</td>
                  <td>
                    {plasmaSectionTotal > 0
                      ? plasmaSeps + sectionTransitionSep
                      : "—"}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Plasma section sheets</td>
                  <td style={{ fontWeight: 600 }}>{plasmaSheets > 0 ? plasmaSheets : "—"}</td>
                </tr>

                <tr>
                  <td colSpan={2} style={{ paddingTop: "1rem" }} />
                </tr>
                <tr>
                  <td>Total separator labels</td>
                  <td>{totalSeps > 0 ? totalSeps : "—"}</td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Grand total items</td>
                  <td style={{ fontWeight: 600 }}>
                    {grandTotal > 0 ? grandTotal.toLocaleString() : "—"}
                  </td>
                </tr>
                <tr>
                  <td style={{ fontWeight: 600 }}>Total sheets ({CELLS_PER_SHEET}/sheet)</td>
                  <td style={{ fontWeight: 600 }}>{totalSheets > 0 ? totalSheets : "—"}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Paste modal */}
      {pasteOpen && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.65)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
        >
          <div
            style={{
              background: "var(--paper)",
              border: "1px solid var(--rule)",
              padding: "2rem",
              maxWidth: "500px",
              width: "90%",
              borderRadius: "4px",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-fraunces)",
                fontWeight: 600,
                fontSize: "1.2rem",
                letterSpacing: "-.02em",
                marginBottom: "1rem",
              }}
            >
              Paste from protocol
            </h3>
            <p
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: ".75rem",
                color: "var(--muted)",
                marginBottom: "1rem",
                lineHeight: 1.6,
              }}
            >
              Paste timepoints separated by commas or newlines.
            </p>
            <textarea
              value={pasteText}
              onChange={(e) => setPasteText(e.target.value)}
              placeholder="0, 0.33, 0.50, 0.75, 1.00, ..."
              style={{ minHeight: "120px" }}
            />
            <div className="btn-row">
              <button className="btn" onClick={applyPaste}>
                Apply
              </button>
              <button
                className="btn ghost"
                onClick={() => {
                  setPasteOpen(false);
                  setPasteText("");
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
