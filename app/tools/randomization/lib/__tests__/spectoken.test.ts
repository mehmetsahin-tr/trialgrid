// Tests for the verification spec token and the generate → token → verify loop.
// Run with: npm test  (Node 24 native TS + test runner, no extra deps)

import { test } from "node:test";
import assert from "node:assert/strict";

import { encodeSpec, decodeSpec, SpecTokenError } from "../spectoken.ts";
import type { SpecPayload } from "../spectoken.ts";
import { reproduceRun } from "../reproduce.ts";
import type { RunSnapshot } from "../snapshot.ts";
import { RNG_ALGO, RNG_VERSION } from "../rng.ts";
import { TOOL_VERSION } from "../meta.ts";

// A minimal but complete snapshot: the NOV2024/02159 2×2 BE case (N=40, block 4).
function sampleSnapshot(overrides: Partial<RunSnapshot> = {}): RunSnapshot {
  return {
    method: "crossover",
    designId: "2x2x2",
    n: 40,
    groupsRaw: "A, B",
    seed: 12345,
    blockSize: 4,
    allocationRaw: "1:1",
    studyCode: "NOV2024/02159",
    sponsor: "Example CRO",
    protocolVersion: "v1.0",
    protocolDate: "2026-01-15",
    generatedBy: "M. Şahin, Study Coordinator",
    checkedBy: "",
    reserveRaw: "0",
    randPrefix: "IST-",
    randStartRaw: "1",
    randPad: 3,
    enrollEnabled: false,
    enrollPrefix: "",
    enrollStartRaw: "1",
    enrollPad: 3,
    mapping: {},
    outputMode: "blinded",
    strataRaw: "",
    ...overrides,
  };
}

async function tokenFor(snap: RunSnapshot): Promise<{ token: string; payload: SpecPayload }> {
  const rep = await reproduceRun(snap);
  assert.ok(rep.ok, "sample snapshot should reproduce");
  const payload: SpecPayload = {
    snap,
    rng: `${RNG_ALGO}@${RNG_VERSION}`,
    tool: TOOL_VERSION,
    code: rep.ok ? rep.result.code : "",
    generatedAt: "2026-07-02T09:36:05.897Z",
  };
  return { token: encodeSpec(payload), payload };
}

test("spec token round-trips losslessly", async () => {
  const { token, payload } = await tokenFor(sampleSnapshot());
  const decoded = decodeSpec(token);
  assert.deepEqual(decoded, payload);
  assert.match(token, /^TG1\.[A-Za-z0-9_-]+\.[0-9a-f]{8}$/);
});

test("generate → token → verify reproduces the identical verification code", async () => {
  const snap = sampleSnapshot();
  const first = await reproduceRun(snap);
  assert.ok(first.ok);
  const original = first.ok ? first.result.code : "";

  const { token } = await tokenFor(snap);
  const decoded = decodeSpec(token);
  const again = await reproduceRun(decoded.snap);
  assert.ok(again.ok);
  const reproduced = again.ok ? again.result.code : "";

  assert.equal(reproduced, original, "reproduced code must equal the original");
  assert.equal(reproduced, decoded.code, "reproduced code must equal the code carried in the token");
});

test("a token copied out of a PDF (with injected line breaks/spaces) still decodes", async () => {
  const { token, payload } = await tokenFor(sampleSnapshot());
  // Simulate PDF/code-box wrapping: newlines every ~80 chars, plus surrounding whitespace.
  const wrapped = "  " + token.replace(/(.{80})/g, "$1\n") + "\n\t";
  const decoded = decodeSpec(wrapped);
  assert.deepEqual(decoded, payload);
});

test("a full PDF block (label + verify URL + wrapped token + footer) still decodes", async () => {
  const { token, payload } = await tokenFor(sampleSnapshot());
  // The exact kind of text a user selects from the PDF: the label, the verify URL
  // (which itself contains dots), the wrapped token, then footer text.
  const pdfBlock =
    "Verification spec code (verify at trialgrids.com/tools/randomization/verify):\n" +
    token.replace(/(.{72})/g, "$1\n") +
    "\nPage 1 / 1   trialgrids.com/tools/randomization/verify · 29A47AE4464F014A";
  const decoded = decodeSpec(pdfBlock);
  assert.deepEqual(decoded, payload);
});

test("a one-character tamper in the token body is caught by the checksum", async () => {
  const { token } = await tokenFor(sampleSnapshot());
  const [ver, body, check] = token.split(".");
  // Flip a character in the middle of the body.
  const mid = Math.floor(body.length / 2);
  const flipped = body[mid] === "A" ? "B" : "A";
  const tampered = `${ver}.${body.slice(0, mid)}${flipped}${body.slice(mid + 1)}.${check}`;
  assert.throws(
    () => decodeSpec(tampered),
    (e) => e instanceof SpecTokenError && e.reason === "checksum",
  );
});

test("altered parameters with an unchanged embedded code yield a mismatch, not a false pass", async () => {
  // Auditor's scenario: someone hand-edits the schedule parameters but keeps the
  // old verification code. Re-encoding produces a valid token (checksum ok), but
  // reproduction must NOT match the stale code.
  const good = await tokenFor(sampleSnapshot());
  const staleCode = good.payload.code;
  const altered: SpecPayload = {
    ...good.payload,
    snap: sampleSnapshot({ seed: 99999 }), // different seed → different schedule
    code: staleCode, // but the old code is kept
  };
  const token = encodeSpec(altered);
  const decoded = decodeSpec(token); // valid structurally
  const rep = await reproduceRun(decoded.snap);
  assert.ok(rep.ok);
  assert.notEqual(rep.ok ? rep.result.code : "", decoded.code, "recomputed code must not match the stale code");
});

test("malformed tokens are rejected with a clear reason", () => {
  assert.throws(() => decodeSpec("not-a-token"), (e) => e instanceof SpecTokenError && e.reason === "format");
  assert.throws(() => decodeSpec("TG9.abc.def"), (e) => e instanceof SpecTokenError && e.reason === "format");
});
