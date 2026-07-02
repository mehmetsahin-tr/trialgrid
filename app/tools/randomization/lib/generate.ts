import { mulberry32, shuffle } from "./rng.ts";
import { DESIGNS, designPeriods } from "./designs.ts";
import type { DesignId } from "./designs.ts";

export type Method = "parallel" | "crossover";

export interface GenRow {
  /** Formatted randomization number (e.g. "IST-001" or "R01" for reserves). */
  subjectId: string;
  /** Optional separate enrollment/screening number. */
  enrollNo?: string;
  /** Optional stratum name (when stratified randomization is used). */
  stratum?: string;
  /** Sequence/group label, e.g. "TR" for crossover or the drug name for parallel. */
  sequenceLabel: string;
  treatments: string[];
  isReserve: boolean;
}

export interface BilingualError {
  en: string;
  tr: string;
  /** Nearest balanced volunteer count, when the error is a divisibility problem. */
  suggestion?: number;
  /** Valid block sizes for the given N, when the block size leaves an unbalanced tail. */
  validBlocks?: number[];
  /** Name of the offending stratum, when the error is stratum-scoped. Lets the UI
   *  apply the suggested size to that stratum's entry instead of total N. */
  stratum?: string;
}

/** Block sizes offered in the UI. */
export const BLOCK_OPTIONS = [2, 4, 6, 8, 12];

export interface Stratum {
  name: string;
  n: number;
}

/** A single stratification factor with its levels, e.g. { name: "Site", levels: ["A","B","C"] }. */
export interface StratAxis {
  name: string;
  levels: string[];
}

export interface StratPlan {
  /** Flat strata handed to the engine. In multi-axis mode these are the cross-product cells. */
  strata: Stratum[];
  /** Factor axes when multi-axis; empty for legacy single-axis input. */
  axes: StratAxis[];
  /** Subjects per cross-product cell in multi-axis mode; 0 for legacy. */
  perCell: number;
  multiAxis: boolean;
}

/** Separator used to join cross-product level labels into a stratum name (e.g. "A · M"). */
export const STRATUM_SEP = " · ";
const RESERVED_COUNT_KEYS = ["n", "count", "per"];

/**
 * Parse the stratification input. Two modes, discriminated by the "|" pipe:
 *
 *  - Legacy single-axis (no pipe): comma-separated `name:n` pairs with an
 *    explicit count each, e.g. `Male:12, Female:12`.
 *  - Multi-axis factorial (has pipe): segments separated by `|`. Each factor is
 *    `Name: level1, level2`; one reserved `n:` (or `count:`/`per:`) segment sets
 *    the equal per-cell subject count, e.g. `Site: A, B, C | Sex: M, F | n: 8`.
 *    The cross-product of all axis levels becomes the strata, each of size n.
 *
 * Returns a plan, or a bilingual error for malformed multi-axis input.
 */
export function parseStratification(raw: string): StratPlan | { error: BilingualError } {
  const text = (raw ?? "").trim();
  if (!text) return { strata: [], axes: [], perCell: 0, multiAxis: false };

  if (!text.includes("|")) {
    const strata = text
      .split(",")
      .map((tok) => {
        const [name, cnt] = tok.split(":");
        return { name: (name ?? "").trim(), n: parseInt((cnt ?? "").trim(), 10) || 0 };
      })
      .filter((s) => s.name && s.n > 0);
    return { strata, axes: [], perCell: 0, multiAxis: false };
  }

  const segments = text.split("|").map((s) => s.trim()).filter(Boolean);
  const axes: StratAxis[] = [];
  let perCell = 0;
  const seenAxis = new Set<string>();
  for (const seg of segments) {
    const ci = seg.indexOf(":");
    if (ci < 0)
      return { error: {
        en: `Stratification segment "${seg}" must be "Name: level1, level2" or "n: count".`,
        tr: `Tabakalandırma bölümü "${seg}" biçimi "Ad: seviye1, seviye2" veya "n: sayı" olmalı.`,
      } };
    const name = seg.slice(0, ci).trim();
    const rest = seg.slice(ci + 1).trim();
    if (RESERVED_COUNT_KEYS.includes(name.toLowerCase())) {
      const num = parseInt(rest, 10);
      if (!num || num < 1)
        return { error: {
          en: `Per-stratum count "${rest}" must be a positive integer.`,
          tr: `Tabaka başına sayı "${rest}" pozitif bir tam sayı olmalı.`,
        } };
      perCell = num;
      continue;
    }
    const levels = rest.split(",").map((l) => l.trim()).filter(Boolean);
    if (!levels.length)
      return { error: {
        en: `Axis "${name}" needs at least one level, e.g. "${name}: A, B".`,
        tr: `"${name}" ekseni en az bir seviye gerektirir, örn. "${name}: A, B".`,
      } };
    if (seenAxis.has(name.toLowerCase()))
      return { error: {
        en: `Duplicate stratification axis "${name}".`,
        tr: `Tekrarlanan tabakalandırma ekseni "${name}".`,
      } };
    seenAxis.add(name.toLowerCase());
    axes.push({ name, levels });
  }

  if (!axes.length)
    return { error: {
      en: `Multi-axis stratification needs at least one factor axis, e.g. "Site: A, B | n: 8".`,
      tr: `Çok-eksenli tabakalandırma en az bir faktör ekseni gerektirir, örn. "Site: A, B | n: 8".`,
    } };
  if (perCell < 1)
    return { error: {
      en: `Multi-axis stratification needs a per-stratum count — add "| n: 8".`,
      tr: `Çok-eksenli tabakalandırma tabaka başına sayı gerektirir — "| n: 8" ekleyin.`,
    } };

  // Cartesian product of axis levels, in axis order → one stratum per cell.
  let combos: string[][] = [[]];
  for (const axis of axes) {
    const next: string[][] = [];
    for (const combo of combos) for (const lvl of axis.levels) next.push([...combo, lvl]);
    combos = next;
  }
  const strata: Stratum[] = combos.map((c) => ({ name: c.join(STRATUM_SEP), n: perCell }));
  return { strata, axes, perCell, multiAxis: true };
}

/**
 * Rewrite the stratification input so the flagged stratum takes the suggested
 * per-cell size, preserving factor labels and spacing. Mirrors the two input
 * modes of parseStratification:
 *  - Multi-axis ("Site: A, B, C | n: 7") → rewrite the shared count segment.
 *  - Single-axis ("Male: 7, Female: 12") → rewrite only the named stratum.
 * Returns the input unchanged if nothing matched.
 */
export function applyStratumSuggestion(raw: string, stratum: string, suggestion: number): string {
  if (raw.includes("|")) {
    return raw
      .split("|")
      .map((seg) => {
        const ci = seg.indexOf(":");
        if (ci < 0) return seg;
        const key = seg.slice(0, ci).trim().toLowerCase();
        return RESERVED_COUNT_KEYS.includes(key) ? `${seg.slice(0, ci)}: ${suggestion}` : seg;
      })
      .join("|");
  }
  return raw
    .split(",")
    .map((tok) => {
      const ci = tok.indexOf(":");
      if (ci < 0) return tok;
      return tok.slice(0, ci).trim() === stratum ? `${tok.slice(0, ci)}: ${suggestion}` : tok;
    })
    .join(",");
}

export interface NumberScheme {
  randPrefix?: string;
  randStart?: number;
  randPad?: number;
  enrollEnabled?: boolean;
  enrollPrefix?: string;
  enrollStart?: number;
  enrollPad?: number;
  reservePrefix?: string;
  reservePad?: number;
}

export interface GenParams extends NumberScheme {
  method: Method;
  drugs: string[];
  n: number;
  blockSize: number;
  seed: number;
  designId?: DesignId; // crossover only
  allocationRatio?: string; // parallel only, e.g. "1:1"
  reserve?: number; // standby subjects
  strata?: Stratum[]; // stratified randomization
}

export interface GenSuccess {
  ok: true;
  rows: GenRow[];
  reserveRows: GenRow[];
  /** Sequence templates actually used. */
  sequences: string[][];
  sequenceLabels: string[];
  periods: number;
  varianceBalanced: boolean;
  strata: string[];
}

export type GenResult = GenSuccess | { ok: false; error: BilingualError };

export function parseAllocationRatio(input: string, numGroups: number): number[] | null {
  const parts = input.split(":").map((s) => s.trim()).filter(Boolean);
  if (parts.length !== numGroups) return null;
  const nums = parts.map((p) => parseInt(p, 10));
  if (nums.some((v) => isNaN(v) || v < 1)) return null;
  return nums;
}

function formatNo(prefix: string, value: number, pad: number): string {
  return `${prefix}${String(value).padStart(pad, "0")}`;
}

/** Build n assignments from weighted items using shuffled balanced blocks. */
function blockedAllocation<T>(items: T[], weights: number[], n: number, blockSize: number, r: () => number): T[] {
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  const perBlock = weights.map((w) => (blockSize * w) / sumWeights);
  const numBlocks = Math.ceil(n / blockSize);
  const result: T[] = [];
  for (let b = 0; b < numBlocks; b++) {
    const block: T[] = [];
    for (let i = 0; i < items.length; i++) {
      for (let k = 0; k < perBlock[i]; k++) block.push(items[i]);
    }
    shuffle(block, r);
    result.push(...block);
  }
  return result.slice(0, n);
}

/** Nearest multiple of `unit` that is >= unit. */
function nearestBalanced(n: number, unit: number): number {
  return Math.max(unit, Math.round(n / unit) * unit);
}

function err(en: string, tr: string, suggestion?: number): GenResult {
  return { ok: false, error: { en, tr, suggestion } };
}

export function generateSchedule(p: GenParams): GenResult {
  const { method, drugs, n, blockSize, seed } = p;
  const r = mulberry32(seed);

  const randPrefix = p.randPrefix ?? "";
  const randStart = p.randStart ?? 1;
  const randPad = p.randPad ?? 3;
  const reserveCount = Math.max(0, p.reserve ?? 0);
  const reservePrefix = p.reservePrefix ?? "R";
  const reservePad = p.reservePad ?? 2;

  const makeRow = (treatments: string[], i: number, isReserve: boolean, stratum?: string): GenRow => {
    const subjectId = isReserve
      ? formatNo(reservePrefix, i + 1, reservePad)
      : formatNo(randPrefix, randStart + i, randPad);
    const row: GenRow = { subjectId, sequenceLabel: treatments.join(""), treatments, isReserve };
    if (stratum) row.stratum = stratum;
    if (!isReserve && p.enrollEnabled) {
      row.enrollNo = formatNo(p.enrollPrefix ?? "", (p.enrollStart ?? 1) + i, p.enrollPad ?? 3);
    }
    return row;
  };

  if (!blockSize) return err("Please select a block size.", "Lütfen bir blok boyutu seçin.");
  if (drugs.length < 1) return err("Enter at least one drug.", "En az bir ilaç girin.");

  // Resolve allocation items, weights, sequences and the balancing unit.
  let items: string[][];
  let weights: number[];
  let sequences: string[][];
  let periods: number;
  let varianceBalanced: boolean;

  if (method === "parallel") {
    const w = parseAllocationRatio(p.allocationRatio ?? "", drugs.length);
    if (!w) {
      const example = Array(drugs.length).fill("1").join(":");
      return err(
        `Allocation ratio must have ${drugs.length} component(s) matching drug count, e.g. "${example}".`,
        `Tahsis oranı ilaç sayısıyla eşleşen ${drugs.length} bileşen içermeli, örn. "${example}".`
      );
    }
    items = drugs.map((d) => [d]);
    weights = w;
    sequences = drugs.map((d) => [d]);
    periods = 1;
    varianceBalanced = true;
  } else {
    const designId = p.designId;
    if (!designId) return err("Please select a crossover design.", "Lütfen bir çapraz tasarım seçin.");
    const design = DESIGNS[designId];

    if (design.treatments != null && drugs.length !== design.treatments)
      return err(
        `${design.label.en} requires exactly ${design.treatments} treatments; you entered ${drugs.length}.`,
        `${design.label.tr} tam olarak ${design.treatments} tedavi gerektirir; ${drugs.length} girdiniz.`
      );
    if (design.treatments == null && design.minTreatments && drugs.length < design.minTreatments)
      return err(
        `${design.label.en} requires at least ${design.minTreatments} treatments.`,
        `${design.label.tr} en az ${design.minTreatments} tedavi gerektirir.`
      );

    try {
      sequences = design.build(drugs);
    } catch {
      return err(
        `${design.label.en} does not accept ${drugs.length} treatments.`,
        `${design.label.tr} ${drugs.length} tedaviyi kabul etmiyor.`
      );
    }
    items = sequences;
    weights = Array(sequences.length).fill(1) as number[];
    periods = designPeriods(design, drugs.length);
    varianceBalanced = design.varianceBalanced;
  }

  const unit = weights.reduce((a, b) => a + b, 0); // sumWeights (parallel) or seqCount (crossover)
  const unitNoun = { en: method === "parallel" ? "allocation ratio sum" : "sequence count", tr: method === "parallel" ? "tahsis oranı toplamı" : "sekans sayısı" };

  if (blockSize % unit !== 0)
    return err(
      `Block size (${blockSize}) must be a multiple of the ${unitNoun.en} (${unit}).`,
      `Blok boyutu (${blockSize}), ${unitNoun.tr} (${unit}) katı olmalı.`
    );

  // Validate a single subject count against balance + block-size rules.
  const checkCount = (count: number, label: { en: string; tr: string }): GenResult | null => {
    if (count % unit !== 0)
      return err(
        `${label.en} (${count}) must be divisible by the ${unitNoun.en} (${unit}) for a balanced design.`,
        `Dengeli tasarım için ${label.tr} (${count}), ${unitNoun.tr} (${unit}) bölünebilmeli.`,
        nearestBalanced(count, unit)
      );
    if (count < blockSize)
      return err(
        `${label.en} (${count}) must be at least the block size (${blockSize}).`,
        `${label.tr} (${count}), blok boyutundan (${blockSize}) küçük olamaz.`
      );
    if (count % blockSize !== 0) {
      // The final block would be truncated, breaking sequence balance.
      const validBlocks = BLOCK_OPTIONS.filter((b) => count % b === 0 && b % unit === 0 && b <= count);
      const list = validBlocks.join(", ");
      return {
        ok: false,
        error: {
          en: `${label.en} (${count}) must be divisible by the block size (${blockSize}) for balanced sequences. Valid block sizes for ${count}: ${list}.`,
          tr: `Dengeli sekanslar için ${label.tr} (${count}), blok boyutuna (${blockSize}) bölünebilmeli. ${count} için geçerli blok boyutları: ${list}.`,
          validBlocks,
        },
      };
    }
    return null;
  };

  const strata = (p.strata ?? []).filter((s) => s.name && s.n > 0);
  const rows: GenRow[] = [];

  if (strata.length) {
    for (const s of strata) {
      const e = checkCount(s.n, { en: `Stratum "${s.name}" size`, tr: `"${s.name}" tabakası büyüklüğü` });
      if (e) {
        if (!e.ok) e.error.stratum = s.name; // tag which stratum for the quick-fix button
        return e;
      }
    }
    let idx = 0;
    for (const s of strata) {
      const assign = blockedAllocation(items, weights, s.n, blockSize, r);
      for (let k = 0; k < assign.length; k++) rows.push(makeRow(assign[k], idx + k, false, s.name));
      idx += s.n;
    }
  } else {
    const e = checkCount(n, { en: "Total volunteers", tr: "Toplam gönüllü" });
    if (e) return e;
    const assign = blockedAllocation(items, weights, n, blockSize, r);
    for (let i = 0; i < assign.length; i++) rows.push(makeRow(assign[i], i, false));
  }

  // Reserve subjects — continue the same RNG stream; balanced at the smallest unit.
  let reserveRows: GenRow[] = [];
  if (reserveCount > 0) {
    const resAssign = blockedAllocation(items, weights, reserveCount, unit, r);
    reserveRows = resAssign.map((seq, i) => makeRow(seq, i, true));
  }

  return {
    ok: true,
    rows,
    reserveRows,
    sequences,
    sequenceLabels: sequences.map((s) => s.join("")),
    periods,
    varianceBalanced,
    strata: strata.map((s) => s.name),
  };
}
