// Known-answer + property tests for the randomization engine.
// Run with: npm test  (Node 24 native TS + test runner, no extra deps)

import { test } from "node:test";
import assert from "node:assert/strict";

import { mulberry32, RNG_ALGO, RNG_VERSION } from "../rng.ts";
import { generateSchedule } from "../generate.ts";
import { DESIGNS } from "../designs.ts";
import { canonicalString, sha256Hex, verificationCode } from "../hash.ts";
import { buildXlsx } from "../xlsx.ts";
import { toCSV } from "../export.ts";

test("RNG metadata is pinned", () => {
  assert.equal(RNG_ALGO, "mulberry32");
  assert.equal(RNG_VERSION, "1.0");
});

test("mulberry32 is deterministic (known answer)", () => {
  const r = mulberry32(12345);
  const got = [r(), r(), r()].map((x) => x.toFixed(10));
  assert.deepEqual(got, ["0.9797282678", "0.3067522645", "0.4842054215"]);
});

test("2x2x2 schedule is reproducible (known answer + verification code)", async () => {
  const params = {
    method: "crossover" as const,
    designId: "2x2x2" as const,
    drugs: ["T", "R"],
    n: 8,
    blockSize: 4,
    seed: 12345,
  };
  const res = generateSchedule(params);
  assert.ok(res.ok);
  assert.deepEqual(
    res.rows.map((row) => row.sequenceLabel),
    ["TR", "RT", "TR", "RT", "RT", "TR", "TR", "RT"]
  );

  const meta = {
    studyCode: "",
    method: "crossover",
    designId: "2x2x2",
    drugs: ["T", "R"],
    n: 8,
    blockSize: 4,
    seed: 12345,
    allocation: "balanced",
  };
  const code = verificationCode(await sha256Hex(canonicalString(meta, res.rows)));
  assert.equal(code, "DA0579E4E3016ECC");
});

test("stratified randomization balances within each stratum", () => {
  const res = generateSchedule({
    method: "crossover",
    designId: "2x2x2",
    drugs: ["T", "R"],
    n: 0,
    blockSize: 4,
    seed: 5,
    strata: [{ name: "Male", n: 8 }, { name: "Female", n: 8 }],
  });
  assert.ok(res.ok);
  assert.equal(res.rows.length, 16);
  assert.deepEqual(res.strata, ["Male", "Female"]);
  const counts: Record<string, Record<string, number>> = {};
  for (const row of res.rows) {
    const s = row.stratum as string;
    counts[s] = counts[s] ?? {};
    counts[s][row.sequenceLabel] = (counts[s][row.sequenceLabel] ?? 0) + 1;
  }
  assert.deepEqual(counts, { Male: { TR: 4, RT: 4 }, Female: { TR: 4, RT: 4 } });
  // continuous numbering across strata
  assert.equal(res.rows[8].subjectId, "009");
});

test("unbalanced stratum size is rejected", () => {
  const res = generateSchedule({
    method: "crossover",
    designId: "2x2x2",
    drugs: ["T", "R"],
    n: 0,
    blockSize: 4,
    seed: 5,
    strata: [{ name: "Male", n: 7 }],
  });
  assert.ok(!res.ok);
});

test("reserve subjects are balanced and labelled separately", () => {
  const res = generateSchedule({
    method: "crossover",
    designId: "partial-replicate",
    drugs: ["T", "R"],
    n: 12,
    blockSize: 6,
    seed: 7,
    reserve: 6,
  });
  assert.ok(res.ok);
  assert.deepEqual(res.reserveRows.map((r) => r.subjectId), ["R01", "R02", "R03", "R04", "R05", "R06"]);
  const counts: Record<string, number> = {};
  for (const r of res.reserveRows) counts[r.sequenceLabel] = (counts[r.sequenceLabel] ?? 0) + 1;
  assert.deepEqual(counts, { TRR: 2, RTR: 2, RRT: 2 });
});

test("numbering scheme applies prefix, start and pad", () => {
  const res = generateSchedule({
    method: "crossover",
    designId: "2x2x2",
    drugs: ["T", "R"],
    n: 4,
    blockSize: 4,
    seed: 1,
    randPrefix: "IST-",
    randStart: 101,
    randPad: 4,
    enrollEnabled: true,
    enrollPrefix: "SCR-",
    enrollStart: 1,
    enrollPad: 3,
  });
  assert.ok(res.ok);
  assert.equal(res.rows[0].subjectId, "IST-0101");
  assert.equal(res.rows[1].subjectId, "IST-0102");
  assert.equal(res.rows[0].enrollNo, "SCR-001");
});

test("same params on a fresh call produce an identical hash", async () => {
  const params = {
    method: "crossover" as const,
    designId: "williams" as const,
    drugs: ["A", "B", "C"],
    n: 24,
    blockSize: 6,
    seed: 99,
  };
  const meta = {
    studyCode: "PROT-1",
    method: "crossover",
    designId: "williams",
    drugs: ["A", "B", "C"],
    n: 24,
    blockSize: 6,
    seed: 99,
    allocation: "balanced",
  };
  const a = generateSchedule(params);
  const b = generateSchedule(params);
  assert.ok(a.ok && b.ok);
  const ha = await sha256Hex(canonicalString(meta, a.rows));
  const hb = await sha256Hex(canonicalString(meta, b.rows));
  assert.equal(ha, hb);
});

test("Williams 3-treatment design is variance (carryover) balanced", () => {
  const seqs = DESIGNS.williams.build(["A", "B", "C"]);
  assert.equal(seqs.length, 6);
  // each treatment appears exactly twice in each period
  for (let period = 0; period < 3; period++) {
    const counts: Record<string, number> = {};
    for (const s of seqs) counts[s[period]] = (counts[s[period]] ?? 0) + 1;
    assert.deepEqual(counts, { A: 2, B: 2, C: 2 });
  }
  // each ordered adjacency appears equally often
  const adj: Record<string, number> = {};
  for (const s of seqs)
    for (let i = 0; i < s.length - 1; i++) adj[`${s[i]}>${s[i + 1]}`] = (adj[`${s[i]}>${s[i + 1]}`] ?? 0) + 1;
  const values = Object.values(adj);
  assert.equal(values.length, 6); // all 6 ordered pairs present
  assert.ok(values.every((v) => v === values[0]));
});

test("Williams 4-treatment design: 4 sequences, balanced periods", () => {
  const seqs = DESIGNS.williams.build(["A", "B", "C", "D"]);
  assert.equal(seqs.length, 4);
  for (let period = 0; period < 4; period++) {
    const set = new Set(seqs.map((s) => s[period]));
    assert.equal(set.size, 4); // every treatment once per period
  }
});

test("replicate designs use the canonical templates", () => {
  assert.deepEqual(DESIGNS["partial-replicate"].build(["T", "R"]), [
    ["T", "R", "R"],
    ["R", "T", "R"],
    ["R", "R", "T"],
  ]);
  assert.deepEqual(DESIGNS["full-replicate-2seq"].build(["T", "R"]), [
    ["T", "R", "T", "R"],
    ["R", "T", "R", "T"],
  ]);
  assert.deepEqual(DESIGNS["full-replicate-4seq"].build(["T", "R"]), [
    ["T", "R", "T", "R"],
    ["R", "T", "R", "T"],
    ["T", "R", "R", "T"],
    ["R", "T", "T", "R"],
  ]);
});

test("balanced design assigns equal n per sequence", () => {
  const res = generateSchedule({
    method: "crossover",
    designId: "partial-replicate",
    drugs: ["T", "R"],
    n: 12,
    blockSize: 6,
    seed: 7,
  });
  assert.ok(res.ok);
  const counts: Record<string, number> = {};
  for (const row of res.rows) counts[row.sequenceLabel] = (counts[row.sequenceLabel] ?? 0) + 1;
  assert.deepEqual(counts, { TRR: 4, RTR: 4, RRT: 4 });
});

test("unbalanced n is rejected with a suggestion", () => {
  const res = generateSchedule({
    method: "crossover",
    designId: "2x2x2",
    drugs: ["T", "R"],
    n: 9,
    blockSize: 4,
    seed: 1,
  });
  assert.ok(!res.ok);
  assert.equal(res.error.suggestion, 10); // nearest multiple of 2 to 9
});

test("buildXlsx produces a valid ZIP container with sheet parts", () => {
  const bytes = buildXlsx([{ name: "Schedule", rows: [["ID", "Seq"], ["001", "TR"]] }]);
  // ZIP local-file-header magic "PK\x03\x04"
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  assert.equal(bytes[2], 0x03);
  assert.equal(bytes[3], 0x04);
  const text = Buffer.from(bytes).toString("latin1");
  assert.ok(text.includes("[Content_Types].xml"));
  assert.ok(text.includes("xl/worksheets/sheet1.xml"));
  // EOCD magic "PK\x05\x06"
  assert.ok(text.includes("PK\x05\x06"));
});

test("toCSV escapes commas, quotes and newlines", () => {
  const csv = toCSV([
    ["a", "b,c", 'd"e'],
    ["line1\nline2", 1, "x"],
  ]);
  assert.equal(csv, 'a,"b,c","d""e"\r\n"line1\nline2",1,x');
});

test("BE 2x2: N=40 block=4 yields exactly 20 AB + 20 BA, reproducibly", async () => {
  const params = {
    method: "crossover" as const,
    designId: "2x2x2" as const,
    drugs: ["A", "B"],
    n: 40,
    blockSize: 4,
    seed: 2024,
  };
  const a = generateSchedule(params);
  const b = generateSchedule(params);
  assert.ok(a.ok && b.ok);
  const counts: Record<string, number> = {};
  for (const r of a.rows) counts[r.sequenceLabel] = (counts[r.sequenceLabel] ?? 0) + 1;
  assert.deepEqual(counts, { AB: 20, BA: 20 });

  const meta = {
    studyCode: "NOV2024/02159",
    method: "crossover",
    designId: "2x2x2",
    drugs: ["A", "B"],
    n: 40,
    blockSize: 4,
    seed: 2024,
    allocation: "balanced",
  };
  const ha = await sha256Hex(canonicalString(meta, a.rows));
  const hb = await sha256Hex(canonicalString(meta, b.rows));
  assert.equal(ha, hb); // same seed + params -> identical hash
  assert.equal(verificationCode(ha), "47E7FAE2F92A5CD4");
});

test("BE 2x2: N=40 with block=6 is blocked with valid block suggestions", () => {
  const res = generateSchedule({
    method: "crossover",
    designId: "2x2x2",
    drugs: ["A", "B"],
    n: 40,
    blockSize: 6,
    seed: 2024,
  });
  assert.ok(!res.ok);
  assert.deepEqual(res.error.validBlocks, [2, 4, 8]);
});

test("wrong treatment count for a design is rejected", () => {
  const res = generateSchedule({
    method: "crossover",
    designId: "2x2x2",
    drugs: ["T", "R", "X"],
    n: 8,
    blockSize: 4,
    seed: 1,
  });
  assert.ok(!res.ok);
});
