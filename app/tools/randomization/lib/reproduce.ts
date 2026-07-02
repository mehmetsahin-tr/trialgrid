// Single source of truth for reproducing a run from a RunSnapshot.
//
// Both the live generator (page.tsx) and the independent /verify page call this,
// so a schedule produced in the tool and one reproduced by an auditor go through
// the exact same code path — identical rows, identical SHA-256 verification code.
// Nothing here touches React or the DOM.

import { generateSchedule, parseStratification } from "./generate.ts";
import type { BilingualError } from "./generate.ts";
import { canonicalString, sha256Hex, verificationCode } from "./hash.ts";
import type { AuditMeta } from "./hash.ts";
import type { Generated, RunSnapshot } from "./snapshot.ts";

/** Everything a run yields except the wall-clock timestamp (which is not hashed). */
export type Reproduced = Omit<Generated, "generatedAt">;

export type ReproduceResult =
  | { ok: true; result: Reproduced }
  | { ok: false; error: BilingualError };

/**
 * Deterministically rebuild the schedule + audit metadata + verification code
 * from a snapshot. Pure and async only because SHA-256 uses Web Crypto.
 */
export async function reproduceRun(input: RunSnapshot): Promise<ReproduceResult> {
  const drugs = input.groupsRaw.split(",").map((s) => s.trim()).filter(Boolean);

  const stratPlan = parseStratification(input.strataRaw);
  if ("error" in stratPlan) return { ok: false, error: stratPlan.error };

  const res = generateSchedule({
    method: input.method,
    drugs,
    n: input.n,
    blockSize: input.blockSize,
    seed: input.seed,
    designId: input.method === "crossover" ? (input.designId || undefined) : undefined,
    allocationRatio: input.method === "parallel" ? input.allocationRaw : undefined,
    reserve: parseInt(input.reserveRaw, 10) || 0,
    strata: stratPlan.strata,
    randPrefix: input.randPrefix,
    randStart: parseInt(input.randStartRaw, 10) || 1,
    randPad: input.randPad,
    enrollEnabled: input.enrollEnabled,
    enrollPrefix: input.enrollPrefix,
    enrollStart: parseInt(input.enrollStartRaw, 10) || 1,
    enrollPad: input.enrollPad,
  });
  if (!res.ok) return { ok: false, error: res.error };

  const meta: AuditMeta = {
    studyCode: input.studyCode.trim(),
    method: input.method,
    designId: input.method === "crossover" ? input.designId || undefined : undefined,
    drugs: [...drugs],
    n: input.n,
    blockSize: input.blockSize,
    seed: input.seed,
    allocation: input.method === "parallel" ? input.allocationRaw : "balanced",
    generatedBy: input.generatedBy.trim(),
  };

  const allRows = [...res.rows, ...res.reserveRows];
  const hash = await sha256Hex(canonicalString(meta, allRows));
  const code = verificationCode(hash);

  return {
    ok: true,
    result: {
      rows: res.rows,
      reserveRows: res.reserveRows,
      sequences: res.sequences,
      sequenceLabels: res.sequenceLabels,
      periods: res.periods,
      varianceBalanced: res.varianceBalanced,
      strata: res.strata,
      axes: stratPlan.axes,
      meta,
      hash,
      code,
    },
  };
}
