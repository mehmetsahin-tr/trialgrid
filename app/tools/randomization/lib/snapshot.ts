// Shared, React-free types describing a fully reproducible randomization run.
// Extracted from page.tsx so the generator, the run-history, the reproduction
// engine (reproduce.ts) and the independent /verify page all speak the same shape.

import type { DesignId } from "./designs.ts";
import type { GenRow, Method, StratAxis } from "./generate.ts";
import type { AuditMeta } from "./hash.ts";

/** Test/Reference product identity for one treatment code (decode-sheet metadata). */
export interface TreatmentInfo {
  product: string;
  substance: string;
  strength: string;
  role: "" | "Test" | "Reference";
  batch: string;
}

/** Which identity the primary schedule reveals. */
export type OutputMode = "blinded" | "unblinded" | "both";

/**
 * Every input needed to reproduce and re-display a run, deterministically and
 * independently of React state. This is the unit that the run-history stores and
 * that the verification spec token carries.
 */
export interface RunSnapshot {
  method: Method;
  designId: DesignId | "";
  n: number;
  groupsRaw: string;
  seed: number;
  blockSize: number;
  allocationRaw: string;
  studyCode: string;
  sponsor: string;
  protocolVersion: string;
  protocolDate: string;
  generatedBy: string;
  checkedBy: string;
  reserveRaw: string;
  randPrefix: string;
  randStartRaw: string;
  randPad: number;
  enrollEnabled: boolean;
  enrollPrefix: string;
  enrollStartRaw: string;
  enrollPad: number;
  mapping: Record<string, TreatmentInfo>;
  outputMode: OutputMode;
  strataRaw: string;
}

/** The reproduced/displayed result of a run (schedule + audit metadata + code). */
export interface Generated {
  rows: GenRow[];
  reserveRows: GenRow[];
  sequences: string[][];
  sequenceLabels: string[];
  periods: number;
  varianceBalanced: boolean;
  strata: string[];
  axes: StratAxis[];
  meta: AuditMeta;
  generatedAt: string;
  hash: string;
  code: string;
}
