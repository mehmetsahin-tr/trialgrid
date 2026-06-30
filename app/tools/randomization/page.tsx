"use client";

import { useState, useEffect, useCallback } from "react";
import Select from "@/app/components/Select";
import LanguageToggle from "@/app/components/LanguageToggle";
import { RNG_ALGO, RNG_VERSION } from "./lib/rng";
import { DESIGNS, DESIGN_ORDER, designPeriods } from "./lib/designs";
import type { DesignId } from "./lib/designs";
import { generateSchedule } from "./lib/generate";
import type { GenRow, Method, Stratum } from "./lib/generate";
import { canonicalString, sha256Hex, verificationCode } from "./lib/hash";
import type { AuditMeta } from "./lib/hash";
import { TOOL_VERSION, TOOL_NAME } from "./lib/meta";
import { tr } from "./lib/strings";
import type { Lang } from "./lib/strings";
import { buildXlsx } from "./lib/xlsx";
import type { Cell } from "./lib/xlsx";
import { toCSV, download } from "./lib/export";

const GROUP_COLORS_CSS = ["#5b8dc4", "#c85a40", "#5a7a3a", "#8a5a2b"];
const GROUP_COLORS_PDF = [[91, 141, 196], [200, 90, 64], [90, 122, 58], [138, 90, 43]] as [number, number, number][];

const TR_DESIGNS: DesignId[] = ["partial-replicate", "full-replicate-2seq", "full-replicate-4seq"];

interface TreatmentInfo {
  product: string;
  substance: string;
  strength: string;
  role: "" | "Test" | "Reference";
  batch: string;
}
const emptyInfo: TreatmentInfo = { product: "", substance: "", strength: "", role: "", batch: "" };

function cryptoSeed(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 0xffffffff);
}

interface Generated {
  rows: GenRow[];
  reserveRows: GenRow[];
  sequences: string[][];
  sequenceLabels: string[];
  periods: number;
  varianceBalanced: boolean;
  strata: string[];
  meta: AuditMeta;
  generatedAt: string;
  hash: string;
  code: string;
}

export default function RandomizationPage() {
  const [lang, setLang] = useState<Lang>("en");
  const [method, setMethod] = useState<Method>("parallel");
  const [designId, setDesignId] = useState<DesignId | "">("");
  const [n, setN] = useState(24);
  const [nRaw, setNRaw] = useState("");
  const [groupsRaw, setGroupsRaw] = useState("");
  const [seed, setSeed] = useState<number>(() => cryptoSeed());
  const [seedRaw, setSeedRaw] = useState<string>("");
  const [blockSize, setBlockSize] = useState<number>(0);
  const [allocationRaw, setAllocationRaw] = useState<string>("");
  const [studyCode, setStudyCode] = useState<string>("");

  // Faz 2 — numbering, reserves, mapping, blinding
  const [reserveRaw, setReserveRaw] = useState<string>("");
  const [randPrefix, setRandPrefix] = useState<string>("");
  const [randStartRaw, setRandStartRaw] = useState<string>("1");
  const [randPad, setRandPad] = useState<number>(3);
  const [enrollEnabled, setEnrollEnabled] = useState<boolean>(false);
  const [enrollPrefix, setEnrollPrefix] = useState<string>("");
  const [enrollStartRaw, setEnrollStartRaw] = useState<string>("1");
  const [enrollPad, setEnrollPad] = useState<number>(3);
  const [mapping, setMapping] = useState<Record<string, TreatmentInfo>>({});
  const [outputMode, setOutputMode] = useState<"blinded" | "unblinded" | "both">("blinded");
  const [strataRaw, setStrataRaw] = useState<string>("");
  const [sponsor, setSponsor] = useState<string>("");
  const [protocolVersion, setProtocolVersion] = useState<string>("");
  const [protocolDate, setProtocolDate] = useState<string>("");

  const [genError, setGenError] = useState<{ en: string; tr: string; suggestion?: number; validBlocks?: number[] } | null>(null);
  const [result, setResult] = useState<Generated | null>(null);
  const [repro, setRepro] = useState<"idle" | "ok" | "mismatch">("idle");

  useEffect(() => {
    setSeedRaw(String(seed));
  }, []);

  const onLang = useCallback((l: Lang) => setLang(l), []);

  const groups = groupsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const design = method === "crossover" && designId ? DESIGNS[designId] : null;
  const isTRDesign = method === "crossover" && designId ? TR_DESIGNS.includes(designId) : false;

  const previewPeriods = design ? designPeriods(design, groups.length || (design.treatments ?? 0)) : 1;
  let previewSeqCount = 0;
  if (design && groups.length) {
    try {
      previewSeqCount = design.build(groups).length;
    } catch {
      previewSeqCount = 0;
    }
  }

  function clearOutput() {
    setResult(null);
    setGenError(null);
    setRepro("idle");
  }

  function generateRandomSeed() {
    const newSeed = cryptoSeed();
    setSeed(newSeed);
    setSeedRaw(String(newSeed));
  }

  function commitSeedFromInput() {
    const parsed = parseInt(seedRaw, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setSeed(parsed >>> 0);
      setSeedRaw(String(parsed >>> 0));
    } else {
      setSeedRaw(String(seed));
    }
  }

  function getInfo(g: string, idx: number): TreatmentInfo {
    const existing = mapping[g];
    if (existing) return existing;
    const role: TreatmentInfo["role"] = isTRDesign ? (idx === 0 ? "Test" : idx === 1 ? "Reference" : "") : "";
    return { ...emptyInfo, role };
  }
  function setInfo(g: string, patch: Partial<TreatmentInfo>, idx: number) {
    setMapping((m) => ({ ...m, [g]: { ...getInfo(g, idx), ...patch } }));
  }

  function parseStrata(): Stratum[] {
    return strataRaw
      .split(",")
      .map((tok) => {
        const [name, cnt] = tok.split(":");
        return { name: (name ?? "").trim(), n: parseInt((cnt ?? "").trim(), 10) || 0 };
      })
      .filter((s) => s.name && s.n > 0);
  }

  function buildParams() {
    return {
      method,
      drugs: groups,
      n,
      blockSize,
      seed,
      designId: method === "crossover" ? (designId || undefined) : undefined,
      allocationRatio: method === "parallel" ? allocationRaw : undefined,
      reserve: parseInt(reserveRaw, 10) || 0,
      strata: parseStrata(),
      randPrefix,
      randStart: parseInt(randStartRaw, 10) || 1,
      randPad,
      enrollEnabled,
      enrollPrefix,
      enrollStart: parseInt(enrollStartRaw, 10) || 1,
      enrollPad,
    };
  }

  async function generate() {
    setGenError(null);
    setRepro("idle");

    const res = generateSchedule(buildParams());
    if (!res.ok) {
      setResult(null);
      setGenError(res.error);
      return;
    }

    const meta: AuditMeta = {
      studyCode: studyCode.trim(),
      method,
      designId: method === "crossover" ? designId || undefined : undefined,
      drugs: [...groups],
      n,
      blockSize,
      seed,
      allocation: method === "parallel" ? allocationRaw : "balanced",
    };
    const allRows = [...res.rows, ...res.reserveRows];
    const hash = await sha256Hex(canonicalString(meta, allRows));

    setResult({
      rows: res.rows,
      reserveRows: res.reserveRows,
      sequences: res.sequences,
      sequenceLabels: res.sequenceLabels,
      periods: res.periods,
      varianceBalanced: res.varianceBalanced,
      strata: res.strata,
      meta,
      generatedAt: new Date().toISOString(),
      hash,
      code: verificationCode(hash),
    });
  }

  async function reproCheck() {
    if (!result) return;
    const res = generateSchedule(buildParams());
    if (!res.ok) {
      setRepro("mismatch");
      return;
    }
    const hash = await sha256Hex(canonicalString(result.meta, [...res.rows, ...res.reserveRows]));
    setRepro(hash === result.hash ? "ok" : "mismatch");
  }

  // --- derived helpers for output ---
  const allRows = result ? [...result.rows, ...result.reserveRows] : [];
  const mainWord = lang === "en" ? "Main" : "Esas";
  const setLabel = lang === "en" ? "Set" : "Küme";

  // Treatment code -> role, used to (un)blind. drugs are neutral codes (e.g. A/B);
  // the role mapping is the seal that the decode sheet reveals.
  const roleOf = (code: string): TreatmentInfo["role"] => {
    const idx = groups.indexOf(code);
    return idx >= 0 ? getInfo(code, idx).role : "";
  };
  const roleInitial = (code: string): string => {
    const role = roleOf(code);
    return role === "Test" ? "T" : role === "Reference" ? "R" : code;
  };
  const roleCell = (code: string): string => {
    const role = roleOf(code);
    return role === "Test" ? tr(lang, "tmTest") : role === "Reference" ? tr(lang, "tmReference") : code;
  };

  // --- export matrix builders ---
  function scheduleMatrix(unblinded: boolean): Cell[][] {
    if (!result) return [];
    const stratified = result.strata.length > 0;
    const header: Cell[] = ["Randomization No"];
    if (enrollEnabled) header.push(tr(lang, "enrollCol"));
    if (stratified) header.push(tr(lang, "stratumCol"));
    header.push(setLabel);
    if (method === "crossover") {
      header.push(tr(lang, "seqCol"));
      for (let i = 0; i < result.periods; i++) header.push(`${tr(lang, "period")} ${i + 1}`);
    } else {
      header.push(tr(lang, "treatment"));
    }

    const body: Cell[][] = allRows.map((row) => {
      const line: Cell[] = [row.subjectId];
      if (enrollEnabled) line.push(row.enrollNo ?? "");
      if (stratified) line.push(row.stratum ?? "");
      line.push(row.isReserve ? tr(lang, "reserveTag") : mainWord);
      if (method === "crossover") {
        const seqLabel = unblinded ? row.treatments.map(roleInitial).join("") : row.sequenceLabel;
        const cells = unblinded ? row.treatments.map(roleCell) : row.treatments;
        line.push(seqLabel, ...cells);
      } else {
        line.push(unblinded ? roleCell(row.treatments[0]) : row.treatments[0]);
      }
      return line;
    });
    return [header, ...body];
  }

  function mappingFilled(): boolean {
    return groups.some((g) => {
      const info = mapping[g];
      return info && (info.product || info.substance || info.strength || info.role || info.batch);
    });
  }

  // Sealed decode sheet: code -> role + product identity.
  function decodeMatrix(): Cell[][] {
    const header: Cell[] = [
      tr(lang, "tmCode"),
      tr(lang, "tmFormulation"),
      tr(lang, "tmProduct"),
      tr(lang, "tmSubstance"),
      tr(lang, "tmStrength"),
      tr(lang, "tmBatch"),
    ];
    const body = groups.map((g, idx) => {
      const info = getInfo(g, idx);
      const role = info.role === "Test" ? tr(lang, "tmTest") : info.role === "Reference" ? tr(lang, "tmReference") : "";
      return [g, role, info.product, info.substance, info.strength, info.batch];
    });
    return [header, ...body];
  }

  function auditMatrix(): Cell[][] {
    if (!result) return [];
    const seqCount = result.sequenceLabels.length;
    const rows: Cell[][] = [];
    if (result.meta.studyCode) rows.push([tr(lang, "studyCode").replace(/ \(.*\)$/, ""), result.meta.studyCode]);
    if (sponsor.trim()) rows.push([tr(lang, "mSponsor"), sponsor.trim()]);
    if (protocolVersion.trim() || protocolDate.trim())
      rows.push([tr(lang, "mProtocol"), [protocolVersion.trim(), protocolDate.trim()].filter(Boolean).join(" · ")]);
    rows.push([tr(lang, "mDesign"), method === "parallel" ? tr(lang, "parallel") : design?.label[lang] ?? designId]);
    rows.push([tr(lang, "mTreatments"), `${groups.join(", ")} (${groups.length})`]);
    rows.push([tr(lang, "mSequences"), `${result.sequenceLabels.join(", ")} (${seqCount})`]);
    const seqCounts = result.sequenceLabels.map((s) => result.rows.filter((row) => row.sequenceLabel === s).length);
    rows.push([
      method === "parallel" ? tr(lang, "allocationRatio") : tr(lang, "mPerSeq"),
      method === "parallel" ? result.meta.allocation : seqCounts.join(" / "),
    ]);
    if (result.reserveRows.length) rows.push([tr(lang, "reserveSubjects"), String(result.reserveRows.length)]);
    if (result.strata.length) rows.push([tr(lang, "mStratification"), result.strata.join(", ")]);
    rows.push([tr(lang, "mBlock"), String(result.meta.blockSize)]);
    rows.push([tr(lang, "mSeed"), String(result.meta.seed)]);
    rows.push([tr(lang, "mAlgo"), `${RNG_ALGO} v${RNG_VERSION}`]);
    rows.push([tr(lang, "mGenerated"), result.generatedAt]);
    rows.push([tr(lang, "mTool"), `${TOOL_NAME} v${TOOL_VERSION}`]);
    rows.push([`${tr(lang, "mVerification")} (SHA-256)`, result.code]);
    return rows;
  }

  // Whether the on-screen / primary schedule reveals Test/Reference identity.
  const showDecode = outputMode !== "blinded" && mappingFilled();

  function exportCSV() {
    if (!result) {
      alert(tr(lang, "selectMethodFirst"));
      return;
    }
    const comments = auditMatrix().map(([k, v]) => `# ${k}: ${v}`).join("\r\n");
    let csv = `${comments}\r\n\r\n${toCSV(scheduleMatrix(outputMode === "unblinded"))}\r\n`;
    if (showDecode) {
      csv += `\r\n# ${tr(lang, "decodeTitle")} — ${tr(lang, "decodeIntro")}\r\n${toCSV(decodeMatrix())}\r\n`;
    }
    download(`randomization_${result.code}.csv`, "text/csv;charset=utf-8", "﻿" + csv);
  }

  function exportXLSX() {
    if (!result) {
      alert(tr(lang, "selectMethodFirst"));
      return;
    }
    const sheets = [{ name: tr(lang, "schedule"), rows: scheduleMatrix(outputMode === "unblinded") }];
    if (showDecode) sheets.push({ name: tr(lang, "decodeSheet"), rows: decodeMatrix() });
    sheets.push({ name: tr(lang, "auditSheet"), rows: auditMatrix() });
    const bytes = buildXlsx(sheets);
    download(
      `randomization_${result.code}.xlsx`,
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      bytes
    );
  }

  async function exportPDF() {
    if (!result) {
      alert(tr(lang, "selectMethodFirst"));
      return;
    }
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");
    const doc = new jsPDF();

    // code/role -> brand colour, so cells are coloured in both blinded and unblinded views.
    const cellColor: Record<string, [number, number, number]> = {};
    groups.forEach((g, idx) => {
      const c = GROUP_COLORS_PDF[idx % GROUP_COLORS_PDF.length];
      cellColor[g] = c;
      cellColor[roleCell(g)] = c;
    });

    const writeLines = (lines: string[], startY: number): number => {
      let y = startY;
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      for (const line of lines) {
        if (y > 282) { doc.addPage(); y = 20; }
        doc.text(line, 14, y);
        y += 5;
      }
      doc.setTextColor(0, 0, 0);
      return y;
    };

    // Audit header block printed at the top of every document.
    const renderHeader = (title: string, subtitle: string): number => {
      doc.setFont("times", "bold");
      doc.setFontSize(14);
      doc.text(title, 14, 18);
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      doc.setTextColor(20, 20, 20);
      doc.text(subtitle, 14, 25);
      let y = 32;
      doc.setTextColor(90, 90, 90);
      doc.setFontSize(7.5);
      doc.text("— Audit header —", 14, y);
      y += 4.5;
      for (const [k, v] of auditMatrix()) {
        doc.text(`${k}: ${v}`, 14, y);
        y += 4.2;
      }
      doc.setTextColor(0, 0, 0);
      return y + 4;
    };

    const codesSubtitle = `${method.toUpperCase()}${design ? " · " + design.label.en : ""} · CODES: ${groups.join(", ")} · N=${n}`;

    const renderSchedulePage = (unblinded: boolean, title: string) => {
      const startY = renderHeader(title, codesSubtitle);
      const matrix = scheduleMatrix(unblinded);
      autoTable(doc, {
        head: [matrix[0] as string[]],
        body: matrix.slice(1) as string[][],
        startY,
        styles: { font: "courier", fontSize: 8, cellPadding: 2, textColor: [20, 20, 20], fillColor: [255, 255, 255] },
        headStyles: { fillColor: [235, 235, 230], textColor: [20, 20, 20], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 247, 244] },
        tableLineColor: [180, 178, 170],
        tableLineWidth: 0.2,
        didParseCell(data) {
          if (data.column.index > 0) data.cell.styles.halign = "center";
          if (data.section === "body") {
            const c = cellColor[String(data.cell.raw)];
            if (c) {
              data.cell.styles.textColor = c;
              data.cell.styles.fontStyle = "bold";
            }
          }
        },
      });
      let y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100) + 12;
      const sigDate = tr(lang, "sigDate");
      y = writeLines(
        [
          "— Signatures —",
          `${tr(lang, "sigPrepared")}: ______________________    ${sigDate}: ____________`,
          "",
          `${tr(lang, "sigChecked")}: ______________________    ${sigDate}: ____________`,
          "",
          `${tr(lang, "sigApproved")}: ______________________    ${sigDate}: ____________`,
        ],
        y
      );
    };

    const renderDecodePage = () => {
      doc.addPage();
      const startY = renderHeader("Sealed Treatment Decode Sheet", tr(lang, "decodeIntro"));
      const matrix = decodeMatrix();
      autoTable(doc, {
        head: [matrix[0] as string[]],
        body: matrix.slice(1) as string[][],
        startY,
        styles: { font: "courier", fontSize: 8, cellPadding: 2, textColor: [20, 20, 20], fillColor: [255, 255, 255] },
        headStyles: { fillColor: [235, 235, 230], textColor: [20, 20, 20], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 247, 244] },
        tableLineColor: [180, 178, 170],
        tableLineWidth: 0.2,
      });
      let y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100) + 12;
      const sigDate = tr(lang, "sigDate");
      y = writeLines(
        [
          `${tr(lang, "sigPrepared")}: ______________________    ${sigDate}: ____________`,
          "",
          `${tr(lang, "sigSignature")} / Seal: ______________________________________`,
        ],
        y
      );
    };

    if (outputMode === "both") {
      renderSchedulePage(false, "Blinded Randomization Schedule");
      renderDecodePage();
    } else if (outputMode === "unblinded") {
      renderSchedulePage(true, "Randomization Schedule (Unblinded)");
      if (mappingFilled()) renderDecodePage();
    } else {
      renderSchedulePage(false, "Blinded Randomization Schedule");
    }

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      doc.setTextColor(140, 138, 128);
      doc.text(`Page ${p} / ${totalPages}`, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 8, { align: "right" });
      doc.text(`trialgrids.com · verify ${result.code}`, 14, doc.internal.pageSize.height - 8);
    }
    doc.save(`randomization_${result.code}.pdf`);
  }

  // --- balance summary ---
  function balanceData() {
    if (!result) return null;
    const seqCounts: Record<string, number> = {};
    const reserveCounts: Record<string, number> = {};
    for (const row of result.rows) seqCounts[row.sequenceLabel] = (seqCounts[row.sequenceLabel] ?? 0) + 1;
    for (const row of result.reserveRows) reserveCounts[row.sequenceLabel] = (reserveCounts[row.sequenceLabel] ?? 0) + 1;
    const perPeriod: Record<string, number>[] = Array.from({ length: result.periods }, () => ({}));
    for (const row of result.rows)
      row.treatments.forEach((t, pi) => {
        perPeriod[pi][t] = (perPeriod[pi][t] ?? 0) + 1;
      });
    return { seqCounts, reserveCounts, perPeriod };
  }
  const balance = balanceData();

  const unblindedView = outputMode === "unblinded";
  const showSeqCol = method === "crossover" && !!result;
  const stratified = !!result && result.strata.length > 0;
  const groupIndex = (val: string) => groups.indexOf(val);

  const numInput = (label: string, value: string, onChange: (v: string) => void, width = "100%", placeholder = "") => (
    <div>
      <label>{label}</label>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} style={{ width, fontSize: ".72rem" }} />
    </div>
  );

  const metaRow = (label: string, value: string) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", padding: ".2rem 0" }}>
      <span style={{ color: "var(--muted, #7a7868)" }}>{label}</span>
      <span style={{ textAlign: "right", fontFamily: "var(--font-jetbrains-mono)" }}>{value}</span>
    </div>
  );

  return (
    <main style={{ position: "relative" }}>
      <LanguageToggle onChange={onLang} />

      <div className="hero">
        <div>
          <p className="eyebrow">{tr(lang, "eyebrow")}</p>
          <h1>{tr(lang, "heading")}</h1>
          <p className="lede">{tr(lang, "lede")}</p>
        </div>
        <div className="meta">
          tool 01
          <br />
          client-side only
          <br />
          {tr(lang, "verified")}
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>{tr(lang, "studyParams")}</h2>
          <span className="tag">{tr(lang, "configure")}</span>
        </div>
        <div className="panel-body">

          {/* Method */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label>{tr(lang, "method")}</label>
            <div className="method-toggle">
              <button className={`method-btn${method === "parallel" ? " active" : ""}`} onClick={() => { setMethod("parallel"); clearOutput(); }}>
                {tr(lang, "parallel")}
              </button>
              <button className={`method-btn${method === "crossover" ? " active" : ""}`} onClick={() => { setMethod("crossover"); clearOutput(); }}>
                {tr(lang, "crossover")}
              </button>
            </div>
          </div>

          {/* Crossover design selector */}
          {method === "crossover" && (
            <div style={{ marginBottom: "1.5rem" }}>
              <label>{tr(lang, "design")}</label>
              <Select
                value={designId}
                onChange={(v) => { setDesignId(v as DesignId); clearOutput(); }}
                placeholder={tr(lang, "selectDesign")}
                options={DESIGN_ORDER.map((id) => ({ value: id, label: DESIGNS[id].label[lang] }))}
              />
              {design && (
                <p style={{ marginTop: ".4rem", fontSize: ".72rem", color: "var(--muted, #7a7868)", fontFamily: "var(--font-jetbrains-mono)" }}>
                  {design.note[lang]}
                  {previewSeqCount > 0 && (
                    <> {" · "}{tr(lang, "periodsDerived")}: {previewPeriods} · {tr(lang, "seqCount")}: {previewSeqCount}</>
                  )}
                </p>
              )}
            </div>
          )}

          {/* Parameter grid */}
          <div className="controls" style={{ alignItems: "flex-start" }}>
            <div>
              <label>{tr(lang, "totalVolunteers")}</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 24"
                value={nRaw}
                style={{ fontSize: ".63rem" }}
                onChange={(e) => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setNRaw(raw);
                  const num = parseInt(raw);
                  if (!isNaN(num) && num >= 2 && num <= 2000) setN(num);
                }}
                onBlur={() => {
                  const num = parseInt(nRaw);
                  if (!isNaN(num) && num >= 2 && num <= 2000) setN(num);
                }}
              />
            </div>
            <div>
              <label>{tr(lang, "drugs")}</label>
              <input
                type="text"
                value={groupsRaw}
                onChange={(e) => setGroupsRaw(e.target.value)}
                placeholder={isTRDesign ? "T, R" : "A, B"}
                style={{ width: "100%", fontSize: ".72rem" }}
              />
              {isTRDesign && (
                <p style={{ marginTop: ".3rem", fontSize: ".66rem", color: "var(--muted, #7a7868)", fontFamily: "var(--font-jetbrains-mono)" }}>
                  {tr(lang, "drugsHintReplicate")}
                </p>
              )}
            </div>
            <div>
              <label>{tr(lang, "seed")}</label>
              <input
                type="text"
                inputMode="numeric"
                value={seedRaw}
                onChange={(e) => setSeedRaw(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={commitSeedFromInput}
                style={{ width: "100%" }}
              />
              <button
                onClick={generateRandomSeed}
                style={{ background: "none", border: "none", color: "var(--accent)", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".68rem", textTransform: "uppercase", letterSpacing: ".05em", cursor: "pointer", padding: 0, marginTop: ".35rem" }}
              >
                🎲 {tr(lang, "randomize")}
              </button>
            </div>
            <div>
              <label>{tr(lang, "blockSize")}</label>
              <Select
                value={String(blockSize || "")}
                onChange={(v) => { const num = parseInt(v, 10); if (!isNaN(num)) setBlockSize(num); }}
                placeholder={tr(lang, "pleaseSelect")}
                options={[2, 4, 6, 8, 12].map((b) => ({ value: String(b), label: String(b) }))}
              />
            </div>
            {method === "parallel" && (
              <div>
                <label>{tr(lang, "allocationRatio")}</label>
                <input type="text" value={allocationRaw} onChange={(e) => setAllocationRaw(e.target.value)} placeholder="1:1" style={{ width: "100%" }} />
              </div>
            )}
            <div>
              <label>{tr(lang, "studyCode")}</label>
              <input type="text" value={studyCode} onChange={(e) => setStudyCode(e.target.value)} placeholder="IST-2026-01" style={{ width: "100%", fontSize: ".72rem" }} />
            </div>
            <div>
              <label>{tr(lang, "reserveSubjects")}</label>
              <input type="text" inputMode="numeric" value={reserveRaw} onChange={(e) => setReserveRaw(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" style={{ width: "100%" }} />
            </div>
            <div>
              <label>{tr(lang, "sponsor")}</label>
              <input type="text" value={sponsor} onChange={(e) => setSponsor(e.target.value)} placeholder="CRO Ltd." style={{ width: "100%", fontSize: ".72rem" }} />
            </div>
            <div>
              <label>{tr(lang, "protocolVersion")}</label>
              <input type="text" value={protocolVersion} onChange={(e) => setProtocolVersion(e.target.value)} placeholder="v1.0" style={{ width: "100%", fontSize: ".72rem" }} />
            </div>
            <div>
              <label>{tr(lang, "protocolDate")}</label>
              <input type="text" value={protocolDate} onChange={(e) => setProtocolDate(e.target.value)} placeholder="2026-01-15" style={{ width: "100%", fontSize: ".72rem" }} />
            </div>
          </div>

          {/* Stratification */}
          <div style={{ marginTop: "1.5rem" }}>
            <label>{tr(lang, "stratification")}</label>
            <input
              type="text"
              value={strataRaw}
              onChange={(e) => { setStrataRaw(e.target.value); clearOutput(); }}
              placeholder="Male:12, Female:12"
              style={{ width: "100%", fontSize: ".72rem" }}
            />
            <p style={{ marginTop: ".3rem", fontSize: ".66rem", color: "var(--muted, #7a7868)", fontFamily: "var(--font-jetbrains-mono)" }}>
              {tr(lang, "stratificationHint")}
            </p>
          </div>

          {/* Numbering options */}
          <details style={{ marginTop: "1rem", border: "1px solid var(--rule, #e8e4d8)", borderRadius: "6px", padding: ".5rem .9rem" }}>
            <summary style={{ cursor: "pointer", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".05em" }}>
              {tr(lang, "optionsTitle")}
            </summary>
            <div className="controls" style={{ marginTop: "1rem", alignItems: "flex-start" }}>
              {numInput(tr(lang, "randPrefix"), randPrefix, setRandPrefix, "100%", "IST-")}
              {numInput(tr(lang, "startNo"), randStartRaw, (v) => setRandStartRaw(v.replace(/[^0-9]/g, "")), "100%", "1")}
              <div>
                <label>{tr(lang, "padWidth")}</label>
                <Select value={String(randPad)} onChange={(v) => setRandPad(parseInt(v, 10))} options={[2, 3, 4, 5].map((b) => ({ value: String(b), label: String(b) }))} />
              </div>
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: ".5rem", marginTop: "1rem", cursor: "pointer", fontFamily: "var(--font-inter, system-ui)", fontSize: ".8rem", textTransform: "none", letterSpacing: 0 }}>
              <input type="checkbox" checked={enrollEnabled} onChange={(e) => setEnrollEnabled(e.target.checked)} />
              {tr(lang, "enrollEnabled")}
            </label>
            {enrollEnabled && (
              <div className="controls" style={{ marginTop: ".75rem", alignItems: "flex-start" }}>
                {numInput(tr(lang, "enrollPrefix"), enrollPrefix, setEnrollPrefix, "100%", "SCR-")}
                {numInput(tr(lang, "startNo"), enrollStartRaw, (v) => setEnrollStartRaw(v.replace(/[^0-9]/g, "")), "100%", "1")}
                <div>
                  <label>{tr(lang, "padWidth")}</label>
                  <Select value={String(enrollPad)} onChange={(v) => setEnrollPad(parseInt(v, 10))} options={[2, 3, 4, 5].map((b) => ({ value: String(b), label: String(b) }))} />
                </div>
              </div>
            )}
          </details>

          {/* Treatment details / mapping */}
          {groups.length > 0 && (
            <details style={{ marginTop: "1rem", border: "1px solid var(--rule, #e8e4d8)", borderRadius: "6px", padding: ".5rem .9rem" }}>
              <summary style={{ cursor: "pointer", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".72rem", textTransform: "uppercase", letterSpacing: ".05em" }}>
                {tr(lang, "treatmentDetailsTitle")}
              </summary>
              <p style={{ margin: ".6rem 0", fontSize: ".7rem", color: "var(--muted, #7a7868)", fontFamily: "var(--font-jetbrains-mono)" }}>{tr(lang, "mappingHint")}</p>
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", fontSize: ".72rem" }}>
                  <thead>
                    <tr>
                      <th style={{ textAlign: "left" }}>{tr(lang, "tmCode")}</th>
                      <th style={{ textAlign: "left" }}>{tr(lang, "tmProduct")}</th>
                      <th style={{ textAlign: "left" }}>{tr(lang, "tmSubstance")}</th>
                      <th style={{ textAlign: "left" }}>{tr(lang, "tmStrength")}</th>
                      <th style={{ textAlign: "left" }}>{tr(lang, "tmFormulation")}</th>
                      <th style={{ textAlign: "left" }}>{tr(lang, "tmBatch")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((g, idx) => {
                      const info = getInfo(g, idx);
                      const cell = (v: string, on: (val: string) => void, ph = "") => (
                        <input type="text" value={v} onChange={(e) => on(e.target.value)} placeholder={ph} style={{ width: "100%", fontSize: ".7rem" }} />
                      );
                      return (
                        <tr key={g}>
                          <td style={{ fontFamily: "var(--font-jetbrains-mono)", fontWeight: 600, color: GROUP_COLORS_CSS[idx % GROUP_COLORS_CSS.length] }}>{g}</td>
                          <td>{cell(info.product, (val) => setInfo(g, { product: val }, idx))}</td>
                          <td>{cell(info.substance, (val) => setInfo(g, { substance: val }, idx))}</td>
                          <td>{cell(info.strength, (val) => setInfo(g, { strength: val }, idx), "100 mg")}</td>
                          <td>
                            <Select
                              value={info.role}
                              onChange={(val) => setInfo(g, { role: val as TreatmentInfo["role"] }, idx)}
                              options={[
                                { value: "", label: tr(lang, "tmNone") },
                                { value: "Test", label: tr(lang, "tmTest") },
                                { value: "Reference", label: tr(lang, "tmReference") },
                              ]}
                            />
                          </td>
                          <td>{cell(info.batch, (val) => setInfo(g, { batch: val }, idx))}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </details>
          )}

          <div className="btn-row" style={{ flexWrap: "wrap" }}>
            <button className="btn" onClick={generate}>{tr(lang, "generate")}</button>
            <button className="btn ghost" onClick={exportPDF}>{tr(lang, "exportPdf")}</button>
            <button className="btn ghost" onClick={exportCSV}>{tr(lang, "exportCsv")}</button>
            <button className="btn ghost" onClick={exportXLSX}>{tr(lang, "exportXlsx")}</button>
          </div>

          {genError && (
            <div style={{ marginTop: "1rem", padding: ".75rem 1rem", border: "1px solid #c85a40", color: "#c85a40", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".75rem", background: "rgba(200, 90, 64, 0.05)", borderRadius: "4px" }}>
              ⚠ {genError[lang]}
              {genError.suggestion != null && (
                <>
                  {" "}
                  <button
                    onClick={() => { setN(genError.suggestion as number); setNRaw(String(genError.suggestion)); }}
                    style={{ background: "none", border: "none", color: "#c85a40", textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0 }}
                  >
                    {tr(lang, "suggestionPrefix")} {genError.suggestion}
                  </button>
                </>
              )}
              {genError.validBlocks && genError.validBlocks.length > 0 && (
                <div style={{ marginTop: ".4rem" }}>
                  {tr(lang, "validBlocksPrefix")}{" "}
                  {genError.validBlocks.map((b, i) => (
                    <span key={b}>
                      {i > 0 && ", "}
                      <button
                        onClick={() => setBlockSize(b)}
                        style={{ background: "none", border: "none", color: "#c85a40", textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0 }}
                      >
                        {b}
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}

          {result && (
            <>
              {/* Output mode selector */}
              <div style={{ marginTop: "1.5rem", marginBottom: ".75rem" }}>
                <label>{tr(lang, "outputMode")}</label>
                <div className="method-toggle" style={{ maxWidth: "440px" }}>
                  <button className={`method-btn${outputMode === "blinded" ? " active" : ""}`} onClick={() => setOutputMode("blinded")}>{tr(lang, "omBlinded")}</button>
                  <button className={`method-btn${outputMode === "unblinded" ? " active" : ""}`} onClick={() => setOutputMode("unblinded")}>{tr(lang, "omUnblinded")}</button>
                  <button className={`method-btn${outputMode === "both" ? " active" : ""}`} onClick={() => setOutputMode("both")}>{tr(lang, "omBoth")}</button>
                </div>
                <p style={{ marginTop: ".4rem", fontSize: ".7rem", color: "var(--muted, #7a7868)", fontFamily: "var(--font-jetbrains-mono)" }}>
                  {tr(lang, outputMode === "blinded" ? "omBlindedHint" : outputMode === "unblinded" ? "omUnblindedHint" : "omBothHint")}
                </p>
              </div>

              <div className="result">
                <table>
                  <thead>
                    <tr>
                      <th>{tr(lang, "idCol")}</th>
                      {enrollEnabled && <th>{tr(lang, "enrollCol")}</th>}
                      {stratified && <th>{tr(lang, "stratumCol")}</th>}
                      <th style={{ textAlign: "center" }}>{setLabel}</th>
                      {showSeqCol && <th style={{ textAlign: "center" }}>{tr(lang, "seqCol")}</th>}
                      {method === "crossover"
                        ? Array.from({ length: result.periods }, (_, i) => <th key={i} style={{ textAlign: "center" }}>{`${tr(lang, "period")} ${i + 1}`}</th>)
                        : <th style={{ textAlign: "center" }}>{tr(lang, "treatment")}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {allRows.map((row) => {
                      const seqText = unblindedView ? row.treatments.map(roleInitial).join("") : row.sequenceLabel;
                      return (
                        <tr key={(row.isReserve ? "r" : "m") + row.subjectId} style={row.isReserve ? { background: "rgba(184,67,42,0.04)" } : undefined}>
                          <td style={row.isReserve ? { fontStyle: "italic" } : undefined}>{row.subjectId}</td>
                          {enrollEnabled && <td>{row.enrollNo ?? ""}</td>}
                          {stratified && <td style={{ fontSize: ".7rem" }}>{row.stratum ?? ""}</td>}
                          <td style={{ textAlign: "center", fontSize: ".68rem", color: "var(--muted, #7a7868)" }}>{row.isReserve ? tr(lang, "reserveTag") : mainWord}</td>
                          {showSeqCol && <td style={{ textAlign: "center", fontFamily: "var(--font-jetbrains-mono)", fontWeight: 600 }}>{seqText}</td>}
                          {row.treatments.map((t, i) => {
                            const idx = groupIndex(t);
                            return <td key={i} style={{ color: GROUP_COLORS_CSS[idx % GROUP_COLORS_CSS.length], fontWeight: 500, textAlign: "center" }}>{unblindedView ? roleCell(t) : t}</td>;
                          })}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Sealed treatment decode (shown for unblinded / both when roles set) */}
              {outputMode !== "blinded" && (
                <div style={{ marginTop: "1.5rem", border: "1px solid #b8432a", borderRadius: "6px", padding: "1rem 1.25rem", background: "rgba(184,67,42,0.03)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".5rem" }}>
                    <strong style={{ fontFamily: "var(--font-jetbrains-mono)", textTransform: "uppercase", letterSpacing: ".05em", fontSize: ".7rem", color: "#b8432a" }}>🔒 {tr(lang, "decodeTitle")}</strong>
                    <span className="tag">{tr(lang, "decodeTag")}</span>
                  </div>
                  <p style={{ margin: "0 0 .6rem", fontSize: ".72rem", color: "var(--muted, #7a7868)", fontFamily: "var(--font-jetbrains-mono)" }}>{tr(lang, "decodeIntro")}</p>
                  {mappingFilled() ? (
                    <table style={{ fontSize: ".75rem" }}>
                      <thead>
                        <tr>{decodeMatrix()[0].map((h, i) => <th key={i} style={{ textAlign: "left" }}>{String(h)}</th>)}</tr>
                      </thead>
                      <tbody>
                        {decodeMatrix().slice(1).map((r, ri) => (
                          <tr key={ri}>{r.map((c, ci) => <td key={ci} style={ci === 0 ? { fontFamily: "var(--font-jetbrains-mono)", fontWeight: 600, color: GROUP_COLORS_CSS[ri % GROUP_COLORS_CSS.length] } : undefined}>{String(c)}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <p style={{ margin: 0, fontSize: ".72rem", color: "#b8432a" }}>{tr(lang, "decodeSetRoles")}</p>
                  )}
                </div>
              )}

              {/* Balance summary */}
              {balance && (
                <div style={{ marginTop: "1.5rem", border: "1px solid var(--rule, #e8e4d8)", borderRadius: "6px", padding: "1rem 1.25rem" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".75rem" }}>
                    <strong style={{ fontFamily: "var(--font-jetbrains-mono)", textTransform: "uppercase", letterSpacing: ".05em", fontSize: ".7rem" }}>{tr(lang, "balanceTitle")}</strong>
                    {result.varianceBalanced && method === "crossover" && (
                      <span style={{ color: "#5a7a3a", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".68rem" }}>✓ {tr(lang, "varianceBalanced")}</span>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap", fontSize: ".75rem" }}>
                    <table style={{ fontSize: ".75rem" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left" }}>{tr(lang, "bSequence")}</th>
                          <th style={{ textAlign: "right" }}>{tr(lang, "bN")}</th>
                          {result.reserveRows.length > 0 && <th style={{ textAlign: "right" }}>{tr(lang, "bReserve")}</th>}
                        </tr>
                      </thead>
                      <tbody>
                        {result.sequenceLabels.map((s) => (
                          <tr key={s}>
                            <td style={{ fontFamily: "var(--font-jetbrains-mono)" }}>{unblindedView ? s.split("").map(roleInitial).join("") : s}</td>
                            <td style={{ textAlign: "right" }}>{balance.seqCounts[s] ?? 0}</td>
                            {result.reserveRows.length > 0 && <td style={{ textAlign: "right" }}>{balance.reserveCounts[s] ?? 0}</td>}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {method === "crossover" && (
                      <div>
                        <div style={{ fontSize: ".68rem", color: "var(--muted, #7a7868)", marginBottom: ".35rem", fontFamily: "var(--font-jetbrains-mono)" }}>{tr(lang, "bPerPeriod")}</div>
                        <table style={{ fontSize: ".75rem" }}>
                          <thead>
                            <tr>
                              <th style={{ textAlign: "left" }}>{tr(lang, "period")}</th>
                              {groups.map((g) => <th key={g} style={{ textAlign: "right" }}>{g}</th>)}
                            </tr>
                          </thead>
                          <tbody>
                            {balance.perPeriod.map((dist, pi) => (
                              <tr key={pi}>
                                <td>{pi + 1}</td>
                                {groups.map((g) => <td key={g} style={{ textAlign: "right" }}>{dist[g] ?? 0}</td>)}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Audit & reproducibility */}
              <div style={{ marginTop: "1.5rem", border: "1px solid var(--rule, #e8e4d8)", borderRadius: "6px", padding: "1rem 1.25rem", fontSize: ".75rem", fontFamily: "var(--font-inter, system-ui)", background: "var(--paper-2, #fff)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".5rem" }}>
                  <strong style={{ fontFamily: "var(--font-jetbrains-mono)", textTransform: "uppercase", letterSpacing: ".05em", fontSize: ".7rem" }}>{tr(lang, "auditTitle")}</strong>
                </div>
                {auditMatrix().filter(([, v]) => v !== result.code).map(([k, v], i) => <div key={i}>{metaRow(String(k), String(v))}</div>)}
                <div style={{ marginTop: ".6rem", paddingTop: ".6rem", borderTop: "1px solid var(--rule, #e8e4d8)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: "var(--muted, #7a7868)", fontSize: ".68rem" }}>{tr(lang, "mVerification")} (SHA-256)</div>
                    <code style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: ".95rem", letterSpacing: ".05em" }}>{result.code}</code>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <button className="btn ghost" style={{ marginBottom: ".25rem" }} onClick={reproCheck}>{tr(lang, "reproCheck")}</button>
                    {repro === "ok" && <div style={{ color: "#5a7a3a", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".7rem" }}>✓ {tr(lang, "reproOk")}</div>}
                    {repro === "mismatch" && <div style={{ color: "#c85a40", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".7rem" }}>✗ {tr(lang, "reproMismatch")}</div>}
                  </div>
                </div>
                <p style={{ marginTop: ".5rem", color: "var(--muted, #7a7868)", fontSize: ".66rem", fontFamily: "var(--font-jetbrains-mono)" }}>{tr(lang, "reproHint")}</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Methodology & validation (static reference) */}
      <div className="panel" style={{ marginTop: "2rem" }}>
        <div className="panel-head">
          <h2>{tr(lang, "methTitle")}</h2>
          <span className="tag">{tr(lang, "methTag")}</span>
        </div>
        <div className="panel-body">
          {([
            ["methAlgoH", "methAlgoP"],
            ["methBalanceH", "methBalanceP"],
            ["methKatH", "methKatP"],
            ["methReproH", "methReproP"],
            ["methVersionH", "methVersionP"],
          ] as const).map(([h, p]) => (
            <div key={h} style={{ marginBottom: "1.25rem" }}>
              <h3 style={{ fontFamily: "var(--font-jetbrains-mono)", textTransform: "uppercase", letterSpacing: ".05em", fontSize: ".72rem", margin: "0 0 .4rem" }}>
                {tr(lang, h)}
              </h3>
              <p style={{ margin: 0, fontSize: ".82rem", lineHeight: 1.6, color: "var(--ink, #2a2722)" }}>{tr(lang, p)}</p>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
