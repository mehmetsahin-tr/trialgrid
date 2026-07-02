"use client";

import { useState, useEffect, useRef } from "react";
import Select from "@/app/components/Select";
import { RNG_ALGO, RNG_VERSION } from "./lib/rng";
import { DESIGNS, DESIGN_ORDER, designPeriods } from "./lib/designs";
import type { DesignId } from "./lib/designs";
import { generateSchedule, parseAllocationRatio, parseStratification, applyStratumSuggestion, STRATUM_SEP, BLOCK_OPTIONS } from "./lib/generate";
import type { GenRow, Method, Stratum } from "./lib/generate";
import { canonicalString, sha256Hex } from "./lib/hash";
import { TOOL_VERSION, TOOL_NAME } from "./lib/meta";
import { tr } from "./lib/strings";
import type { Lang } from "./lib/strings";
import { buildXlsx } from "./lib/xlsx";
import type { Cell } from "./lib/xlsx";
import { toCSV, download } from "./lib/export";
import { reproduceRun } from "./lib/reproduce";
import { encodeSpec } from "./lib/spectoken";
import type { RunSnapshot, TreatmentInfo, OutputMode, Generated } from "./lib/snapshot";

// Calm, non-clashing data colours (purple / teal / olive / amber), WCAG AA on
// light backgrounds. The SEQUENCE column carries the AB/BA text too, so colour
// is never the only distinguisher (colour-blind safe).
const GROUP_COLORS_CSS = ["#6d28d9", "#0f766e", "#4d7c0f", "#b45309"];
const GROUP_COLORS_PDF = [[109, 40, 217], [15, 118, 110], [77, 124, 15], [180, 83, 9]] as [number, number, number][];

const TR_DESIGNS: DesignId[] = ["partial-replicate", "full-replicate-2seq", "full-replicate-4seq"];

const emptyInfo: TreatmentInfo = { product: "", substance: "", strength: "", role: "", batch: "" };

function cryptoSeed(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 0xffffffff);
}

// localStorage key for the client-side run history (never leaves the device).
const RUNS_KEY = "trialgrid.randomization.runs.v1";

interface RunRecord {
  id: string;
  savedAt: string;
  code: string;
  studyCode: string;
  summary: string;
  final: boolean;
  snapshot: RunSnapshot;
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
  const [outputMode, setOutputMode] = useState<OutputMode>("blinded");
  const [strataRaw, setStrataRaw] = useState<string>("");
  const [treatmentOpen, setTreatmentOpen] = useState<boolean>(false);
  const treatmentRef = useRef<HTMLDetailsElement>(null);

  function openTreatmentDetails() {
    setTreatmentOpen(true);
    setTimeout(() => treatmentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" }), 50);
  }
  const [sponsor, setSponsor] = useState<string>("");
  const [protocolVersion, setProtocolVersion] = useState<string>("");
  const [protocolDate, setProtocolDate] = useState<string>("");
  const [generatedBy, setGeneratedBy] = useState<string>("");
  const [checkedBy, setCheckedBy] = useState<string>("");

  const [genError, setGenError] = useState<{ en: string; tr: string; suggestion?: number; validBlocks?: number[]; stratum?: string } | null>(null);
  const [result, setResult] = useState<Generated | null>(null);
  // The exact snapshot that produced `result` — used to build the verification spec token.
  const [resultSnapshot, setResultSnapshot] = useState<RunSnapshot | null>(null);
  const [specCopied, setSpecCopied] = useState<boolean>(false);
  const [repro, setRepro] = useState<"idle" | "ok" | "mismatch">("idle");
  const [ackImbalance, setAckImbalance] = useState<boolean>(false);
  const [exportGate, setExportGate] = useState<boolean>(false);
  const balanceRef = useRef<HTMLDivElement>(null);
  const [runs, setRuns] = useState<RunRecord[]>([]);
  const runsLoaded = useRef<boolean>(false);

  useEffect(() => {
    // Load run history from localStorage once on mount.
    try {
      const raw = localStorage.getItem(RUNS_KEY);
      if (raw) setRuns(JSON.parse(raw) as RunRecord[]);
    } catch {
      /* corrupt or unavailable storage — start empty */
    }
    runsLoaded.current = true;
  }, []);

  useEffect(() => {
    // Persist after the initial load (avoid clobbering storage with []).
    if (!runsLoaded.current) return;
    try {
      localStorage.setItem(RUNS_KEY, JSON.stringify(runs));
    } catch {
      /* storage full or blocked — history is best-effort */
    }
  }, [runs]);

  useEffect(() => {
    // Sync the seed input once on mount (initial seed is generated client-side).
    setSeedRaw(String(seed));
    // Language follows the site-wide preference set on the landing page.
    try {
      const saved = localStorage.getItem("trialgrids-lang");
      if (saved === "en" || saved === "tr") setLang(saved);
    } catch {
      /* localStorage unavailable — keep default */
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // Balancing unit for block-size validity: sequence count (crossover) or
  // allocation-ratio sum (parallel). Used to dim invalid block options.
  const blockUnit = method === "parallel"
    ? (parseAllocationRatio(allocationRaw, groups.length)?.reduce((a, b) => a + b, 0) ?? groups.length ?? 1)
    : (previewSeqCount || 1);
  const blockOptions = BLOCK_OPTIONS.map((b) => ({
    value: String(b),
    label: String(b),
    disabled: n > 0 && (n % b !== 0 || b % blockUnit !== 0),
  }));

  function clearOutput() {
    setResult(null);
    setResultSnapshot(null);
    setSpecCopied(false);
    setGenError(null);
    setRepro("idle");
    setAckImbalance(false);
    setExportGate(false);
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

  /** Parsed strata for generation; [] when the input is empty or malformed (error surfaced separately). */
  function stratStrata(): Stratum[] {
    const p = parseStratification(strataRaw);
    return "error" in p ? [] : p.strata;
  }

  function buildParams(strata: Stratum[]) {
    return {
      method,
      drugs: groups,
      n,
      blockSize,
      seed,
      designId: method === "crossover" ? (designId || undefined) : undefined,
      allocationRatio: method === "parallel" ? allocationRaw : undefined,
      reserve: parseInt(reserveRaw, 10) || 0,
      strata,
      randPrefix,
      randStart: parseInt(randStartRaw, 10) || 1,
      randPad,
      enrollEnabled,
      enrollPrefix,
      enrollStart: parseInt(enrollStartRaw, 10) || 1,
      enrollPad,
    };
  }

  /**
   * Apply a stratum-scoped "Try N" suggestion to the stratification input, then
   * re-run validation so the warning clears — or advances to the next offending
   * stratum if more remain. Does not generate the schedule (user still clicks Generate).
   */
  function applyStrataFix(stratum: string, suggestion: number) {
    const updated = applyStratumSuggestion(strataRaw, stratum, suggestion);
    setStrataRaw(updated);
    setResult(null);
    setRepro("idle");
    setAckImbalance(false);
    setExportGate(false);
    const plan = parseStratification(updated);
    if ("error" in plan) {
      setGenError(plan.error);
      return;
    }
    const res = generateSchedule(buildParams(plan.strata));
    setGenError(res.ok ? null : res.error);
  }

  /** Snapshot every input needed to reproduce and re-display the current run. */
  function collectInputs(): RunSnapshot {
    return {
      method, designId, n, groupsRaw, seed, blockSize, allocationRaw,
      studyCode, sponsor, protocolVersion, protocolDate, generatedBy, checkedBy,
      reserveRaw, randPrefix, randStartRaw, randPad,
      enrollEnabled, enrollPrefix, enrollStartRaw, enrollPad,
      mapping, outputMode, strataRaw,
    };
  }

  // Generate from an explicit input snapshot (not component state) so restoring a
  // saved run reproduces it deterministically regardless of pending setState.
  async function generateFrom(input: RunSnapshot, save: boolean) {
    setGenError(null);
    setRepro("idle");
    setAckImbalance(false);
    setExportGate(false);

    // Reproduce through the shared engine so the live tool and the /verify page
    // always produce the identical schedule and verification code.
    const rep = await reproduceRun(input);
    if (!rep.ok) {
      setResult(null);
      setGenError(rep.error);
      return;
    }
    const generatedAt = new Date().toISOString();
    setResult({ ...rep.result, generatedAt });
    setResultSnapshot(input);
    setSpecCopied(false);

    if (save) saveRun(input, rep.result.code, generatedAt, rep.result.rows.length);
  }

  async function generate() {
    await generateFrom(collectInputs(), true);
  }

  function saveRun(input: RunSnapshot, code: string, savedAt: string, mainCount: number) {
    const designLabel = input.method === "parallel"
      ? "Parallel"
      : (input.designId ? DESIGNS[input.designId].label.en : "Crossover");
    const summary = `${designLabel} · N=${mainCount} · seed ${input.seed}`;
    setRuns((prev) => {
      const prior = prev.find((r) => r.code === code);
      const rec: RunRecord = {
        id: `${savedAt}-${code}`,
        savedAt,
        code,
        studyCode: input.studyCode.trim(),
        summary,
        final: prior?.final ?? false, // preserve a final flag when re-saving identical params
        snapshot: input,
      };
      return [rec, ...prev.filter((r) => r.code !== code)].slice(0, 50);
    });
  }

  function restoreRun(run: RunRecord) {
    const s = run.snapshot;
    setMethod(s.method); setDesignId(s.designId);
    setN(s.n); setNRaw(String(s.n)); setGroupsRaw(s.groupsRaw);
    setSeed(s.seed); setSeedRaw(String(s.seed)); setBlockSize(s.blockSize); setAllocationRaw(s.allocationRaw);
    setStudyCode(s.studyCode); setSponsor(s.sponsor); setProtocolVersion(s.protocolVersion); setProtocolDate(s.protocolDate);
    setGeneratedBy(s.generatedBy); setCheckedBy(s.checkedBy); setReserveRaw(s.reserveRaw);
    setRandPrefix(s.randPrefix); setRandStartRaw(s.randStartRaw); setRandPad(s.randPad);
    setEnrollEnabled(s.enrollEnabled); setEnrollPrefix(s.enrollPrefix); setEnrollStartRaw(s.enrollStartRaw); setEnrollPad(s.enrollPad);
    setMapping(s.mapping); setOutputMode(s.outputMode); setStrataRaw(s.strataRaw);
    generateFrom(s, false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function toggleFinal(id: string) {
    setRuns((prev) => {
      const target = prev.find((r) => r.id === id);
      if (!target) return prev;
      const makeFinal = !target.final;
      // One final delivery per study code: marking one unmarks its siblings.
      return prev.map((r) => {
        if (r.id === id) return { ...r, final: makeFinal };
        if (makeFinal && r.studyCode === target.studyCode) return { ...r, final: false };
        return r;
      });
    });
  }

  function deleteRun(id: string) {
    setRuns((prev) => prev.filter((r) => r.id !== id));
  }

  function clearHistory() {
    if (typeof window !== "undefined" && !window.confirm(tr(lang, "histClearConfirm"))) return;
    setRuns([]);
  }

  async function reproCheck() {
    if (!result) return;
    const res = generateSchedule(buildParams(stratStrata()));
    if (!res.ok) {
      setRepro("mismatch");
      return;
    }
    const hash = await sha256Hex(canonicalString(result.meta, [...res.rows, ...res.reserveRows]));
    setRepro(hash === result.hash ? "ok" : "mismatch");
  }

  // Portable verification spec token for the current result (carries every input
  // needed to independently reproduce it on the /verify page).
  function buildSpecToken(): string {
    if (!result || !resultSnapshot) return "";
    return encodeSpec({
      snap: resultSnapshot,
      rng: `${RNG_ALGO}@${RNG_VERSION}`,
      tool: TOOL_VERSION,
      code: result.code,
      generatedAt: result.generatedAt,
    });
  }

  async function copySpec() {
    const token = buildSpecToken();
    if (!token || typeof navigator === "undefined" || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(token);
      setSpecCopied(true);
      setTimeout(() => setSpecCopied(false), 2000);
    } catch {
      /* clipboard blocked — the code is still visible for manual copy */
    }
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
    if ((result.meta.generatedBy ?? "").trim()) rows.push([tr(lang, "mGeneratedBy"), (result.meta.generatedBy ?? "").trim()]);
    if (checkedBy.trim()) rows.push([tr(lang, "mCheckedBy"), checkedBy.trim()]);
    rows.push([tr(lang, "mDesign"), method === "parallel" ? tr(lang, "parallel") : design?.label[lang] ?? designId]);
    rows.push([tr(lang, "mTreatments"), `${groups.join(", ")} (${groups.length})`]);
    rows.push([tr(lang, "mSequences"), `${result.sequenceLabels.join(", ")} (${seqCount})`]);
    const seqCounts = result.sequenceLabels.map((s) => result.rows.filter((row) => row.sequenceLabel === s).length);
    rows.push([
      method === "parallel" ? tr(lang, "allocationRatio") : tr(lang, "mPerSeq"),
      method === "parallel" ? result.meta.allocation : seqCounts.join(" / "),
    ]);
    if (result.reserveRows.length) rows.push([tr(lang, "reserveSubjects"), String(result.reserveRows.length)]);
    if (result.strata.length) {
      const stratDesc = result.axes.length
        ? `${result.axes.map((a) => `${a.name} (${a.levels.join(", ")})`).join(" × ")} · ${result.rows.length / result.strata.length}/${lang === "en" ? "cell" : "hücre"}`
        : result.strata.join(", ");
      rows.push([tr(lang, "mStratification"), stratDesc]);
    }
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

  // Finalize gate: refuse to export an imbalanced schedule until acknowledged.
  function guardExport(): boolean {
    const r = balanceReview();
    if (r && !r.balanced && !ackImbalance) {
      setExportGate(true);
      balanceRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
      return false;
    }
    setExportGate(false);
    return true;
  }

  function exportCSV() {
    if (!result) {
      alert(tr(lang, "selectMethodFirst"));
      return;
    }
    if (!guardExport()) return;
    const comments = auditMatrix().map(([k, v]) => `# ${k}: ${v}`).join("\r\n");
    const integrity = `# ${tr(lang, "integrityTitle")}: ${tr(lang, "integrityStatement")}`;
    const spec = `# ${tr(lang, "specTitle")}: ${buildSpecToken()}`;
    let csv = `${comments}\r\n${integrity}\r\n${spec}\r\n\r\n${toCSV(scheduleMatrix(outputMode === "unblinded"))}\r\n`;
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
    if (!guardExport()) return;
    const sheets = [{ name: tr(lang, "schedule"), rows: scheduleMatrix(outputMode === "unblinded") }];
    if (showDecode) sheets.push({ name: tr(lang, "decodeSheet"), rows: decodeMatrix() });
    const auditRows: Cell[][] = [
      ...auditMatrix(),
      [],
      [tr(lang, "integrityTitle"), tr(lang, "integrityStatement")],
      [tr(lang, "specTitle"), buildSpecToken()],
    ];
    sheets.push({ name: tr(lang, "auditSheet"), rows: auditRows });
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
    if (!guardExport()) return;
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
      // Integrity statement — the architectural answer to "any manual changes".
      y += 2;
      doc.setFont("times", "italic");
      doc.setFontSize(7.5);
      doc.setTextColor(70, 70, 70);
      const stmt = `${tr(lang, "integrityTitle")}: ${tr(lang, "integrityStatement")}`;
      const wrapped = doc.splitTextToSize(stmt, doc.internal.pageSize.width - 28) as string[];
      for (const line of wrapped) {
        if (y > 282) { doc.addPage(); y = 20; }
        doc.text(line, 14, y);
        y += 3.8;
      }
      doc.setFont("courier", "normal");
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
      const y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100) + 12;
      const sigDate = tr(lang, "sigDate");
      // Auto-fill the name onto the signature line when the operator was recorded.
      const sigLine = (label: string, name: string) => {
        const filled = name.trim();
        const nameField = filled ? filled.padEnd(22, " ") : "______________________";
        return `${label}: ${nameField}    ${sigDate}: ____________`;
      };
      const afterSig = writeLines(
        [
          "— Signatures —",
          sigLine(tr(lang, "sigPrepared"), generatedBy),
          "",
          sigLine(tr(lang, "sigChecked"), checkedBy),
          "",
          sigLine(tr(lang, "sigApproved"), ""),
        ],
        y
      );
      // Machine-readable verification spec token — paste on the /verify page to
      // reproduce this schedule independently. Small and wrapped so it stays out
      // of the way of the signed content.
      const specToken = buildSpecToken();
      if (specToken) {
        doc.setFont("courier", "normal");
        doc.setFontSize(6.5);
        doc.setTextColor(120, 120, 120);
        let sy = afterSig + 4;
        if (sy > 275) { doc.addPage(); sy = 20; }
        doc.text(`${tr(lang, "specTitle")} (verify at trialgrids.com/tools/randomization/verify):`, 14, sy);
        sy += 3.6;
        const wrapped = doc.splitTextToSize(specToken, doc.internal.pageSize.width - 28) as string[];
        for (const line of wrapped) {
          if (sy > 286) { doc.addPage(); sy = 20; }
          doc.text(line, 14, sy);
          sy += 3.2;
        }
        doc.setTextColor(0, 0, 0);
      }
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
      const y = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100) + 12;
      const sigDate = tr(lang, "sigDate");
      const preparedName = generatedBy.trim() ? generatedBy.trim().padEnd(22, " ") : "______________________";
      writeLines(
        [
          `${tr(lang, "sigPrepared")}: ${preparedName}    ${sigDate}: ____________`,
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
      doc.text(`trialgrids.com/tools/randomization/verify · ${result.code}`, 14, doc.internal.pageSize.height - 8);
    }
    doc.save(`randomization_${result.code}.pdf`);
  }

  // --- balance review (finalize gate) ---
  interface BalCell { seq: string; n: number; target: number; dev: number }
  interface BalGroup { label: string; total: number; cells: BalCell[]; balanced: boolean }

  function balanceReview() {
    if (!result) return null;
    const labels = result.sequenceLabels;
    const weights = method === "parallel"
      ? (parseAllocationRatio(result.meta.allocation, labels.length) ?? labels.map(() => 1))
      : labels.map(() => 1);
    const sumW = weights.reduce((a, b) => a + b, 0) || 1;

    const makeGroup = (label: string, rows: GenRow[]): BalGroup => {
      const counts: Record<string, number> = {};
      for (const row of rows) counts[row.sequenceLabel] = (counts[row.sequenceLabel] ?? 0) + 1;
      const total = rows.length;
      const cells = labels.map((s, i) => {
        const n = counts[s] ?? 0;
        const target = (total * weights[i]) / sumW;
        return { seq: s, n, target, dev: n - target };
      });
      const balanced = cells.every((c) => Math.abs(c.dev) < 1e-9);
      return { label, total, cells, balanced };
    };

    const overallLabel = lang === "en" ? "Overall" : "Genel";
    const groups: BalGroup[] = result.strata.length
      ? result.strata.map((s) => makeGroup(s, result.rows.filter((r) => r.stratum === s)))
      : [makeGroup(overallLabel, result.rows)];

    // Per-axis marginal balance (multi-axis only): each level summed over the other axes.
    const axisViews = result.axes.map((axis, ai) => ({
      name: axis.name,
      levels: axis.levels.map((lvl) =>
        makeGroup(lvl, result.rows.filter((r) => (r.stratum ?? "").split(STRATUM_SEP)[ai] === lvl))
      ),
    }));

    const reserve = result.reserveRows.length ? makeGroup(tr(lang, "bReserve"), result.reserveRows) : null;

    // Per-period treatment distribution (crossover only).
    const perPeriod: Record<string, number>[] = Array.from({ length: result.periods }, () => ({}));
    for (const row of result.rows)
      row.treatments.forEach((t, pi) => {
        perPeriod[pi][t] = (perPeriod[pi][t] ?? 0) + 1;
      });

    // Human-readable flags for each imbalanced group.
    const unblinded = outputMode === "unblinded";
    const flagLabel = (g: BalGroup) =>
      `${g.label}: ${g.cells.map((c) => `${unblinded ? c.seq.split("").map(roleInitial).join("") : c.seq}=${c.n}`).join(", ")}`;
    const flags: string[] = [];
    for (const g of groups) if (!g.balanced) flags.push(flagLabel(g));
    if (reserve && !reserve.balanced) flags.push(flagLabel(reserve));

    const balanced = groups.every((g) => g.balanced) && (!reserve || reserve.balanced);
    return { labels, groups, axisViews, reserve, perPeriod, balanced, flags };
  }
  const balance = balanceReview();
  const imbalance = !!balance && !balance.balanced;

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
      <div className="hero">
        <div>
          <p className="eyebrow">{tr(lang, "eyebrow")}</p>
          <h1>{tr(lang, "heading")}</h1>
          <p className="lede">{tr(lang, "lede")}</p>
          <a
            href="/tools/randomization/verify"
            style={{ display: "inline-block", marginTop: ".5rem", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".74rem", color: "var(--accent-2-ink, #b8432a)", textDecoration: "underline", textUnderlineOffset: "3px" }}
          >
            {tr(lang, "verifyHeroLink")}
          </a>
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

          {/* Group: Design */}
          <div className="field-group">
            <div className="field-group-head"><h3>{tr(lang, "grpDesign")}</h3></div>
            <div style={{ marginBottom: method === "crossover" ? "1rem" : 0 }}>
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
            {method === "crossover" && (
              <div>
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
          </div>

          {/* Group: Core randomization */}
          <div className="field-group">
            <div className="field-group-head"><h3>{tr(lang, "grpCore")}</h3></div>
            <div className="field-grid cols-4">
              <div>
                <label>{tr(lang, "totalVolunteers")}</label>
                <input
                  type="text"
                  inputMode="numeric"
                  placeholder="e.g. 24"
                  value={nRaw}
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
                />
                {isTRDesign && (
                  <p style={{ marginTop: ".3rem", fontSize: ".66rem", color: "var(--muted, #7a7868)", fontFamily: "var(--font-jetbrains-mono)" }}>
                    {tr(lang, "drugsHintReplicate")}
                  </p>
                )}
              </div>
              <div>
                <label>{tr(lang, "seed")}</label>
                <div className="seed-wrap">
                  <input
                    type="text"
                    inputMode="numeric"
                    value={seedRaw}
                    onChange={(e) => setSeedRaw(e.target.value.replace(/[^0-9]/g, ""))}
                    onBlur={commitSeedFromInput}
                  />
                  <button className="seed-dice" onClick={generateRandomSeed} title={tr(lang, "randomize")} aria-label={tr(lang, "randomize")}>🎲</button>
                </div>
              </div>
              <div>
                <label>{tr(lang, "blockSize")}</label>
                <Select
                  value={String(blockSize || "")}
                  onChange={(v) => { const num = parseInt(v, 10); if (!isNaN(num)) setBlockSize(num); }}
                  placeholder={tr(lang, "pleaseSelect")}
                  options={blockOptions}
                />
              </div>
              {method === "parallel" && (
                <div>
                  <label>{tr(lang, "allocationRatio")}</label>
                  <input type="text" value={allocationRaw} onChange={(e) => setAllocationRaw(e.target.value)} placeholder="1:1" />
                </div>
              )}
            </div>
          </div>

          {/* Group: Audit metadata (optional) */}
          <div className="field-group optional">
            <div className="field-group-head">
              <h3>{tr(lang, "grpAudit")}</h3>
              <span className="opt">{tr(lang, "optionalTag")}</span>
            </div>
            <div className="field-grid cols-4">
              <div>
                <label>{tr(lang, "studyCode").replace(/ \(.*\)$/, "")}</label>
                <input type="text" value={studyCode} onChange={(e) => setStudyCode(e.target.value)} placeholder="IST-2026-01" />
              </div>
              <div>
                <label>{tr(lang, "sponsor")}</label>
                <input type="text" value={sponsor} onChange={(e) => setSponsor(e.target.value)} placeholder="CRO Ltd." />
              </div>
              <div>
                <label>{tr(lang, "protocolVersion")}</label>
                <input type="text" value={protocolVersion} onChange={(e) => setProtocolVersion(e.target.value)} placeholder="v1.0" />
              </div>
              <div>
                <label>{tr(lang, "protocolDate")}</label>
                <input type="text" value={protocolDate} onChange={(e) => setProtocolDate(e.target.value)} placeholder="2026-01-15" />
              </div>
            </div>
            <div className="field-grid cols-2" style={{ marginTop: "1rem" }}>
              <div>
                <label>{tr(lang, "generatedBy")}</label>
                <input type="text" value={generatedBy} onChange={(e) => { setGeneratedBy(e.target.value); clearOutput(); }} placeholder={tr(lang, "generatedByPh")} />
                <p style={{ marginTop: ".3rem", fontSize: ".66rem", color: "var(--muted, #7a7868)", fontFamily: "var(--font-jetbrains-mono)" }}>
                  {tr(lang, "generatedByHint")}
                </p>
              </div>
              <div>
                <label>{tr(lang, "checkedByField")}</label>
                <input type="text" value={checkedBy} onChange={(e) => setCheckedBy(e.target.value)} placeholder={tr(lang, "checkedByPh")} />
              </div>
            </div>
          </div>

          {/* Group: Numbering & blinding (optional) */}
          <div className="field-group optional">
            <div className="field-group-head">
              <h3>{tr(lang, "grpNumbering")}</h3>
              <span className="opt">{tr(lang, "optionalTag")}</span>
            </div>
            <div className="field-grid cols-2" style={{ marginBottom: "1rem" }}>
              <div>
                <label>{tr(lang, "reserveSubjects")}</label>
                <input type="text" inputMode="numeric" value={reserveRaw} onChange={(e) => setReserveRaw(e.target.value.replace(/[^0-9]/g, ""))} placeholder="0" />
              </div>
              <div>
                <label>{tr(lang, "stratification")}</label>
                <input
                  type="text"
                  value={strataRaw}
                  onChange={(e) => { setStrataRaw(e.target.value); clearOutput(); }}
                  placeholder="Male:12, Female:12"
                />
                <p style={{ marginTop: ".3rem", fontSize: ".66rem", color: "var(--muted, #7a7868)", fontFamily: "var(--font-jetbrains-mono)" }}>
                  {tr(lang, "stratificationHint")}
                </p>
              </div>
            </div>

          {/* Numbering options */}
          <details style={{ border: "1px solid var(--rule, #e8e4d8)", borderRadius: "6px", padding: ".5rem .9rem" }}>
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
            <details
              ref={treatmentRef}
              open={treatmentOpen}
              onToggle={(e) => setTreatmentOpen((e.currentTarget as HTMLDetailsElement).open)}
              style={{ marginTop: "1rem", border: "1px solid var(--rule, #e8e4d8)", borderRadius: "6px", padding: ".5rem .9rem" }}
            >
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
          </div>
          {/* end Group: Numbering & blinding */}

          <div className="btn-row" style={{ flexWrap: "wrap" }}>
            <button className="btn" onClick={generate}>{tr(lang, "generate")}</button>
          </div>

          {genError && (
            <div style={{ marginTop: "1rem", padding: ".75rem 1rem", border: "1px solid #c85a40", color: "#c85a40", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".75rem", background: "rgba(200, 90, 64, 0.05)", borderRadius: "4px" }}>
              ⚠ {genError[lang]}
              {genError.suggestion != null && (
                <>
                  {" "}
                  <button
                    aria-label={`${tr(lang, "applySuggested")} ${genError.suggestion}`}
                    onClick={() => {
                      const s = genError.suggestion as number;
                      if (genError.stratum) {
                        applyStrataFix(genError.stratum, s);
                      } else {
                        setN(s);
                        setNRaw(String(s));
                      }
                    }}
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

              {/* Sealed treatment decode preview (unblinded / both modes) */}
              {outputMode !== "blinded" && (
                <div style={{ marginTop: "1.5rem", border: "1px solid var(--warn)", borderRadius: "6px", padding: "1rem 1.25rem", background: "var(--warn-soft)" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".5rem" }}>
                    <strong style={{ fontFamily: "var(--font-jetbrains-mono)", textTransform: "uppercase", letterSpacing: ".05em", fontSize: ".7rem", color: "var(--warn)" }}>🔒 {tr(lang, "decodePreview")}</strong>
                    <span className="tag">{tr(lang, "decodeTag")}</span>
                  </div>
                  <p style={{ margin: "0 0 .6rem", fontSize: ".72rem", color: "var(--muted, #7a7868)", fontFamily: "var(--font-jetbrains-mono)" }}>{tr(lang, "decodeIntro")}</p>
                  {!mappingFilled() && (
                    <div style={{ margin: "0 0 .75rem", padding: ".6rem .8rem", border: "1px solid var(--warn)", borderRadius: "4px", fontSize: ".72rem", color: "var(--warn)", fontFamily: "var(--font-jetbrains-mono)" }}>
                      ⚠ {tr(lang, "decodeMissingRoles")}{" "}
                      <button onClick={openTreatmentDetails} style={{ background: "none", border: "none", color: "var(--warn)", textDecoration: "underline", cursor: "pointer", fontFamily: "inherit", fontSize: "inherit", padding: 0 }}>
                        {tr(lang, "openTreatmentDetails")} ↑
                      </button>
                    </div>
                  )}
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ fontSize: ".75rem" }}>
                      <thead>
                        <tr>{decodeMatrix()[0].map((h, i) => <th key={i} style={{ textAlign: "left" }}>{String(h)}</th>)}</tr>
                      </thead>
                      <tbody>
                        {decodeMatrix().slice(1).map((r, ri) => (
                          <tr key={ri}>{r.map((c, ci) => <td key={ci} style={ci === 0 ? { fontFamily: "var(--font-jetbrains-mono)", fontWeight: 600, color: GROUP_COLORS_CSS[ri % GROUP_COLORS_CSS.length] } : undefined}>{String(c) || "—"}</td>)}</tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <p style={{ margin: ".7rem 0 0", fontSize: ".66rem", color: "var(--muted, #7a7868)", fontFamily: "var(--font-jetbrains-mono)" }}>
                    {tr(lang, "mSeed")}: {result.meta.seed} · {tr(lang, "mVerification")}: {result.code} · {tr(lang, "sealPdfOnly")}
                  </p>
                </div>
              )}

              {/* Balance review — finalize gate */}
              {balance && (
                <div ref={balanceRef} style={{ marginTop: "1.5rem", border: `1px solid ${imbalance ? "var(--warn)" : "var(--rule, #e8e4d8)"}`, borderRadius: "6px", padding: "1rem 1.25rem", background: imbalance ? "var(--warn-soft)" : undefined }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".5rem", gap: "1rem", flexWrap: "wrap" }}>
                    <strong style={{ fontFamily: "var(--font-jetbrains-mono)", textTransform: "uppercase", letterSpacing: ".05em", fontSize: ".7rem" }}>{tr(lang, "balanceReviewTitle")}</strong>
                    <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: ".68rem", color: imbalance ? "var(--warn)" : "#5a7a3a" }}>
                      {imbalance ? `⚠ ${tr(lang, "imbalanceDetected")}` : `✓ ${tr(lang, "balancedAll")}`}
                    </span>
                  </div>
                  <p style={{ margin: "0 0 .75rem", fontSize: ".7rem", color: "var(--muted, #7a7868)", fontFamily: "var(--font-jetbrains-mono)" }}>{tr(lang, "reviewIntro")}</p>

                  {/* Per-stratum / overall distribution (n per sequence, target on hover) */}
                  <div style={{ overflowX: "auto" }}>
                    <table style={{ fontSize: ".75rem" }}>
                      <thead>
                        <tr>
                          <th style={{ textAlign: "left" }}>{stratified ? tr(lang, "stratumCol") : ""}</th>
                          {balance.labels.map((s) => <th key={s} style={{ textAlign: "right", fontFamily: "var(--font-jetbrains-mono)" }}>{unblindedView ? s.split("").map(roleInitial).join("") : s}</th>)}
                          <th style={{ textAlign: "right" }}>{tr(lang, "bN")}</th>
                        </tr>
                      </thead>
                      <tbody>
                        {balance.groups.map((g) => (
                          <tr key={g.label}>
                            <td style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: ".7rem" }}>{g.label}</td>
                            {g.cells.map((c) => {
                              const off = Math.abs(c.dev) >= 1e-9;
                              return <td key={c.seq} title={`${tr(lang, "bTarget")}: ${c.target % 1 === 0 ? c.target : c.target.toFixed(1)}`} style={{ textAlign: "right", color: off ? "var(--warn)" : undefined, fontWeight: off ? 700 : undefined }}>{c.n}</td>;
                            })}
                            <td style={{ textAlign: "right", color: "var(--muted, #7a7868)" }}>{g.total}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Per-axis marginals (multi-axis) */}
                  {balance.axisViews.length > 0 && (
                    <div style={{ marginTop: "1rem" }}>
                      <div style={{ fontSize: ".68rem", color: "var(--muted, #7a7868)", marginBottom: ".35rem", fontFamily: "var(--font-jetbrains-mono)" }}>{tr(lang, "byAxis")}</div>
                      <div style={{ display: "flex", gap: "2rem", flexWrap: "wrap" }}>
                        {balance.axisViews.map((av) => (
                          <table key={av.name} style={{ fontSize: ".72rem" }}>
                            <thead>
                              <tr>
                                <th style={{ textAlign: "left" }}>{av.name}</th>
                                {balance.labels.map((s) => <th key={s} style={{ textAlign: "right", fontFamily: "var(--font-jetbrains-mono)" }}>{unblindedView ? s.split("").map(roleInitial).join("") : s}</th>)}
                              </tr>
                            </thead>
                            <tbody>
                              {av.levels.map((lv) => (
                                <tr key={lv.label}>
                                  <td>{lv.label}</td>
                                  {lv.cells.map((c) => {
                                    const off = Math.abs(c.dev) >= 1e-9;
                                    return <td key={c.seq} style={{ textAlign: "right", color: off ? "var(--warn)" : undefined, fontWeight: off ? 700 : undefined }}>{c.n}</td>;
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Per-period treatment distribution (crossover) */}
                  {method === "crossover" && (
                    <div style={{ marginTop: "1rem" }}>
                      <div style={{ fontSize: ".68rem", color: "var(--muted, #7a7868)", marginBottom: ".35rem", fontFamily: "var(--font-jetbrains-mono)" }}>{tr(lang, "bPerPeriod")}</div>
                      <table style={{ fontSize: ".75rem" }}>
                        <thead>
                          <tr>
                            <th style={{ textAlign: "left" }}>{tr(lang, "period")}</th>
                            {groups.map((g) => <th key={g} style={{ textAlign: "right" }}>{unblindedView ? roleInitial(g) : g}</th>)}
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

                  {result.reserveRows.length > 0 && balance.reserve && (
                    <p style={{ margin: ".75rem 0 0", fontSize: ".7rem", color: "var(--muted, #7a7868)", fontFamily: "var(--font-jetbrains-mono)" }}>
                      {tr(lang, "bReserve")}: {balance.reserve.cells.map((c) => `${unblindedView ? c.seq.split("").map(roleInitial).join("") : c.seq}=${c.n}`).join(", ")}
                    </p>
                  )}

                  {result.varianceBalanced && method === "crossover" && (
                    <p style={{ margin: ".5rem 0 0", color: "#5a7a3a", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".68rem" }}>✓ {tr(lang, "varianceBalanced")}</p>
                  )}

                  {/* Imbalance flags + acknowledge-before-finalize */}
                  {imbalance && (
                    <div style={{ marginTop: ".9rem", paddingTop: ".75rem", borderTop: "1px solid var(--warn)" }}>
                      {balance.flags.map((f, i) => (
                        <div key={i} style={{ fontSize: ".72rem", color: "var(--warn)", fontFamily: "var(--font-jetbrains-mono)" }}>⚠ {f}</div>
                      ))}
                      <label style={{ display: "flex", alignItems: "center", gap: ".5rem", marginTop: ".6rem", cursor: "pointer", fontFamily: "var(--font-inter, system-ui)", fontSize: ".8rem" }}>
                        <input type="checkbox" checked={ackImbalance} onChange={(e) => { setAckImbalance(e.target.checked); if (e.target.checked) setExportGate(false); }} />
                        {tr(lang, "ackImbalanceLabel")}
                      </label>
                      {exportGate && !ackImbalance && (
                        <div style={{ marginTop: ".5rem", fontSize: ".72rem", color: "var(--warn)", fontWeight: 700, fontFamily: "var(--font-jetbrains-mono)" }}>⚠ {tr(lang, "exportGateMsg")}</div>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Export (finalize) */}
              <div style={{ marginTop: "1.5rem" }}>
                <div style={{ fontFamily: "var(--font-jetbrains-mono)", textTransform: "uppercase", letterSpacing: ".05em", fontSize: ".64rem", color: "var(--muted, #7a7868)", marginBottom: ".5rem" }}>{tr(lang, "exportTitle")}</div>
                <div className="btn-row" style={{ flexWrap: "wrap" }}>
                  <button className="btn ghost" onClick={exportPDF}>{tr(lang, "exportPdf")}</button>
                  <button className="btn ghost" onClick={exportCSV}>{tr(lang, "exportCsv")}</button>
                  <button className="btn ghost" onClick={exportXLSX}>{tr(lang, "exportXlsx")}</button>
                </div>
              </div>

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
                <div style={{ marginTop: ".75rem", paddingTop: ".6rem", borderTop: "1px solid var(--rule, #e8e4d8)" }}>
                  <div style={{ fontFamily: "var(--font-jetbrains-mono)", textTransform: "uppercase", letterSpacing: ".05em", fontSize: ".64rem", color: "var(--muted, #7a7868)", marginBottom: ".3rem" }}>🔒 {tr(lang, "integrityTitle")}</div>
                  <p style={{ margin: 0, fontSize: ".72rem", lineHeight: 1.55, color: "var(--ink, #2a2722)" }}>{tr(lang, "integrityStatement")}</p>
                </div>
                {/* Portable verification spec code — paste on the /verify page to reproduce this schedule. */}
                <div style={{ marginTop: ".75rem", paddingTop: ".6rem", borderTop: "1px solid var(--rule, #e8e4d8)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: ".5rem", flexWrap: "wrap", marginBottom: ".35rem" }}>
                    <div style={{ fontFamily: "var(--font-jetbrains-mono)", textTransform: "uppercase", letterSpacing: ".05em", fontSize: ".64rem", color: "var(--muted, #7a7868)" }}>{tr(lang, "specTitle")}</div>
                    <div className="btn-row" style={{ gap: ".4rem" }}>
                      <button className="btn ghost" onClick={copySpec}>{specCopied ? tr(lang, "specCopied") : tr(lang, "specCopy")}</button>
                      <a className="btn ghost" href="/tools/randomization/verify" target="_blank" rel="noopener noreferrer">{tr(lang, "specOpenVerify")}</a>
                    </div>
                  </div>
                  <code style={{ display: "block", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".62rem", lineHeight: 1.5, wordBreak: "break-all", background: "var(--paper, #faf9f5)", border: "1px solid var(--rule, #e8e4d8)", borderRadius: "4px", padding: ".5rem .6rem", maxHeight: "5.5rem", overflow: "auto" }}>{buildSpecToken()}</code>
                  <p style={{ margin: ".4rem 0 0", color: "var(--muted, #7a7868)", fontSize: ".66rem", lineHeight: 1.5 }}>{tr(lang, "specHint")}</p>
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Run history (client-side versioning, localStorage only) */}
      {runs.length > 0 && (
        <div className="panel" style={{ marginTop: "2rem" }}>
          <div className="panel-head">
            <h2>{tr(lang, "historyTitle")}</h2>
            <span className="tag">{tr(lang, "historyTag")}</span>
          </div>
          <div className="panel-body">
            <p style={{ margin: "0 0 1rem", fontSize: ".72rem", color: "var(--muted, #7a7868)", fontFamily: "var(--font-jetbrains-mono)", lineHeight: 1.55 }}>
              🔒 {tr(lang, "historyPrivacy")}
            </p>
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", fontSize: ".74rem" }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: "left" }}>{tr(lang, "histWhen")}</th>
                    <th style={{ textAlign: "left" }}>{tr(lang, "histStudy")}</th>
                    <th style={{ textAlign: "left" }}>{tr(lang, "histSummary")}</th>
                    <th style={{ textAlign: "left" }}>{tr(lang, "mVerification")}</th>
                    <th style={{ textAlign: "center" }}>{tr(lang, "histFinal")}</th>
                    <th style={{ textAlign: "right" }}></th>
                  </tr>
                </thead>
                <tbody>
                  {runs.map((r) => (
                    <tr key={r.id} style={r.final ? { background: "rgba(90,122,58,0.07)" } : undefined}>
                      <td style={{ whiteSpace: "nowrap" }}>{new Date(r.savedAt).toLocaleString(lang === "tr" ? "tr-TR" : "en-GB")}</td>
                      <td>{r.studyCode || "—"}</td>
                      <td style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: ".7rem" }}>{r.summary}</td>
                      <td><code style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: ".72rem" }}>{r.code}</code></td>
                      <td style={{ textAlign: "center" }}>
                        <button
                          onClick={() => toggleFinal(r.id)}
                          title={tr(lang, "histMarkFinal")}
                          aria-label={tr(lang, "histMarkFinal")}
                          style={{ background: "none", border: "none", cursor: "pointer", fontSize: "1rem", color: r.final ? "#5a7a3a" : "var(--muted, #7a7868)", padding: 0 }}
                        >
                          {r.final ? "★" : "☆"}
                        </button>
                      </td>
                      <td style={{ textAlign: "right", whiteSpace: "nowrap" }}>
                        <button
                          onClick={() => restoreRun(r)}
                          style={{ background: "none", border: "none", color: "var(--accent-2-ink, #b8432a)", textDecoration: "underline", cursor: "pointer", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".72rem", padding: 0, marginRight: ".75rem" }}
                        >
                          {tr(lang, "histRestore")}
                        </button>
                        <button
                          onClick={() => deleteRun(r.id)}
                          title={tr(lang, "histDelete")}
                          aria-label={tr(lang, "histDelete")}
                          style={{ background: "none", border: "none", color: "var(--muted, #7a7868)", cursor: "pointer", fontSize: ".8rem", padding: 0 }}
                        >
                          ✕
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div style={{ marginTop: "1rem" }}>
              <button className="btn ghost" onClick={clearHistory}>{tr(lang, "histClear")}</button>
            </div>
          </div>
        </div>
      )}

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
