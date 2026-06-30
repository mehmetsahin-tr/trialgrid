// Explicit crossover design registry. Each design declares exactly which
// treatments and periods it requires and builds its sequence templates from the
// user's drug labels. drugs[0] is treated as Test (T), drugs[1] as Reference (R)
// for the BE designs; A/B/C/D map to drugs[0..3] for Williams/Latin.

export type DesignId =
  | "2x2x2"
  | "williams"
  | "latin"
  | "partial-replicate"
  | "full-replicate-2seq"
  | "full-replicate-4seq";

export interface BilingualText {
  en: string;
  tr: string;
}

export interface DesignDescriptor {
  id: DesignId;
  label: BilingualText;
  /** Short note shown under the selector. */
  note: BilingualText;
  /** Exact number of treatments required, or null when variable (Latin). */
  treatments: number | null;
  /** Minimum treatments when `treatments` is null. */
  minTreatments?: number;
  /** Number of periods this design produces, or null when derived from treatments. */
  periods: number | null;
  /** True when the design guarantees first-order carryover (variance) balance. */
  varianceBalanced: boolean;
  /**
   * Build the sequence templates from drug labels. Returns one array per
   * sequence, each of length = number of periods. Throws on wrong drug count.
   */
  build: (drugs: string[]) => string[][];
}

function williams(drugs: string[]): string[][] {
  const k = drugs.length;
  if (k === 3) {
    const [A, B, C] = drugs;
    // Williams design for 3 treatments = two Latin squares (6 sequences).
    // Every treatment appears once per period and each ordered pair is adjacent
    // an equal number of times -> first-order carryover balanced.
    return [
      [A, B, C],
      [B, C, A],
      [C, A, B],
      [A, C, B],
      [C, B, A],
      [B, A, C],
    ];
  }
  if (k === 4) {
    const [A, B, C, D] = drugs;
    // Canonical Williams square for 4 treatments (single square, 4 sequences).
    return [
      [A, B, C, D],
      [B, D, A, C],
      [C, A, D, B],
      [D, C, B, A],
    ];
  }
  throw new Error("williams-treatments");
}

/** Cyclic Latin square: n sequences, each a rotation of the treatment list. */
function latin(drugs: string[]): string[][] {
  const k = drugs.length;
  return Array.from({ length: k }, (_, i) =>
    Array.from({ length: k }, (_, j) => drugs[(i + j) % k])
  );
}

export const DESIGNS: Record<DesignId, DesignDescriptor> = {
  "2x2x2": {
    id: "2x2x2",
    label: { en: "2×2×2 (standard BE)", tr: "2×2×2 (standart BE)" },
    note: {
      en: "2 treatments, 2 periods, 2 sequences (TR / RT).",
      tr: "2 tedavi, 2 dönem, 2 sekans (TR / RT).",
    },
    treatments: 2,
    periods: 2,
    varianceBalanced: true,
    build: (d) => {
      if (d.length !== 2) throw new Error("treatments-2");
      const [T, R] = d;
      return [
        [T, R],
        [R, T],
      ];
    },
  },
  williams: {
    id: "williams",
    label: { en: "Williams (3 or 4 treatments)", tr: "Williams (3 veya 4 tedavi)" },
    note: {
      en: "Variance-balanced. 3 treatments → 6 sequences, 4 → 4 sequences.",
      tr: "Varyans-dengeli. 3 tedavi → 6 sekans, 4 → 4 sekans.",
    },
    treatments: null,
    minTreatments: 3,
    periods: null,
    varianceBalanced: true,
    build: (d) => {
      if (d.length !== 3 && d.length !== 4) throw new Error("williams-treatments");
      return williams(d);
    },
  },
  latin: {
    id: "latin",
    label: { en: "Latin square", tr: "Latin kare" },
    note: {
      en: "n treatments → n periods, n sequences (cyclic). Not variance-balanced.",
      tr: "n tedavi → n dönem, n sekans (döngüsel). Varyans-dengeli değildir.",
    },
    treatments: null,
    minTreatments: 2,
    periods: null,
    varianceBalanced: false,
    build: (d) => {
      if (d.length < 2) throw new Error("latin-treatments");
      return latin(d);
    },
  },
  "partial-replicate": {
    id: "partial-replicate",
    label: { en: "Partial replicate (3-period)", tr: "Partial replicate (3-dönem)" },
    note: {
      en: "2 treatments, 3 periods, 3 sequences (TRR / RTR / RRT). For HVD / RSABE.",
      tr: "2 tedavi, 3 dönem, 3 sekans (TRR / RTR / RRT). HVD / RSABE için.",
    },
    treatments: 2,
    periods: 3,
    varianceBalanced: true,
    build: (d) => {
      if (d.length !== 2) throw new Error("treatments-2");
      const [T, R] = d;
      return [
        [T, R, R],
        [R, T, R],
        [R, R, T],
      ];
    },
  },
  "full-replicate-2seq": {
    id: "full-replicate-2seq",
    label: { en: "Full replicate (4-period, 2-sequence)", tr: "Full replicate (4-dönem, 2-sekans)" },
    note: {
      en: "2 treatments, 4 periods, 2 sequences (TRTR / RTRT). For HVD / RSABE.",
      tr: "2 tedavi, 4 dönem, 2 sekans (TRTR / RTRT). HVD / RSABE için.",
    },
    treatments: 2,
    periods: 4,
    varianceBalanced: true,
    build: (d) => {
      if (d.length !== 2) throw new Error("treatments-2");
      const [T, R] = d;
      return [
        [T, R, T, R],
        [R, T, R, T],
      ];
    },
  },
  "full-replicate-4seq": {
    id: "full-replicate-4seq",
    label: { en: "Full replicate (4-period, 4-sequence)", tr: "Full replicate (4-dönem, 4-sekans)" },
    note: {
      en: "2 treatments, 4 periods, 4 sequences (TRTR / RTRT / TRRT / RTTR).",
      tr: "2 tedavi, 4 dönem, 4 sekans (TRTR / RTRT / TRRT / RTTR).",
    },
    treatments: 2,
    periods: 4,
    varianceBalanced: true,
    build: (d) => {
      if (d.length !== 2) throw new Error("treatments-2");
      const [T, R] = d;
      return [
        [T, R, T, R],
        [R, T, R, T],
        [T, R, R, T],
        [R, T, T, R],
      ];
    },
  },
};

export const DESIGN_ORDER: DesignId[] = [
  "2x2x2",
  "williams",
  "latin",
  "partial-replicate",
  "full-replicate-2seq",
  "full-replicate-4seq",
];

/** Number of periods a design produces for a given drug count. */
export function designPeriods(d: DesignDescriptor, drugCount: number): number {
  return d.periods ?? drugCount;
}
