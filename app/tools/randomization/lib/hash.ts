import { RNG_ALGO, RNG_VERSION } from "./rng.ts";
import { TOOL_VERSION } from "./meta.ts";
import type { GenRow } from "./generate.ts";

// Tamper-evident verification: serialize the full schedule + parameters to a
// canonical string and SHA-256 it via the Web Crypto API. An independent auditor
// can reproduce the schedule from (seed + parameters + algorithm) and confirm an
// identical hash — proving the list was not altered.

export interface AuditMeta {
  studyCode: string;
  method: string;
  designId?: string;
  drugs: string[];
  n: number;
  blockSize: number;
  seed: number;
  allocation: string;
  /**
   * Operator who generated the schedule. Included in the canonical hash string
   * ONLY when non-empty, so the name itself becomes tamper-evident (changing it
   * changes the verification code) while pre-existing schedules generated
   * without an operator name keep their original code.
   */
  generatedBy?: string;
}

/**
 * Canonical, whitespace-stable representation of parameters + schedule.
 * Order is fixed so the same inputs always serialize identically across runs.
 */
export function canonicalString(meta: AuditMeta, rows: GenRow[]): string {
  const parts = [
    `tool=${TOOL_VERSION}`,
    `rng=${RNG_ALGO}@${RNG_VERSION}`,
    `study=${meta.studyCode}`,
    `method=${meta.method}`,
    `design=${meta.designId ?? "-"}`,
    `drugs=${meta.drugs.join(",")}`,
    `n=${meta.n}`,
    `block=${meta.blockSize}`,
    `seed=${meta.seed}`,
    `alloc=${meta.allocation}`,
  ];
  // Append the operator name only when present, so schedules generated without
  // one keep their original verification code (backwards-compatible).
  const generatedBy = (meta.generatedBy ?? "").trim();
  if (generatedBy) parts.push(`by=${generatedBy}`);
  const header = parts.join("|");
  const body = rows
    .map(
      (row) =>
        `${row.isReserve ? "R" : "M"}:${row.subjectId}:${row.enrollNo ?? ""}:${row.stratum ?? ""}:${row.sequenceLabel}:${row.treatments.join("")}`
    )
    .join("\n");
  return `${header}\n${body}\n`;
}

/** SHA-256 of a string as lowercase hex. Uses Web Crypto (browser + Node 24). */
export async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/** Short, human-checkable verification code: first 16 hex chars of the hash. */
export function verificationCode(hashHex: string): string {
  return hashHex.slice(0, 16).toUpperCase();
}
