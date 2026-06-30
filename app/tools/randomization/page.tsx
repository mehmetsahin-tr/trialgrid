"use client";

import { useState, useEffect, useCallback } from "react";
import Select from "@/app/components/Select";
import LanguageToggle from "@/app/components/LanguageToggle";
import { RNG_ALGO, RNG_VERSION } from "./lib/rng";
import { DESIGNS, DESIGN_ORDER, designPeriods } from "./lib/designs";
import type { DesignId } from "./lib/designs";
import { generateSchedule } from "./lib/generate";
import type { GenRow, Method } from "./lib/generate";
import { canonicalString, sha256Hex, verificationCode } from "./lib/hash";
import type { AuditMeta } from "./lib/hash";
import { TOOL_VERSION, TOOL_NAME } from "./lib/meta";
import { tr } from "./lib/strings";
import type { Lang } from "./lib/strings";

// Colors indexed by group/treatment position — works for any drug name.
const GROUP_COLORS_CSS = ["#5b8dc4", "#c85a40", "#5a7a3a", "#8a5a2b"];
const GROUP_COLORS_PDF = [[91, 141, 196], [200, 90, 64], [90, 122, 58], [138, 90, 43]] as [number, number, number][];

// Designs that treat the drugs as Test (T) / Reference (R) — order matters.
const TR_DESIGNS: DesignId[] = ["partial-replicate", "full-replicate-2seq", "full-replicate-4seq"];

function cryptoSeed(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 0xffffffff);
}

interface Generated {
  rows: GenRow[];
  sequences: string[][];
  sequenceLabels: string[];
  periods: number;
  varianceBalanced: boolean;
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
  const [genError, setGenError] = useState<{ en: string; tr: string; suggestion?: number } | null>(null);
  const [result, setResult] = useState<Generated | null>(null);
  const [repro, setRepro] = useState<"idle" | "ok" | "mismatch">("idle");

  useEffect(() => {
    setSeedRaw(String(seed));
  }, []);

  const onLang = useCallback((l: Lang) => setLang(l), []);

  const groups = groupsRaw.split(",").map((s) => s.trim()).filter(Boolean);
  const design = method === "crossover" && designId ? DESIGNS[designId] : null;
  const isTRDesign = method === "crossover" && designId ? TR_DESIGNS.includes(designId) : false;

  // Derived period/sequence preview for the config panel.
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

  async function generate() {
    setGenError(null);
    setRepro("idle");

    const res = generateSchedule({
      method,
      drugs: groups,
      n,
      blockSize,
      seed,
      designId: method === "crossover" ? (designId || undefined) : undefined,
      allocationRatio: method === "parallel" ? allocationRaw : undefined,
    });

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
    const hash = await sha256Hex(canonicalString(meta, res.rows));

    setResult({
      rows: res.rows,
      sequences: res.sequences,
      sequenceLabels: res.sequenceLabels,
      periods: res.periods,
      varianceBalanced: res.varianceBalanced,
      meta,
      generatedAt: new Date().toISOString(),
      hash,
      code: verificationCode(hash),
    });
  }

  async function reproCheck() {
    if (!result) return;
    const res = generateSchedule({
      method: result.meta.method as Method,
      drugs: result.meta.drugs,
      n: result.meta.n,
      blockSize: result.meta.blockSize,
      seed: result.meta.seed,
      designId: (result.meta.designId as DesignId) || undefined,
      allocationRatio: result.meta.method === "parallel" ? result.meta.allocation : undefined,
    });
    if (!res.ok) {
      setRepro("mismatch");
      return;
    }
    const hash = await sha256Hex(canonicalString(result.meta, res.rows));
    setRepro(hash === result.hash ? "ok" : "mismatch");
  }

  async function exportPDF() {
    if (!result) {
      alert(tr(lang, "selectMethodFirst"));
      return;
    }
    const { rows, periods, meta } = result;
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    const showSeq = method === "crossover";
    const pdfHeaders = [
      tr(lang, "idCol"),
      ...(showSeq ? [tr(lang, "seqCol")] : []),
      ...Array.from({ length: periods }, (_, i) =>
        showSeq ? `${tr(lang, "period")} ${i + 1}` : tr(lang, "treatment")
      ),
    ];

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("Randomization Schedule", 14, 18);
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    const subtitle = `${method.toUpperCase()}${design ? " · " + design.label.en : ""} · DRUGS: ${groups.join(", ")} · N=${n}`;
    doc.text(subtitle, 14, 26);

    autoTable(doc, {
      head: [pdfHeaders],
      body: rows.map((row) => [
        row.subjectId,
        ...(showSeq ? [row.sequenceLabel] : []),
        ...row.treatments,
      ]),
      startY: 32,
      styles: { font: "courier", fontSize: 8, cellPadding: 2, textColor: [20, 20, 20], fillColor: [255, 255, 255] },
      headStyles: { fillColor: [235, 235, 230], textColor: [20, 20, 20], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 247, 244] },
      tableLineColor: [180, 178, 170],
      tableLineWidth: 0.2,
      didParseCell(data) {
        const seqOffset = showSeq ? 1 : 0;
        if (data.column.index > 0) data.cell.styles.halign = "center";
        if (data.section === "body" && data.column.index > seqOffset) {
          const cellVal = String(data.cell.raw);
          const idx = groups.indexOf(cellVal);
          if (idx >= 0) {
            data.cell.styles.textColor = GROUP_COLORS_PDF[idx % GROUP_COLORS_PDF.length];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;
    let y = finalY + 14;

    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);

    const seqCount = result.sequenceLabels.length;
    const lines = [
      "— Audit & reproducibility —",
      meta.studyCode ? `Study code:   ${meta.studyCode}` : null,
      `Design:       ${method === "parallel" ? "Parallel" : design?.label.en ?? designId}`,
      `Treatments:   ${groups.join(", ")} (${groups.length})`,
      `Sequences:    ${result.sequenceLabels.join(", ")} (${seqCount})`,
      method === "parallel" ? `Allocation:   ${meta.allocation}` : `Subjects/seq: ${n / seqCount}`,
      `Block size:   ${meta.blockSize}`,
      `Seed:         ${meta.seed}`,
      `Algorithm:    ${RNG_ALGO} v${RNG_VERSION} (Fisher-Yates)`,
      `Generated:    ${result.generatedAt}`,
      `Tool:         ${TOOL_NAME} v${TOOL_VERSION} — trialgrids.com`,
      `Verification: ${result.code}  (SHA-256, first 16)`,
    ].filter(Boolean) as string[];

    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(line, 14, y);
      y += 5;
    }
    doc.setTextColor(0, 0, 0);

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      doc.setTextColor(140, 138, 128);
      doc.text(`Page ${p} / ${totalPages}`, doc.internal.pageSize.width - 14, doc.internal.pageSize.height - 8, { align: "right" });
      doc.text(`trialgrids.com · verify ${result.code}`, 14, doc.internal.pageSize.height - 8);
    }

    doc.save("randomization.pdf");
  }

  const showSeqCol = method === "crossover" && !!result;
  const resultPeriods = result?.periods ?? 1;
  const periodHeaders = Array.from({ length: resultPeriods }, (_, i) => `${tr(lang, "period")} ${i + 1}`);
  const groupIndex = (val: string) => groups.indexOf(val);

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
              <button
                className={`method-btn${method === "parallel" ? " active" : ""}`}
                onClick={() => { setMethod("parallel"); clearOutput(); }}
              >
                {tr(lang, "parallel")}
              </button>
              <button
                className={`method-btn${method === "crossover" ? " active" : ""}`}
                onClick={() => { setMethod("crossover"); clearOutput(); }}
              >
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
                onChange={(e) => { setGroupsRaw(e.target.value); }}
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
                <input
                  type="text"
                  value={allocationRaw}
                  onChange={(e) => setAllocationRaw(e.target.value)}
                  placeholder="1:1"
                  style={{ width: "100%" }}
                />
              </div>
            )}
            <div>
              <label>{tr(lang, "studyCode")}</label>
              <input
                type="text"
                value={studyCode}
                onChange={(e) => setStudyCode(e.target.value)}
                placeholder="IST-2026-01"
                style={{ width: "100%", fontSize: ".72rem" }}
              />
            </div>
          </div>

          <div className="btn-row">
            <button className="btn" onClick={generate}>{tr(lang, "generate")}</button>
            <button className="btn ghost" onClick={exportPDF}>{tr(lang, "exportPdf")}</button>
          </div>

          {genError && (
            <div style={{
              marginTop: "1rem",
              padding: ".75rem 1rem",
              border: "1px solid #c85a40",
              color: "#c85a40",
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: ".75rem",
              background: "rgba(200, 90, 64, 0.05)",
              borderRadius: "4px",
            }}>
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
            </div>
          )}

          {result && (
            <>
              <div className="result">
                <table>
                  <thead>
                    <tr>
                      <th>{tr(lang, "idCol")}</th>
                      {showSeqCol && <th style={{ textAlign: "center" }}>{tr(lang, "seqCol")}</th>}
                      {method === "crossover"
                        ? periodHeaders.map((h) => <th key={h} style={{ textAlign: "center" }}>{h}</th>)
                        : <th style={{ textAlign: "center" }}>{tr(lang, "treatment")}</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {result.rows.map((row) => (
                      <tr key={row.subjectId}>
                        <td>{row.subjectId}</td>
                        {showSeqCol && (
                          <td style={{ textAlign: "center", fontFamily: "var(--font-jetbrains-mono)", fontWeight: 600 }}>{row.sequenceLabel}</td>
                        )}
                        {row.treatments.map((t, i) => {
                          const idx = groupIndex(t);
                          return (
                            <td key={i} style={{ color: GROUP_COLORS_CSS[idx % GROUP_COLORS_CSS.length], fontWeight: 500, textAlign: "center" }}>{t}</td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Audit & reproducibility panel */}
              <div style={{
                marginTop: "1.5rem",
                border: "1px solid var(--rule, #e8e4d8)",
                borderRadius: "6px",
                padding: "1rem 1.25rem",
                fontSize: ".75rem",
                fontFamily: "var(--font-inter, system-ui)",
                background: "var(--paper-2, #fff)",
              }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".5rem" }}>
                  <strong style={{ fontFamily: "var(--font-jetbrains-mono)", textTransform: "uppercase", letterSpacing: ".05em", fontSize: ".7rem" }}>
                    {tr(lang, "auditTitle")}
                  </strong>
                  {result.varianceBalanced && method === "crossover" && (
                    <span style={{ color: "#5a7a3a", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".68rem" }}>
                      ✓ {tr(lang, "varianceBalanced")}
                    </span>
                  )}
                </div>

                {result.meta.studyCode && metaRow(tr(lang, "studyCode").replace(" (optional)", "").replace(" (opsiyonel)", ""), result.meta.studyCode)}
                {metaRow(tr(lang, "mDesign"), method === "parallel" ? tr(lang, "parallel") : design?.label[lang] ?? designId)}
                {metaRow(tr(lang, "mTreatments"), `${groups.join(", ")} (${groups.length})`)}
                {metaRow(tr(lang, "mSequences"), `${result.sequenceLabels.join(", ")} (${result.sequenceLabels.length})`)}
                {metaRow(
                  method === "parallel" ? tr(lang, "allocationRatio") : tr(lang, "mPerSeq"),
                  method === "parallel" ? result.meta.allocation : String(n / result.sequenceLabels.length)
                )}
                {metaRow(tr(lang, "mBlock"), String(result.meta.blockSize))}
                {metaRow(tr(lang, "mSeed"), String(result.meta.seed))}
                {metaRow(tr(lang, "mAlgo"), `${RNG_ALGO} v${RNG_VERSION}`)}
                {metaRow(tr(lang, "mGenerated"), result.generatedAt)}
                {metaRow(tr(lang, "mTool"), `${TOOL_NAME} v${TOOL_VERSION}`)}

                <div style={{ marginTop: ".6rem", paddingTop: ".6rem", borderTop: "1px solid var(--rule, #e8e4d8)", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "1rem", flexWrap: "wrap" }}>
                  <div>
                    <div style={{ color: "var(--muted, #7a7868)", fontSize: ".68rem" }}>{tr(lang, "mVerification")} (SHA-256)</div>
                    <code style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: ".95rem", letterSpacing: ".05em" }}>{result.code}</code>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <button
                      className="btn ghost"
                      style={{ marginBottom: ".25rem" }}
                      onClick={reproCheck}
                    >
                      {tr(lang, "reproCheck")}
                    </button>
                    {repro === "ok" && (
                      <div style={{ color: "#5a7a3a", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".7rem" }}>✓ {tr(lang, "reproOk")}</div>
                    )}
                    {repro === "mismatch" && (
                      <div style={{ color: "#c85a40", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".7rem" }}>✗ {tr(lang, "reproMismatch")}</div>
                    )}
                  </div>
                </div>
                <p style={{ marginTop: ".5rem", color: "var(--muted, #7a7868)", fontSize: ".66rem", fontFamily: "var(--font-jetbrains-mono)" }}>
                  {tr(lang, "reproHint")}
                </p>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}
