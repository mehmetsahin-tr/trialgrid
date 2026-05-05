"use client";

import { useState } from "react";
import Select from "@/app/components/Select";

type Aliquot = "master" | "backup" | "both";

interface DropOut {
  id: string;
  subjectId: string;
  lastPeriod: number;
  lastTimepoint: number;
}

interface NoShow {
  id: string;
  subjectId: string;
}

interface LostSample {
  id: string;
  subjectId: string;
  period: number;
  timepoint: number;
  aliquot: Aliquot;
  reason: string;
}

interface CalcResult {
  masterSamples: number;
  backupSamples: number;
  totalSamples: number;
  completeSubjects: number;
  dropOutCount: number;
  noShowCount: number;
  lostMasterCount: number;
  lostBackupCount: number;
  lostBothCount: number;
  dropOuts: DropOut[];
  noShows: NoShow[];
  lostSamples: LostSample[];
  totalSubjects: number;
  timepointsPerPeriod: number;
  periods: number;
  studyCode: string;
  calculatedAt: string;
}

let _uid = 0;
function nextId(): string {
  return String(++_uid);
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function padId(n: number): string {
  return String(n).padStart(3, "0");
}

function aliquotLabel(a: Aliquot): string {
  if (a === "both") return "master & backup";
  return a;
}

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

const ENTRY_ROW: React.CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: ".5rem",
  marginBottom: ".5rem",
  padding: ".5rem .75rem",
  background: "var(--paper-2)",
  border: "1px solid var(--rule)",
  fontFamily: "var(--font-jetbrains-mono)",
  fontSize: ".8rem",
};

const REMOVE_BTN: React.CSSProperties = {
  background: "none",
  border: "none",
  color: "var(--muted)",
  cursor: "pointer",
  fontFamily: "var(--font-jetbrains-mono)",
  fontSize: ".95rem",
  lineHeight: 1,
  padding: "0 .2rem",
  flexShrink: 0,
};

export default function SampleShipmentPage() {
  const [totalSubjectsRaw, setTotalSubjectsRaw] = useState("");
  const [timepointsRaw, setTimepointsRaw] = useState("");
  const [periods, setPeriods] = useState(0);
  const [studyCode, setStudyCode] = useState("");

  const [dropOuts, setDropOuts] = useState<DropOut[]>([]);
  const [noShows, setNoShows] = useState<NoShow[]>([]);
  const [lostSamples, setLostSamples] = useState<LostSample[]>([]);

  const [dropOutPending, setDropOutPending] = useState({
    subjectId: "",
    lastPeriod: "",
    lastTimepoint: "",
  });
  const [noShowPending, setNoShowPending] = useState({ subjectId: "" });
  const [lostPending, setLostPending] = useState({
    subjectId: "",
    period: "",
    timepoint: "",
    aliquot: "" as Aliquot | "",
    reason: "",
  });

  const [dropOutError, setDropOutError] = useState("");
  const [noShowError, setNoShowError] = useState("");
  const [lostError, setLostError] = useState("");
  const [calcError, setCalcError] = useState("");

  const [result, setResult] = useState<CalcResult | null>(null);

  const totalSubjects = parseInt(totalSubjectsRaw, 10);
  const timepointsPerPeriod = parseInt(timepointsRaw, 10);

  function occupiedIds(): Set<string> {
    const ids = new Set<string>();
    dropOuts.forEach((d) => ids.add(d.subjectId));
    noShows.forEach((ns) => ids.add(ns.subjectId));
    return ids;
  }

  function addDropOut() {
    setDropOutError("");
    if (periods < 1) { setDropOutError("Please select the number of periods first."); return; }
    const rawId = dropOutPending.subjectId.trim();
    const rawLt = dropOutPending.lastTimepoint.trim();

    if (!rawId) { setDropOutError("Subject ID is required."); return; }
    const numId = parseInt(rawId, 10);
    if (isNaN(numId) || numId < 1) { setDropOutError("Subject ID must be a positive integer."); return; }
    const limit = isNaN(totalSubjects) ? Infinity : totalSubjects;
    if (numId > limit) { setDropOutError(`Subject ID cannot exceed total subjects (${totalSubjects}).`); return; }

    const sid = padId(numId);
    if (occupiedIds().has(sid)) {
      setDropOutError(`Subject ${sid} is already listed as a drop-out or did-not-start.`);
      return;
    }

    // When periods === 1, period field is hidden — always use period 1
    if (periods > 1 && !dropOutPending.lastPeriod) {
      setDropOutError("Period is required.");
      return;
    }
    const lp = periods === 1 ? 1 : parseInt(dropOutPending.lastPeriod, 10);
    if (isNaN(lp) || lp < 1 || lp > periods) {
      setDropOutError(`Period must be between 1 and ${periods}.`);
      return;
    }

    if (!rawLt) { setDropOutError("Last completed timepoint is required."); return; }
    const lt = parseInt(rawLt, 10);
    const tMax = isNaN(timepointsPerPeriod) ? 30 : timepointsPerPeriod;
    if (isNaN(lt) || lt < 1 || lt > tMax) {
      setDropOutError(`Last timepoint must be between 1 and ${tMax}.`);
      return;
    }

    // Subject completed everything — not a drop-out
    if (lp === periods && lt === tMax) {
      setDropOutError(
        `Subject ${sid} completed all ${periods} period(s) and all ${tMax} timepoints — that is not a drop-out.`
      );
      return;
    }

    setDropOuts((prev) => [
      ...prev,
      { id: nextId(), subjectId: sid, lastPeriod: lp, lastTimepoint: lt },
    ]);
    setDropOutPending({ subjectId: "", lastPeriod: "1", lastTimepoint: "" });
  }

  function addNoShow() {
    setNoShowError("");
    const rawId = noShowPending.subjectId.trim();

    if (!rawId) { setNoShowError("Subject ID is required."); return; }
    const numId = parseInt(rawId, 10);
    if (isNaN(numId) || numId < 1) { setNoShowError("Subject ID must be a positive integer."); return; }
    const limit = isNaN(totalSubjects) ? Infinity : totalSubjects;
    if (numId > limit) { setNoShowError(`Subject ID cannot exceed total subjects (${totalSubjects}).`); return; }

    const sid = padId(numId);
    if (occupiedIds().has(sid)) {
      setNoShowError(`Subject ${sid} is already listed as a drop-out or did-not-start.`);
      return;
    }

    setNoShows((prev) => [...prev, { id: nextId(), subjectId: sid }]);
    setNoShowPending({ subjectId: "" });
  }

  function addLostSample() {
    setLostError("");
    if (periods < 1) { setLostError("Please select the number of periods first."); return; }
    const rawId = lostPending.subjectId.trim();
    const rawTp = lostPending.timepoint.trim();

    if (!rawId) { setLostError("Subject ID is required."); return; }
    const numId = parseInt(rawId, 10);
    if (isNaN(numId) || numId < 1) { setLostError("Subject ID must be a positive integer."); return; }
    const limit = isNaN(totalSubjects) ? Infinity : totalSubjects;
    if (numId > limit) { setLostError(`Subject ID cannot exceed total subjects (${totalSubjects}).`); return; }

    const sid = padId(numId);

    // When periods === 1, period field is hidden — always use period 1
    const p = periods === 1 ? 1 : parseInt(lostPending.period, 10);
    if (isNaN(p) || p < 1 || p > periods) {
      setLostError(`Period must be between 1 and ${periods}.`);
      return;
    }

    if (!rawTp) { setLostError("Timepoint is required."); return; }
    const tp = parseInt(rawTp, 10);
    const tMax = isNaN(timepointsPerPeriod) ? 30 : timepointsPerPeriod;
    if (isNaN(tp) || tp < 1 || tp > tMax) {
      setLostError(`Timepoint must be between 1 and ${tMax}.`);
      return;
    }

    if (!lostPending.aliquot) { setLostError("Aliquot is required."); return; }

    // One entry per (subjectId, period, timepoint) regardless of aliquot type
    const dup = lostSamples.some(
      (l) => l.subjectId === sid && l.period === p && l.timepoint === tp
    );
    if (dup) {
      const loc = periods > 1 ? `Period ${p}, P${pad2(tp)}` : `P${pad2(tp)}`;
      setLostError(
        `A lost sample entry for Subject ${sid} ${loc} already exists. Remove it first to change the aliquot type.`
      );
      return;
    }

    setLostSamples((prev) => [
      ...prev,
      {
        id: nextId(),
        subjectId: sid,
        period: p,
        timepoint: tp,
        aliquot: lostPending.aliquot as Aliquot,
        reason: lostPending.reason.trim(),
      },
    ]);
    setLostPending({ subjectId: "", period: "1", timepoint: "", aliquot: "master", reason: "" });
  }

  function calculate() {
    setCalcError("");
    setResult(null);

    if (periods < 1) {
      setCalcError("Please select the number of periods.");
      return;
    }
    if (isNaN(totalSubjects) || totalSubjects < 1 || totalSubjects > 100) {
      setCalcError("Total subjects must be a number between 1 and 100.");
      return;
    }
    if (isNaN(timepointsPerPeriod) || timepointsPerPeriod < 1 || timepointsPerPeriod > 30) {
      setCalcError("Timepoints per period must be a number between 1 and 30.");
      return;
    }

    for (const d of dropOuts) {
      if (d.lastPeriod > periods) {
        setCalcError(
          `Drop-out Subject ${d.subjectId}: period (${d.lastPeriod}) exceeds configured periods (${periods}).`
        );
        return;
      }
      if (d.lastTimepoint > timepointsPerPeriod) {
        setCalcError(
          `Drop-out Subject ${d.subjectId}: timepoint (${d.lastTimepoint}) exceeds timepoints per period (${timepointsPerPeriod}).`
        );
        return;
      }
      if (d.lastPeriod === periods && d.lastTimepoint === timepointsPerPeriod) {
        setCalcError(
          `Drop-out Subject ${d.subjectId} completed every period and timepoint — please remove this drop-out entry.`
        );
        return;
      }
    }
    for (const l of lostSamples) {
      if (l.period > periods) {
        setCalcError(
          `Lost sample Subject ${l.subjectId} Period ${l.period}: period exceeds configured periods (${periods}).`
        );
        return;
      }
      if (l.timepoint > timepointsPerPeriod) {
        setCalcError(
          `Lost sample Subject ${l.subjectId} P${pad2(l.timepoint)}: timepoint exceeds timepoints per period (${timepointsPerPeriod}).`
        );
        return;
      }
    }
    if (dropOuts.length + noShows.length > totalSubjects) {
      setCalcError(
        `Drop-outs + did-not-start (${dropOuts.length + noShows.length}) exceeds total subjects (${totalSubjects}).`
      );
      return;
    }

    const completeSubjects = totalSubjects - dropOuts.length - noShows.length;
    let masterSamples = completeSubjects * timepointsPerPeriod * periods;
    let backupSamples = completeSubjects * timepointsPerPeriod * periods;

    for (const d of dropOuts) {
      const completedTimepoints = (d.lastPeriod - 1) * timepointsPerPeriod + d.lastTimepoint;
      masterSamples += completedTimepoints;
      backupSamples += completedTimepoints;
    }

    const lostMaster = lostSamples.filter((l) => l.aliquot === "master");
    const lostBackup = lostSamples.filter((l) => l.aliquot === "backup");
    const lostBoth = lostSamples.filter((l) => l.aliquot === "both");

    masterSamples -= lostMaster.length;
    backupSamples -= lostBackup.length;
    masterSamples -= lostBoth.length;
    backupSamples -= lostBoth.length;

    setResult({
      masterSamples,
      backupSamples,
      totalSamples: masterSamples + backupSamples,
      completeSubjects,
      dropOutCount: dropOuts.length,
      noShowCount: noShows.length,
      lostMasterCount: lostMaster.length,
      lostBackupCount: lostBackup.length,
      lostBothCount: lostBoth.length,
      dropOuts: [...dropOuts],
      noShows: [...noShows],
      lostSamples: [...lostSamples],
      totalSubjects,
      timepointsPerPeriod,
      periods,
      studyCode,
      calculatedAt: new Date().toISOString(),
    });
  }

  async function exportPDF() {
    if (!result) return;
    const { default: jsPDF } = await import("jspdf");

    const doc = new jsPDF();
    const pageW = doc.internal.pageSize.width;
    const pageH = doc.internal.pageSize.height;

    let y = 18;
    const L = 14;
    const GRAY: [number, number, number] = [140, 138, 128];
    const MID: [number, number, number] = [100, 100, 100];
    const INK: [number, number, number] = [20, 20, 20];
    // ASCII-only — Unicode box-drawing characters are not in jsPDF's default font
    const WIDE_DIV = "=".repeat(60);
    const THIN_DIV = "-".repeat(60);

    function draw(
      text: string,
      x: number,
      yPos: number,
      size = 9,
      bold = false,
      color: [number, number, number] = INK
    ) {
      doc.setTextColor(color[0], color[1], color[2]);
      doc.setFontSize(size);
      doc.setFont("courier", bold ? "bold" : "normal");
      doc.text(text, x, yPos);
    }

    function section(title: string) {
      if (y > pageH - 60) { doc.addPage(); y = 20; }
      draw(THIN_DIV, L, y, 7, false, GRAY); y += 5;
      draw(title, L, y, 10, true); y += 5;
      draw(THIN_DIV, L, y, 7, false, GRAY); y += 7;
    }

    const mp = result.periods;

    // Header
    draw(WIDE_DIV, L, y, 7, false, GRAY); y += 7;
    draw("SAMPLE SHIPMENT SUMMARY", L, y, 14, true); y += 6;
    draw("trialgrids.com -- bioanalytical sample calculator", L, y, 9, false, MID); y += 5;
    draw(WIDE_DIV, L, y, 7, false, GRAY); y += 9;

    draw(`Study:      ${result.studyCode || "--"}`, L, y, 9); y += 5;
    draw(`Generated:  ${result.calculatedAt}`, L, y, 9); y += 5;
    draw(`Tool:       Trialgrids -- trialgrids.com/tools/sample-shipment`, L, y, 9); y += 10;

    // Study parameters
    section("STUDY PARAMETERS");
    draw(`  Subjects enrolled:       ${result.totalSubjects}`, L, y, 9); y += 5;
    draw(`  Timepoints per period:   ${result.timepointsPerPeriod}`, L, y, 9); y += 5;
    draw(`  Periods:                 ${mp}`, L, y, 9); y += 5;
    draw(`  Aliquot scheme:          Master + Backup`, L, y, 9); y += 10;

    // Subject status
    section("SUBJECT STATUS");

    if (
      result.noShows.length === 0 &&
      result.dropOuts.length === 0 &&
      result.lostSamples.length === 0
    ) {
      draw("  No issues reported -- all subjects completed full schedule.", L, y, 9, false, MID);
      y += 7;
    }
    if (result.noShows.length > 0) {
      draw("  Did not start (randomized, no samples):", L, y, 9); y += 5;
      for (const ns of result.noShows) {
        draw(`    Subject ${ns.subjectId}`, L, y, 9, false, MID); y += 5;
      }
      y += 2;
    }
    if (result.dropOuts.length > 0) {
      draw("  Drop-outs (left after partial completion):", L, y, 9); y += 5;
      for (const d of result.dropOuts) {
        const loc =
          mp > 1
            ? `Period ${d.lastPeriod}, P${pad2(d.lastTimepoint)}`
            : `P${pad2(d.lastTimepoint)}`;
        draw(`    Subject ${d.subjectId}  --  completed up to ${loc}`, L, y, 9, false, MID);
        y += 5;
      }
      y += 2;
    }
    if (result.lostSamples.length > 0) {
      draw("  Lost samples (specific tubes missing):", L, y, 9); y += 5;
      for (const l of result.lostSamples) {
        const loc =
          mp > 1
            ? `Period ${l.period}, P${pad2(l.timepoint)}`
            : `P${pad2(l.timepoint)}`;
        const aLabel = l.aliquot === "both" ? "master & backup" : l.aliquot;
        const reasonPart = l.reason ? `  --  reason: ${l.reason}` : "";
        draw(`    Subject ${l.subjectId}, ${loc} ${aLabel}${reasonPart}`, L, y, 9, false, MID);
        y += 5;
      }
      y += 2;
    }
    y += 3;

    // Sample count
    section("SAMPLE COUNT");
    draw(`  Master samples to ship:    ${result.masterSamples}`, L, y, 9); y += 5;
    draw(`  Backup samples to ship:    ${result.backupSamples}`, L, y, 9); y += 4;
    draw(`  ${"-".repeat(34)}`, L, y, 9, false, GRAY); y += 5;
    draw(`  TOTAL:                     ${result.totalSamples}`, L, y, 10, true); y += 9;

    draw("  Calculation:", L, y, 9); y += 6;
    const baseFormula =
      mp > 1
        ? `    ${result.completeSubjects} x ${result.timepointsPerPeriod} x ${mp} x 2  =  ${result.completeSubjects * result.timepointsPerPeriod * mp * 2}`
        : `    ${result.completeSubjects} x ${result.timepointsPerPeriod} x 2  =  ${result.completeSubjects * result.timepointsPerPeriod * 2}`;
    draw(baseFormula, L, y, 9); y += 5;

    for (const d of result.dropOuts) {
      const completedTimepoints =
        (d.lastPeriod - 1) * result.timepointsPerPeriod + d.lastTimepoint;
      const detail =
        mp > 1
          ? `Period ${d.lastPeriod}, ${completedTimepoints} timepoints total`
          : `${completedTimepoints} timepoints`;
      draw(
        `    Subject ${d.subjectId}  =  ${completedTimepoints * 2}  (${detail})`,
        L, y, 9
      );
      y += 5;
    }
    if (result.lostMasterCount > 0) {
      draw(`    Lost master (${result.lostMasterCount})  =  -${result.lostMasterCount}`, L, y, 9); y += 5;
    }
    if (result.lostBackupCount > 0) {
      draw(`    Lost backup (${result.lostBackupCount})  =  -${result.lostBackupCount}`, L, y, 9); y += 5;
    }
    if (result.lostBothCount > 0) {
      draw(
        `    Lost both / whole blood (${result.lostBothCount})  =  -${result.lostBothCount * 2}`,
        L, y, 9
      );
      y += 5;
    }
    draw(`    ${"-".repeat(26)}`, L, y, 9, false, GRAY); y += 5;
    draw(`    TOTAL  =  ${result.totalSamples}`, L, y, 9, true); y += 10;

    // Footer
    if (y > pageH - 30) { doc.addPage(); y = 20; }
    draw(WIDE_DIV, L, y, 7, false, GRAY); y += 6;
    draw("Generated by Trialgrids", L, y, 9, true); y += 5;
    draw("trialgrids.com/tools/sample-shipment", L, y, 9, false, MID);

    // Page numbers
    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      doc.setTextColor(140, 138, 128);
      doc.text(`Page ${p} / ${totalPages}`, pageW - 14, pageH - 8, { align: "right" });
      doc.text("trialgrids.com", 14, pageH - 8);
    }
    doc.setTextColor(0, 0, 0);

    const code = result.studyCode.trim();
    const filename = code
      ? `sample-shipment-${code.replace(/[^a-zA-Z0-9-]/g, "-")}.pdf`
      : `sample-shipment-${new Date().toISOString().slice(0, 10)}.pdf`;
    doc.save(filename);
  }

  const totalLostTubes =
    (result?.lostMasterCount ?? 0) +
    (result?.lostBackupCount ?? 0) +
    (result?.lostBothCount ?? 0) * 2;

  // Period selector options for dropdowns
  const periodOptions = Array.from({ length: periods }, (_, i) => i + 1);

  return (
    <main>
      {/* Hero */}
      <div className="hero">
        <div>
          <p className="eyebrow">HANDING OVER CALCULATOR · BIOANALYTICAL · SAMPLE-SHIPMENT</p>
          <h1>
            Sample Shipment <em>Calculator.</em>
          </h1>
          <p className="lede">
            Calculate the exact number of samples to be shipped to the bioanalytical laboratory
            at study end. Tracks drop-outs, no-shows, and lost samples with master/backup
            aliquoting across single and multi-period studies. Audit-ready PDF export.
          </p>
        </div>
        <div className="meta">
          tool 04
          <br />
          client-side only
          <br />
          master + backup
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
              <label>Total subjects</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Numbers only"
                value={totalSubjectsRaw}
                onChange={(e) => setTotalSubjectsRaw(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            <div>
              <label>Timepoints per period</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Numbers only"
                value={timepointsRaw}
                onChange={(e) => setTimepointsRaw(e.target.value.replace(/[^0-9]/g, ""))}
              />
            </div>
            <div>
              <label>Periods</label>
              <div className="method-toggle method-toggle-grid" style={{ height: "2.5rem", alignItems: "stretch" }}>
                {[1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
                    className={`method-btn${periods === p ? " active" : ""}`}
                    onClick={() => setPeriods(p)}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label>Aliquot scheme</label>
              <input
                type="text"
                value="Master + Backup"
                readOnly
                style={{ color: "var(--muted)", cursor: "default" }}
              />
            </div>
            <div>
              <label>Study code</label>
              <input
                type="text"
                placeholder="Please specify"
                value={studyCode}
                onChange={(e) => setStudyCode(e.target.value)}
              />
            </div>
          </div>

        </div>
      </div>

      {/* Drop-outs */}
      <div className="panel">
        <div className="panel-head">
          <h2>Drop-outs</h2>
          <span className="tag">subject left study after some samples</span>
        </div>
        <div className="panel-body">
          {dropOuts.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              {dropOuts.map((d) => (
                <div key={d.id} style={ENTRY_ROW}>
                  <span style={{ flex: 1 }}>
                    Subject {d.subjectId}
                    {periods > 1
                      ? ` — Period ${d.lastPeriod}, completed up to P${pad2(d.lastTimepoint)}`
                      : ` — completed up to P${pad2(d.lastTimepoint)}`}
                  </span>
                  <button
                    style={REMOVE_BTN}
                    onClick={() => setDropOuts((prev) => prev.filter((x) => x.id !== d.id))}
                    aria-label={`Remove drop-out Subject ${d.subjectId}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="controls" style={{ marginBottom: ".5rem" }}>
            <div>
              <label>Subject ID</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 017"
                value={dropOutPending.subjectId}
                onChange={(e) =>
                  setDropOutPending((p) => ({
                    ...p,
                    subjectId: e.target.value.replace(/[^0-9]/g, ""),
                  }))
                }
              />
            </div>
            {periods > 1 && (
              <div>
                <label>Period</label>
                <Select
                  value={dropOutPending.lastPeriod}
                  onChange={(val) => setDropOutPending((p) => ({ ...p, lastPeriod: val }))}
                  placeholder="Please select"
                  options={periodOptions.map((p) => ({ value: String(p), label: String(p) }))}
                />
              </div>
            )}
            <div>
              <label>Last completed timepoint</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 4"
                value={dropOutPending.lastTimepoint}
                onChange={(e) =>
                  setDropOutPending((p) => ({
                    ...p,
                    lastTimepoint: e.target.value.replace(/[^0-9]/g, ""),
                  }))
                }
              />
            </div>
            <div>
              <button className="btn ghost" onClick={addDropOut}>
                + Add
              </button>
            </div>
          </div>
          {dropOutError && <div style={ERROR_STYLE}>⚠ {dropOutError}</div>}
        </div>
      </div>

      {/* Did not start */}
      <div className="panel">
        <div className="panel-head">
          <h2>Did not start</h2>
          <span className="tag">randomized, no samples taken</span>
        </div>
        <div className="panel-body">
          {noShows.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              {noShows.map((ns) => (
                <div key={ns.id} style={ENTRY_ROW}>
                  <span style={{ flex: 1 }}>Subject {ns.subjectId} — did not start</span>
                  <button
                    style={REMOVE_BTN}
                    onClick={() => setNoShows((prev) => prev.filter((x) => x.id !== ns.id))}
                    aria-label={`Remove did-not-start Subject ${ns.subjectId}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="controls" style={{ marginBottom: ".5rem" }}>
            <div>
              <label>Subject ID</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 012"
                value={noShowPending.subjectId}
                onChange={(e) =>
                  setNoShowPending({ subjectId: e.target.value.replace(/[^0-9]/g, "") })
                }
              />
            </div>
            <div>
              <button className="btn ghost" onClick={addNoShow}>
                + Add
              </button>
            </div>
          </div>
          {noShowError && <div style={ERROR_STYLE}>⚠ {noShowError}</div>}
        </div>
      </div>

      {/* Lost samples */}
      <div className="panel">
        <div className="panel-head">
          <h2>Lost samples</h2>
          <span className="tag">specific tubes missing</span>
        </div>
        <div className="panel-body">
          {lostSamples.length > 0 && (
            <div style={{ marginBottom: "1rem" }}>
              {lostSamples.map((l) => (
                <div key={l.id} style={ENTRY_ROW}>
                  <span style={{ flex: 1 }}>
                    Subject {l.subjectId}
                    {periods > 1 ? ` · Period ${l.period}` : ""}
                    {" · "}P{pad2(l.timepoint)} · {aliquotLabel(l.aliquot)}
                    {l.reason ? ` · ${l.reason}` : ""}
                  </span>
                  <button
                    style={REMOVE_BTN}
                    onClick={() => setLostSamples((prev) => prev.filter((x) => x.id !== l.id))}
                    aria-label={`Remove lost sample Subject ${l.subjectId}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="controls" style={{ marginBottom: ".5rem" }}>
            <div>
              <label>Subject ID</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 003"
                value={lostPending.subjectId}
                onChange={(e) =>
                  setLostPending((p) => ({
                    ...p,
                    subjectId: e.target.value.replace(/[^0-9]/g, ""),
                  }))
                }
              />
            </div>
            {periods > 1 && (
              <div>
                <label>Period</label>
                <Select
                  value={lostPending.period}
                  onChange={(val) => setLostPending((p) => ({ ...p, period: val }))}
                  placeholder="Please select"
                  options={periodOptions.map((p) => ({ value: String(p), label: String(p) }))}
                />
              </div>
            )}
            <div>
              <label>Timepoint</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 7"
                value={lostPending.timepoint}
                onChange={(e) =>
                  setLostPending((p) => ({
                    ...p,
                    timepoint: e.target.value.replace(/[^0-9]/g, ""),
                  }))
                }
              />
            </div>
            <div>
              <label>Aliquot</label>
              <Select
                value={lostPending.aliquot}
                onChange={(val) => setLostPending((p) => ({ ...p, aliquot: val as Aliquot }))}
                placeholder="Please select"
                options={[
                  { value: "master", label: "Master" },
                  { value: "backup", label: "Backup" },
                  { value: "both", label: "Master & Backup" },
                ]}
              />
            </div>
            <div>
              <label>Reason (optional)</label>
              <input
                type="text"
                placeholder="e.g. tube broken"
                value={lostPending.reason}
                onChange={(e) => setLostPending((p) => ({ ...p, reason: e.target.value }))}
              />
            </div>
            <div>
              <button className="btn ghost" onClick={addLostSample}>
                + Add
              </button>
            </div>
          </div>
          {lostError && <div style={ERROR_STYLE}>⚠ {lostError}</div>}
        </div>
      </div>

      {/* Actions */}
      <div className="panel">
        <div className="panel-body">
          <div className="btn-row">
            <button className="btn" onClick={calculate}>
              Calculate
            </button>
            <button
              className="btn ghost"
              onClick={exportPDF}
              disabled={!result}
              style={!result ? { opacity: 0.5, cursor: "not-allowed" } : undefined}
            >
              Export PDF
            </button>
          </div>
          {calcError && <div style={ERROR_STYLE}>⚠ {calcError}</div>}
        </div>
      </div>

      {/* Result */}
      {result && (
        <div className="panel">
          <div className="panel-head">
            <h2>Calculation summary</h2>
            <span className="tag">generate</span>
          </div>
          <div className="panel-body">
            <div className="result">
              <table>
                <tbody>
                  <tr>
                    <td>Total subjects enrolled</td>
                    <td>{result.totalSubjects}</td>
                  </tr>
                  <tr>
                    <td>Did not start</td>
                    <td>
                      {result.noShowCount}
                      {result.noShowCount > 0
                        ? ` (${result.noShows
                            .map((ns) => `Subject ${ns.subjectId}`)
                            .join(", ")})`
                        : ""}
                    </td>
                  </tr>
                  <tr>
                    <td>Drop-outs</td>
                    <td>
                      {result.dropOutCount}
                      {result.dropOutCount > 0
                        ? ` (${result.dropOuts
                            .map((d) =>
                              result.periods > 1
                                ? `Subject ${d.subjectId} in P${d.lastPeriod}`
                                : `Subject ${d.subjectId}`
                            )
                            .join(", ")})`
                        : ""}
                    </td>
                  </tr>
                  <tr>
                    <td>Completed full schedule</td>
                    <td>{result.completeSubjects}</td>
                  </tr>
                  <tr>
                    <td>Lost samples</td>
                    <td>
                      {result.lostSamples.length}
                      {result.lostSamples.length > 0 && (
                        <>
                          {" "}({result.lostMasterCount} master, {result.lostBackupCount} backup
                          {result.lostBothCount > 0 ? `, ${result.lostBothCount} both` : ""})
                          {" — "}{totalLostTubes} tube{totalLostTubes !== 1 ? "s" : ""} total
                        </>
                      )}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div
              style={{
                margin: "1.5rem 0 1rem",
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: ".85rem",
                lineHeight: 2,
              }}
            >
              <div>
                Master samples to ship:{" "}
                <strong style={{ color: "var(--ink)" }}>{result.masterSamples}</strong>
              </div>
              <div>
                Backup samples to ship:{" "}
                <strong style={{ color: "var(--ink)" }}>{result.backupSamples}</strong>
              </div>
              <div
                style={{
                  borderTop: "1px solid var(--rule)",
                  marginTop: ".5rem",
                  paddingTop: ".5rem",
                  fontWeight: 600,
                }}
              >
                TOTAL:{" "}
                <span style={{ fontSize: "1.15rem", color: "var(--accent)" }}>
                  {result.totalSamples}
                </span>
              </div>
            </div>

            <div
              style={{
                fontFamily: "var(--font-jetbrains-mono)",
                fontSize: ".75rem",
                color: "var(--muted)",
                lineHeight: 2.1,
                borderTop: "1px solid var(--rule)",
                paddingTop: "1rem",
              }}
            >
              <div style={{ color: "var(--ink)", marginBottom: ".25rem", fontSize: ".78rem" }}>
                Detailed breakdown:
              </div>
              {result.periods > 1 ? (
                <div>
                  &nbsp;&nbsp;{result.completeSubjects} subjects × {result.timepointsPerPeriod}{" "}
                  timepoints × {result.periods} periods × 2
                  {" = "}
                  {result.completeSubjects * result.timepointsPerPeriod * result.periods * 2} samples
                </div>
              ) : (
                <div>
                  &nbsp;&nbsp;{result.completeSubjects} subjects × {result.timepointsPerPeriod}{" "}
                  timepoints × 2
                  {" = "}
                  {result.completeSubjects * result.timepointsPerPeriod * 2} samples
                </div>
              )}
              {result.dropOuts.map((d) => {
                const completedTimepoints =
                  (d.lastPeriod - 1) * result.timepointsPerPeriod + d.lastTimepoint;
                const detail =
                  result.periods > 1
                    ? `Period ${d.lastPeriod}, ${completedTimepoints} timepoints total`
                    : `${completedTimepoints} of ${result.timepointsPerPeriod} completed`;
                return (
                  <div key={d.id}>
                    &nbsp;&nbsp;Subject {d.subjectId} ({detail}) = {completedTimepoints * 2} samples
                    ({completedTimepoints} master + {completedTimepoints} backup)
                  </div>
                );
              })}
              {result.lostMasterCount > 0 && (
                <div>
                  &nbsp;&nbsp;Lost master ({result.lostMasterCount}) = −{result.lostMasterCount}{" "}
                  samples
                </div>
              )}
              {result.lostBackupCount > 0 && (
                <div>
                  &nbsp;&nbsp;Lost backup ({result.lostBackupCount}) = −{result.lostBackupCount}{" "}
                  samples
                </div>
              )}
              {result.lostBothCount > 0 && (
                <div>
                  &nbsp;&nbsp;Lost both / whole blood ({result.lostBothCount}) ={" "}
                  −{result.lostBothCount * 2} samples ({result.lostBothCount} master +{" "}
                  {result.lostBothCount} backup)
                </div>
              )}
              <div
                style={{
                  borderTop: "1px solid var(--rule)",
                  marginTop: ".25rem",
                  paddingTop: ".25rem",
                  color: "var(--ink)",
                }}
              >
                &nbsp;&nbsp;Total = {result.totalSamples} samples
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
