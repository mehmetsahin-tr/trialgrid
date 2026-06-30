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
}

export interface Stratum {
  name: string;
  n: number;
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
    return null;
  };

  const strata = (p.strata ?? []).filter((s) => s.name && s.n > 0);
  const rows: GenRow[] = [];

  if (strata.length) {
    for (const s of strata) {
      const e = checkCount(s.n, { en: `Stratum "${s.name}" size`, tr: `"${s.name}" tabakası büyüklüğü` });
      if (e) return e;
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
