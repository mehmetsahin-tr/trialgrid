import { mulberry32, shuffle } from "./rng.ts";
import { DESIGNS, designPeriods } from "./designs.ts";
import type { DesignId } from "./designs.ts";

export type Method = "parallel" | "crossover";

export interface GenRow {
  subjectId: string;
  /** Sequence/group label, e.g. "TR" for crossover or the drug name for parallel. */
  sequenceLabel: string;
  treatments: string[];
}

export interface BilingualError {
  en: string;
  tr: string;
  /** Nearest balanced volunteer count, when the error is a divisibility problem. */
  suggestion?: number;
}

export interface GenParams {
  method: Method;
  drugs: string[];
  n: number;
  blockSize: number;
  seed: number;
  designId?: DesignId; // crossover only
  allocationRatio?: string; // parallel only, e.g. "1:1"
}

export interface GenSuccess {
  ok: true;
  rows: GenRow[];
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

export function generateSchedule(p: GenParams): GenResult {
  const { method, drugs, n, blockSize, seed } = p;
  const r = mulberry32(seed);

  if (!blockSize) {
    return { ok: false, error: { en: "Please select a block size.", tr: "Lütfen bir blok boyutu seçin." } };
  }
  if (drugs.length < 1) {
    return { ok: false, error: { en: "Enter at least one drug.", tr: "En az bir ilaç girin." } };
  }

  if (method === "parallel") {
    const weights = parseAllocationRatio(p.allocationRatio ?? "", drugs.length);
    if (!weights) {
      const example = Array(drugs.length).fill("1").join(":");
      return {
        ok: false,
        error: {
          en: `Allocation ratio must have ${drugs.length} component(s) matching drug count, e.g. "${example}".`,
          tr: `Tahsis oranı ilaç sayısıyla eşleşen ${drugs.length} bileşen içermeli, örn. "${example}".`,
        },
      };
    }
    const sumWeights = weights.reduce((a, b) => a + b, 0);
    if (blockSize % sumWeights !== 0) {
      return {
        ok: false,
        error: {
          en: `Block size (${blockSize}) must be a multiple of the allocation ratio sum (${sumWeights}).`,
          tr: `Blok boyutu (${blockSize}), tahsis oranı toplamının (${sumWeights}) katı olmalı.`,
        },
      };
    }
    if (n % sumWeights !== 0) {
      return {
        ok: false,
        error: {
          en: `Total volunteers (${n}) must be divisible by the allocation ratio sum (${sumWeights}).`,
          tr: `Toplam gönüllü (${n}), tahsis oranı toplamına (${sumWeights}) bölünebilmeli.`,
          suggestion: nearestBalanced(n, sumWeights),
        },
      };
    }
    if (n < blockSize) {
      return {
        ok: false,
        error: {
          en: `Total volunteers (${n}) must be at least the block size (${blockSize}).`,
          tr: `Toplam gönüllü (${n}), blok boyutundan (${blockSize}) küçük olamaz.`,
        },
      };
    }

    const assignments = blockedAllocation(drugs, weights, n, blockSize, r);
    const rows: GenRow[] = assignments.map((drug, i) => ({
      subjectId: String(i + 1).padStart(3, "0"),
      sequenceLabel: drug,
      treatments: [drug],
    }));
    return {
      ok: true,
      rows,
      sequences: drugs.map((d) => [d]),
      sequenceLabels: [...drugs],
      periods: 1,
      varianceBalanced: true,
    };
  }

  // crossover
  const designId = p.designId;
  if (!designId) {
    return { ok: false, error: { en: "Please select a crossover design.", tr: "Lütfen bir çapraz tasarım seçin." } };
  }
  const design = DESIGNS[designId];

  // treatment-count check
  if (design.treatments != null && drugs.length !== design.treatments) {
    return {
      ok: false,
      error: {
        en: `${design.label.en} requires exactly ${design.treatments} treatments; you entered ${drugs.length}.`,
        tr: `${design.label.tr} tam olarak ${design.treatments} tedavi gerektirir; ${drugs.length} girdiniz.`,
      },
    };
  }
  if (design.treatments == null && design.minTreatments && drugs.length < design.minTreatments) {
    return {
      ok: false,
      error: {
        en: `${design.label.en} requires at least ${design.minTreatments} treatments.`,
        tr: `${design.label.tr} en az ${design.minTreatments} tedavi gerektirir.`,
      },
    };
  }

  let sequences: string[][];
  try {
    sequences = design.build(drugs);
  } catch {
    return {
      ok: false,
      error: {
        en: `${design.label.en} does not accept ${drugs.length} treatments.`,
        tr: `${design.label.tr} ${drugs.length} tedaviyi kabul etmiyor.`,
      },
    };
  }

  const seqCount = sequences.length;
  const periods = designPeriods(design, drugs.length);

  if (blockSize % seqCount !== 0) {
    return {
      ok: false,
      error: {
        en: `Block size (${blockSize}) must be a multiple of the sequence count (${seqCount}).`,
        tr: `Blok boyutu (${blockSize}), sekans sayısının (${seqCount}) katı olmalı.`,
      },
    };
  }
  if (n % seqCount !== 0) {
    return {
      ok: false,
      error: {
        en: `Total volunteers (${n}) must be divisible by the sequence count (${seqCount}) for a balanced design.`,
        tr: `Dengeli tasarım için toplam gönüllü (${n}), sekans sayısına (${seqCount}) bölünebilmeli.`,
        suggestion: nearestBalanced(n, seqCount),
      },
    };
  }
  if (n < blockSize) {
    return {
      ok: false,
      error: {
        en: `Total volunteers (${n}) must be at least the block size (${blockSize}).`,
        tr: `Toplam gönüllü (${n}), blok boyutundan (${blockSize}) küçük olamaz.`,
      },
    };
  }

  const weights = Array(seqCount).fill(1) as number[];
  const assigned = blockedAllocation(sequences, weights, n, blockSize, r);
  const rows: GenRow[] = assigned.map((seq, i) => ({
    subjectId: String(i + 1).padStart(3, "0"),
    sequenceLabel: seq.join(""),
    treatments: seq,
  }));

  return {
    ok: true,
    rows,
    sequences,
    sequenceLabels: sequences.map((s) => s.join("")),
    periods,
    varianceBalanced: design.varianceBalanced,
  };
}
