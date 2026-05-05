"use client";

import { useState } from "react";
import type jsPDF from "jspdf";
import Select from "@/app/components/Select";

// Tanex TW-2052 label sheet spec (all values in mm).
const TANEX_TW_2052 = {
  pageWidth: 210,
  pageHeight: 297,
  labelWidth: 46.4,
  labelHeight: 21.2,
  columns: 4,
  rows: 13,
  marginTop: 12,
  marginLeft: 7,
  gapHorizontal: 1.5,
  gapVertical: 0,
  cornerRadius: 1.5,
} as const;

const CELLS_PER_SHEET = TANEX_TW_2052.columns * TANEX_TW_2052.rows; // 52

// jsPDF fallback font names. Inter → Helvetica, Fraunces Bold → Times Bold.
const FONT_INTER = "helvetica";
const FONT_FRAUNCES = "times";

// --- Types ---

type Timepoint = {
  index: number;
  time: string;
};

type Aliquot = "master" | "backup";
type Section = "blood" | "plasma-master" | "plasma-backup";
type SubjectIdDigits = 2 | 3;

type LabelItem =
  | { type: "tube-blood"; subject: number; period: number; pointIndex: number; time: string }
  | { type: "tube-plasma-master"; subject: number; period: number; pointIndex: number; time: string }
  | { type: "tube-plasma-backup"; subject: number; period: number; pointIndex: number; time: string }
  | { type: "separator-point"; fromPoint: number; toPoint: number; context: "blood" | "plasma-master" | "plasma-backup" }
  | { type: "separator-period"; fromPeriod: number; toPeriod: number }
  | { type: "separator-aliquot"; fromAliquot: Aliquot; toAliquot: Aliquot }
  | { type: "separator-section"; fromSection: Section; toSection: Section }
  | { type: "page-break" };

interface TubeLabelParams {
  studyCode: string;
  drugName: string;
  subject: number;
  period: number;
  periods: number;
  pointIndex: number;
  time: string;
  subjectIdDigits: SubjectIdDigits;
  variant: "blood" | "plasma-master" | "plasma-backup";
}

interface BuildParams {
  studyCode: string;
  drugName: string;
  subjects: number;
  periods: number;
  timepointsPerPeriod: number;
  timepoints: Timepoint[];
  duplicateTime0: boolean;
}

// --- Helpers ---

function padSubject(n: number, digits: SubjectIdDigits): string {
  return String(n).padStart(digits, "0");
}

function pointLabel(idx: number): string {
  return `P${String(idx).padStart(2, "0")}`;
}

function normalizeTime(raw: string): string {
  // "Time 0" → "0"; "0.33" → "0.33"
  return raw.trim().replace(/^time\s+/i, "");
}

function timeLine(pointIndex: number, time: string): string {
  return `${pointLabel(pointIndex)} · Time: ${normalizeTime(time)}`;
}

function variantTag(variant: "blood" | "plasma-master" | "plasma-backup"): string {
  if (variant === "blood") return "WHOLE BLOOD";
  if (variant === "plasma-master") return "PLASMA · MASTER";
  return "PLASMA · BACKUP";
}

// --- PDF render functions ---

function renderTubeLabel(doc: jsPDF, lx: number, ly: number, p: TubeLabelParams): void {
  const W = TANEX_TW_2052.labelWidth;
  const H = TANEX_TW_2052.labelHeight;
  const R = TANEX_TW_2052.cornerRadius;
  const PAD = 1.5;
  const cx = lx + PAD;
  const rightX = lx + W - PAD;
  const midX = lx + W / 2;

  // White fill, light gray border
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.15);
  doc.roundedRect(lx, ly, W, H, R, R, "FD");

  // "Study:" label (5pt, Inter Semi Bold, solid black) + value (normal)
  doc.setFont(FONT_INTER, "bold");
  doc.setFontSize(5);
  doc.setTextColor(0, 0, 0);
  doc.text("Study:", cx, ly + 3.0);
  const studyLabelW = doc.getTextWidth("Study:");
  doc.setFont(FONT_INTER, "normal");
  doc.setTextColor(20, 20, 20);
  doc.text(p.studyCode, cx + studyLabelW + 0.8, ly + 3.0);

  // Variant tag (4pt, Inter, gray, right) — helps lab personnel identify tube type
  doc.setFont(FONT_INTER, "normal");
  doc.setFontSize(4);
  doc.setTextColor(140, 140, 140);
  doc.text(variantTag(p.variant), rightX, ly + 3.0, { align: "right" });

  // Drug Name (6pt, Inter Bold, centered, black)
  doc.setFont(FONT_INTER, "bold");
  doc.setFontSize(6);
  doc.setTextColor(20, 20, 20);
  doc.text(p.drugName, midX, ly + 6.2, { align: "center" });

  // Divider
  doc.setDrawColor(210, 210, 210);
  doc.setLineWidth(0.12);
  doc.line(cx, ly + 7.5, rightX, ly + 7.5);

  // "Subj. ID:" (5pt, Inter Semi Bold, solid black, left)
  doc.setFont(FONT_INTER, "bold");
  doc.setFontSize(5);
  doc.setTextColor(0, 0, 0);
  doc.text("Subj. ID:", cx, ly + 10.5);

  // Subject number (Fraunces Bold, large, centered) — slightly above geometric center
  doc.setFont(FONT_FRAUNCES, "bold");
  doc.setFontSize(14);
  doc.setTextColor(0, 0, 0);
  doc.text(padSubject(p.subject, p.subjectIdDigits), midX, ly + 15.4, { align: "center" });

  // "P · Time:" line (6pt, Inter, centered)
  doc.setFont(FONT_INTER, "normal");
  doc.setFontSize(6);
  doc.setTextColor(20, 20, 20);
  doc.text(timeLine(p.pointIndex, p.time), midX, ly + 18.2, { align: "center" });

  // "Period:" line (5pt, Inter Semi Bold black + value normal, left) — always rendered
  doc.setFont(FONT_INTER, "bold");
  doc.setFontSize(5);
  doc.setTextColor(0, 0, 0);
  doc.text("Period:", cx, ly + 20.4);
  const periodLabelW = doc.getTextWidth("Period:");
  doc.setFont(FONT_INTER, "normal");
  doc.setTextColor(20, 20, 20);
  doc.text(String(p.period), cx + periodLabelW + 0.8, ly + 20.4);
}

function renderSeparator(
  doc: jsPDF,
  lx: number,
  ly: number,
  topText: string,
  midLine1: string,
  midLine2: string,
  bottomText: string
): void {
  const W = TANEX_TW_2052.labelWidth;
  const H = TANEX_TW_2052.labelHeight;
  const R = TANEX_TW_2052.cornerRadius;
  const PAD = 1.5;
  const cx = lx + PAD;
  const rightX = lx + W - PAD;
  const midX = lx + W / 2;

  // Light gray fill, dashed border
  doc.setFillColor(248, 248, 248);
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.15);
  doc.setLineDashPattern([1.2, 0.7], 0);
  doc.roundedRect(lx, ly, W, H, R, R, "FD");
  doc.setLineDashPattern([], 0);

  // Top text (6pt, Inter Bold, centered)
  doc.setFont(FONT_INTER, "bold");
  doc.setFontSize(6);
  doc.setTextColor(50, 50, 50);
  doc.text(topText, midX, ly + 4.5, { align: "center" });

  // Top divider
  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.1);
  doc.line(cx, ly + 5.8, rightX, ly + 5.8);

  // Instruction text (4.5pt, Inter, gray, centered)
  doc.setFont(FONT_INTER, "normal");
  doc.setFontSize(4.5);
  doc.setTextColor(110, 110, 110);
  doc.text(midLine1, midX, ly + 10.5, { align: "center" });
  doc.text(midLine2, midX, ly + 13.0, { align: "center" });

  // Bottom divider
  doc.setDrawColor(190, 190, 190);
  doc.setLineWidth(0.1);
  doc.line(cx, ly + 14.5, rightX, ly + 14.5);

  // Bottom text (6pt, Inter Bold, centered)
  doc.setFont(FONT_INTER, "bold");
  doc.setFontSize(6);
  doc.setTextColor(50, 50, 50);
  doc.text(bottomText, midX, ly + 18.5, { align: "center" });
}

function renderSeparatorPoint(
  doc: jsPDF,
  lx: number,
  ly: number,
  fromPoint: number,
  toPoint: number,
  context: "blood" | "plasma-master" | "plasma-backup"
): void {
  const midLine2 = context === "blood" ? "next blood sampling point." : "next plasma sample.";
  renderSeparator(
    doc, lx, ly,
    `END OF ${pointLabel(fromPoint)}`,
    "Please proceed to the",
    midLine2,
    `> NEXT: ${pointLabel(toPoint)}`
  );
}

function renderSeparatorPeriod(doc: jsPDF, lx: number, ly: number, fromPeriod: number, toPeriod: number): void {
  renderSeparator(
    doc, lx, ly,
    `END OF PERIOD ${fromPeriod}`,
    "Please proceed to",
    `Period ${toPeriod}.`,
    `> NEXT: PERIOD ${toPeriod}`
  );
}

function renderSeparatorAliquot(doc: jsPDF, lx: number, ly: number, fromAliquot: Aliquot, toAliquot: Aliquot): void {
  const fromLabel = fromAliquot === "master" ? "ALIQUOT 1 (Master)" : "ALIQUOT 2 (Backup)";
  const toLabel = toAliquot === "master" ? "ALIQUOT 1 (Master)" : "ALIQUOT 2 (Backup)";
  renderSeparator(
    doc, lx, ly,
    `END OF ${fromLabel}`,
    "Please proceed to the",
    "next plasma aliquot.",
    `> NEXT: ${toLabel}`
  );
}

function renderSeparatorSection(doc: jsPDF, lx: number, ly: number, fromSection: Section, toSection: Section): void {
  const fromLabel = sectionDisplay(fromSection);
  const toLabel = sectionDisplay(toSection);
  renderSeparator(
    doc, lx, ly,
    `END OF ${fromLabel}`,
    "Switch label sheet.",
    "Next section starts here.",
    `> NEXT: ${toLabel}`
  );
}

function sectionDisplay(s: Section): string {
  if (s === "blood") return "BLOOD TUBE LABELS";
  if (s === "plasma-master") return "PLASMA · MASTER";
  return "PLASMA · BACKUP";
}

// --- Label sequence generation ---

function generateBloodTubeSection(p: BuildParams): LabelItem[] {
  const items: LabelItem[] = [];
  for (let period = 1; period <= p.periods; period++) {
    for (let pointIndex = 1; pointIndex <= p.timepointsPerPeriod; pointIndex++) {
      const time = p.timepoints[pointIndex - 1]?.time ?? "";
      const copies = pointIndex === 1 && period === 1 && p.duplicateTime0 ? 2 : 1;

      for (let subject = 1; subject <= p.subjects; subject++) {
        for (let c = 0; c < copies; c++) {
          items.push({ type: "tube-blood", subject, period, pointIndex, time });
        }
      }

      const isLastPoint = pointIndex === p.timepointsPerPeriod;
      const isLastPeriod = period === p.periods;

      if (isLastPoint && !isLastPeriod) {
        items.push({ type: "separator-period", fromPeriod: period, toPeriod: period + 1 });
      } else if (!isLastPoint) {
        items.push({ type: "separator-point", fromPoint: pointIndex, toPoint: pointIndex + 1, context: "blood" });
      }
    }
  }
  return items;
}

function generatePlasmaPeriodAliquot(p: BuildParams, period: number, aliquot: Aliquot): LabelItem[] {
  const items: LabelItem[] = [];
  const itemType: LabelItem["type"] = aliquot === "master" ? "tube-plasma-master" : "tube-plasma-backup";
  const sepContext: "plasma-master" | "plasma-backup" = aliquot === "master" ? "plasma-master" : "plasma-backup";
  for (let pointIndex = 1; pointIndex <= p.timepointsPerPeriod; pointIndex++) {
    const time = p.timepoints[pointIndex - 1]?.time ?? "";
    const copies = pointIndex === 1 && period === 1 && p.duplicateTime0 ? 2 : 1;

    for (let subject = 1; subject <= p.subjects; subject++) {
      for (let c = 0; c < copies; c++) {
        items.push({ type: itemType, subject, period, pointIndex, time } as LabelItem);
      }
    }

    if (pointIndex < p.timepointsPerPeriod) {
      items.push({ type: "separator-point", fromPoint: pointIndex, toPoint: pointIndex + 1, context: sepContext });
    }
  }
  return items;
}

function generateAllItems(p: BuildParams): LabelItem[] {
  const items: LabelItem[] = [];

  // Section 1: Blood tube labels
  items.push(...generateBloodTubeSection(p));

  // Force a fresh page before plasma section
  items.push({ type: "page-break" });

  // Plasma section starts with a section transition separator
  items.push({ type: "separator-section", fromSection: "blood", toSection: "plasma-master" });

  // Section 2: Plasma, grouped by period (master → backup within each period)
  for (let period = 1; period <= p.periods; period++) {
    items.push(...generatePlasmaPeriodAliquot(p, period, "master"));
    items.push({ type: "separator-aliquot", fromAliquot: "master", toAliquot: "backup" });
    items.push(...generatePlasmaPeriodAliquot(p, period, "backup"));

    if (period < p.periods) {
      items.push({ type: "separator-period", fromPeriod: period, toPeriod: period + 1 });
    }
  }

  return items;
}

function packIntoSheets(items: LabelItem[]): LabelItem[][] {
  const sheets: LabelItem[][] = [];
  let current: LabelItem[] = [];
  for (const item of items) {
    if (item.type === "page-break") {
      if (current.length > 0) {
        sheets.push(current);
        current = [];
      }
      continue;
    }
    if (current.length === CELLS_PER_SHEET) {
      sheets.push(current);
      current = [];
    }
    current.push(item);
  }
  if (current.length > 0) sheets.push(current);
  return sheets;
}

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

  async function exportPDF() {
    setExportError("");

    if (!studyCode.trim()) {
      setExportError("Study Code is required.");
      return;
    }
    if (!drugName.trim()) {
      setExportError("Drug Name is required.");
      return;
    }
    if (isNaN(subjects) || subjects < 1 || subjects > 100) {
      setExportError("Subjects must be a number between 1 and 100.");
      return;
    }
    if (isNaN(periods) || periods < 1 || periods > 4) {
      setExportError("Please select the number of periods (1-4).");
      return;
    }
    if (isNaN(timepointsPerPeriod) || timepointsPerPeriod < 1 || timepointsPerPeriod > 30) {
      setExportError("Timepoints per period must be between 1 and 30.");
      return;
    }
    if (subjectIdDigits === null) {
      setExportError("Please select Subject ID format.");
      return;
    }

    const tpSlice = timepointValues.slice(0, timepointsPerPeriod);
    if (tpSlice.length < timepointsPerPeriod) {
      setExportError(`Timepoint ${pointLabel(tpSlice.length + 1)} is required.`);
      return;
    }
    for (let i = 0; i < tpSlice.length; i++) {
      if (!tpSlice[i] || !tpSlice[i].trim()) {
        setExportError(`Timepoint ${pointLabel(i + 1)} is required.`);
        return;
      }
    }

    const timepoints: Timepoint[] = tpSlice.map((time, i) => ({
      index: i + 1,
      time: time.trim(),
    }));

    const buildParams: BuildParams = {
      studyCode: studyCode.trim(),
      drugName: drugName.trim().toUpperCase(),
      subjects,
      periods,
      timepointsPerPeriod,
      timepoints,
      duplicateTime0,
    };

    const items = generateAllItems(buildParams);
    const sheets = packIntoSheets(items);

    const { default: jsPDFClass } = await import("jspdf");
    const doc = new jsPDFClass({ unit: "mm", format: "a4", orientation: "portrait" });
    const drugUpper = drugName.trim().toUpperCase();
    const studyTrim = studyCode.trim();

    sheets.forEach((sheet, sheetIdx) => {
      if (sheetIdx > 0) doc.addPage();

      sheet.forEach((item, cellIdx) => {
        const col = cellIdx % TANEX_TW_2052.columns;
        const row = Math.floor(cellIdx / TANEX_TW_2052.columns);
        const lx =
          TANEX_TW_2052.marginLeft +
          col * (TANEX_TW_2052.labelWidth + TANEX_TW_2052.gapHorizontal);
        const ly =
          TANEX_TW_2052.marginTop +
          row * (TANEX_TW_2052.labelHeight + TANEX_TW_2052.gapVertical);

        if (item.type === "tube-blood") {
          renderTubeLabel(doc, lx, ly, {
            studyCode: studyTrim,
            drugName: drugUpper,
            subject: item.subject,
            period: item.period,
            periods,
            pointIndex: item.pointIndex,
            time: item.time,
            subjectIdDigits,
            variant: "blood",
          });
        } else if (item.type === "tube-plasma-master") {
          renderTubeLabel(doc, lx, ly, {
            studyCode: studyTrim,
            drugName: drugUpper,
            subject: item.subject,
            period: item.period,
            periods,
            pointIndex: item.pointIndex,
            time: item.time,
            subjectIdDigits,
            variant: "plasma-master",
          });
        } else if (item.type === "tube-plasma-backup") {
          renderTubeLabel(doc, lx, ly, {
            studyCode: studyTrim,
            drugName: drugUpper,
            subject: item.subject,
            period: item.period,
            periods,
            pointIndex: item.pointIndex,
            time: item.time,
            subjectIdDigits,
            variant: "plasma-backup",
          });
        } else if (item.type === "separator-point") {
          renderSeparatorPoint(doc, lx, ly, item.fromPoint, item.toPoint, item.context);
        } else if (item.type === "separator-period") {
          renderSeparatorPeriod(doc, lx, ly, item.fromPeriod, item.toPeriod);
        } else if (item.type === "separator-aliquot") {
          renderSeparatorAliquot(doc, lx, ly, item.fromAliquot, item.toAliquot);
        } else if (item.type === "separator-section") {
          renderSeparatorSection(doc, lx, ly, item.fromSection, item.toSection);
        }
      });
    });

    const code = studyTrim.replace(/[^a-zA-Z0-9-]/g, "-");
    doc.save(`tube-labels-${code}.pdf`);
  }

  return (
    <main>
      {/* Hero */}
      <div className="hero">
        <div>
          <p className="eyebrow">TOOL 05 · BIOANALYTICAL · TUBE-LABELS</p>
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
                  { value: "2", label: "2 digits (e.g., 24)" },
                  { value: "3", label: "3 digits (e.g., 024)" },
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
            <button className="btn" onClick={exportPDF}>
              Export PDF
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
