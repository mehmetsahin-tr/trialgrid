import { mulberry32, shuffle } from "./rng.ts";
import { DESIGNS, designPeriods } from "./designs.ts";
import type { DesignId } from "./designs.ts";

export type Method = "parallel" | "crossover";

export interface GenRow {
  /** Formatted randomization number (e.g. "IST-001" or "R01" for reserves). */
  subjectId: string;
  /** Optional separate enrollment/screening number. */
  enrollNo?: string;
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
function blockedAllocation<T>(
  items: T[],
  weights: number[],
  n: number,
  blockSize: number,
  r: () => number
): T[] {
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
  const rounded = Math.round(n / unit) * unit;
  return Math.max(unit, rounded);
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

  const makeRow = (
    assignedTreatments: string[],
    seqLabel: string,
    i: number,
    isReserve: boolean
  ): GenRow => {
    const subjectId = isReserve
      ? formatNo(reservePrefix, i + 1, reservePad)
      : formatNo(randPrefix, randStart + i, randPad);
    const row: GenRow = {
      subjectId,
      sequenceLabel: seqLabel,
      treatments: assignedTreatments,
      isReserve,
    };
    if (!isReserve && p.enrollEnabled) {
      row.enrollNo = formatNo(p.enrollPrefix ?? "", (p.enrollStart ?? 1) + i, p.enrollPad ?? 3);
    }
    return row;
  };

  if (!blockSize) return err("Please select a block size.", "Lütfen bir blok boyutu seçin.");
  if (drugs.length < 1) return err("Enter at least one drug.", "En az bir ilaç girin.");

  // resolve items + weights + sequence labels for both methods
  let items: string[][]; // each item is the per-period treatment list (parallel: single)
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
    const sum = w.reduce((a, b) => a + b, 0);
    if (blockSize % sum !== 0)
      return err(
        `Block size (${blockSize}) must be a multiple of the allocation ratio sum (${sum}).`,
        `Blok boyutu (${blockSize}), tahsis oranı toplamının (${sum}) katı olmalı.`
      );
    if (n % sum !== 0)
      return err(
        `Total volunteers (${n}) must be divisible by the allocation ratio sum (${sum}).`,
        `Toplam gönüllü (${n}), tahsis oranı toplamına (${sum}) bölünebilmeli.`,
        nearestBalanced(n, sum)
      );
    if (n < blockSize)
      return err(
        `Total volunteers (${n}) must be at least the block size (${blockSize}).`,
        `Toplam gönüllü (${n}), blok boyutundan (${blockSize}) küçük olamaz.`
      );

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

    const seqCount = sequences.length;
    periods = designPeriods(design, drugs.length);
    if (blockSize % seqCount !== 0)
      return err(
        `Block size (${blockSize}) must be a multiple of the sequence count (${seqCount}).`,
        `Blok boyutu (${blockSize}), sekans sayısının (${seqCount}) katı olmalı.`
      );
    if (n % seqCount !== 0)
      return err(
        `Total volunteers (${n}) must be divisible by the sequence count (${seqCount}) for a balanced design.`,
        `Dengeli tasarım için toplam gönüllü (${n}), sekans sayısına (${seqCount}) bölünebilmeli.`,
        nearestBalanced(n, seqCount)
      );
    if (n < blockSize)
      return err(
        `Total volunteers (${n}) must be at least the block size (${blockSize}).`,
        `Toplam gönüllü (${n}), blok boyutundan (${blockSize}) küçük olamaz.`
      );

    items = sequences;
    weights = Array(seqCount).fill(1) as number[];
    varianceBalanced = design.varianceBalanced;
  }

  // main subjects
  const seqUnit = method === "parallel" ? weights.reduce((a, b) => a + b, 0) : sequences.length;
  const mainAssign = blockedAllocation(items, weights, n, blockSize, r);
  const rows = mainAssign.map((seq, i) => makeRow(seq, seq.join(""), i, false));

  // reserve subjects — continue the same RNG stream; balanced at the smallest
  // unit (one of each sequence per block) so even small reserve pools stay even.
  let reserveRows: GenRow[] = [];
  if (reserveCount > 0) {
    const resAssign = blockedAllocation(items, weights, reserveCount, seqUnit, r);
    reserveRows = resAssign.map((seq, i) => makeRow(seq, seq.join(""), i, true));
  }

  return {
    ok: true,
    rows,
    reserveRows,
    sequences,
    sequenceLabels: sequences.map((s) => s.join("")),
    periods,
    varianceBalanced,
  };
}
