"use client";

import { useState, useEffect } from "react";
import Select from "@/app/components/Select";

// Seeded RNG — mulberry32
function rng(seed: number) {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function shuffle<T>(arr: T[], r: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getCrossoverSequences(groups: string[], periods: number): string[][] {
  const [A, B, C] = groups;
  if (groups.length === 2) {
    if (periods === 1) return [[A], [B]];
    if (periods === 2) return [[A, B], [B, A]];
    if (periods === 3) return [[A, B, A], [B, A, B]];
    // periods === 4
    return [[A, B, A, B], [B, A, B, A], [A, B, B, A], [B, A, A, B]];
  }
  if (groups.length === 3) {
    if (periods === 3) return [[A, B, C], [B, C, A], [C, A, B], [A, C, B], [C, B, A], [B, A, C]];
    if (periods === 4) return [
      [A, B, C, A], [B, C, A, B], [C, A, B, C],
      [A, C, B, A], [C, B, A, C], [B, A, C, B],
    ];
  }
  // Fallback: one sequence per permutation, truncated/extended to periods
  const perms: string[][] = [];
  const perm = (arr: string[], cur: string[] = []) => {
    if (!arr.length) { perms.push(cur); return; }
    arr.forEach((v, i) => perm([...arr.slice(0, i), ...arr.slice(i + 1)], [...cur, v]));
  };
  perm(groups);
  return perms.map((p) => Array.from({ length: periods }, (_, i) => p[i % p.length]));
}

function parseAllocationRatio(input: string, numGroups: number): number[] | null {
  const parts = input.split(":").map(s => s.trim()).filter(Boolean);
  if (parts.length !== numGroups) return null;
  const nums = parts.map(p => parseInt(p, 10));
  if (nums.some(v => isNaN(v) || v < 1)) return null;
  return nums;
}

function generateBlockedAllocation<T>(
  items: T[],
  weights: number[],
  n: number,
  blockSize: number,
  r: () => number
): T[] {
  const sumWeights = weights.reduce((a, b) => a + b, 0);
  const perBlock = weights.map(w => (blockSize * w) / sumWeights);
  if (perBlock.some(x => !Number.isInteger(x) || x < 1)) {
    throw new Error("Block size is not a multiple of allocation ratio sum");
  }
  const numBlocks = Math.ceil(n / blockSize);
  const result: T[] = [];
  for (let b = 0; b < numBlocks; b++) {
    const block: T[] = [];
    for (let i = 0; i < items.length; i++) {
      for (let k = 0; k < perBlock[i]; k++) {
        block.push(items[i]);
      }
    }
    shuffle(block, r);
    result.push(...block);
  }
  return result.slice(0, n);
}

interface RandRow {
  subjectId: string;
  treatments: string[];
}

type Method = "parallel" | "crossover";

// Colors indexed by group position — works for any drug name
const GROUP_COLORS_CSS = ["#5b8dc4", "#c85a40", "#5a7a3a", "#8a5a2b"];
const GROUP_COLORS_PDF = [[91, 141, 196], [200, 90, 64], [90, 122, 58], [138, 90, 43]] as [number, number, number][];

function cryptoSeed(): number {
  if (typeof crypto !== "undefined" && crypto.getRandomValues) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return Math.floor(Math.random() * 0xffffffff);
}

export default function RandomizationPage() {
  const [method, setMethod] = useState<Method>("parallel");
  const [n, setN] = useState(24);
  const [nRaw, setNRaw] = useState("");
  const [groupsRaw, setGroupsRaw] = useState("");
  const [periods, setPeriods] = useState(0);
  const [rows, setRows] = useState<RandRow[]>([]);
  const [seed, setSeed] = useState<number>(() => cryptoSeed());
  const [seedRaw, setSeedRaw] = useState<string>("");
  const [blockSize, setBlockSize] = useState<number>(0);
  const [allocationRaw, setAllocationRaw] = useState<string>("");
  const [genError, setGenError] = useState<string>("");
  const [lastGeneration, setLastGeneration] = useState<{
    seed: number;
    method: Method;
    groups: string[];
    periods: number;
    n: number;
    blockSize: number;
    allocation: string;
    generatedAt: string;
  } | null>(null);

  useEffect(() => {
    setSeedRaw(String(seed));
  }, []);

  const groups = groupsRaw.split(",").map((s) => s.trim()).filter(Boolean);

  function generateRandomSeed() {
    const newSeed = cryptoSeed();
    setSeed(newSeed);
    setSeedRaw(String(newSeed));
  }

  function commitSeedFromInput() {
    const parsed = parseInt(seedRaw, 10);
    if (!isNaN(parsed) && parsed >= 0) {
      setSeed(parsed >>> 0);
      setSeedRaw(String(parsed >>> 0));
    } else {
      setSeedRaw(String(seed));
    }
  }

  function generate() {
    setGenError("");
    if (!periods) { setGenError("Please select a number of periods."); return; }
    if (!blockSize) { setGenError("Please select a block size."); return; }
    const r = rng(seed);

    if (method === "parallel") {
      const weights = parseAllocationRatio(allocationRaw, groups.length);
      if (!weights) {
        setGenError(`Allocation ratio must have ${groups.length} component${groups.length > 1 ? "s" : ""} matching drug count, e.g. "${Array(groups.length).fill("1").join(":")}"`);
        return;
      }
      const sumWeights = weights.reduce((a, b) => a + b, 0);
      if (n % sumWeights !== 0) {
        setGenError(`Total volunteers (${n}) must be divisible by sum of allocation ratio (${sumWeights})`);
        return;
      }
      if (blockSize % sumWeights !== 0) {
        setGenError(`Block size (${blockSize}) must be a multiple of allocation ratio sum (${sumWeights})`);
        return;
      }
      if (n < blockSize) {
        setGenError(`Total volunteers (${n}) must be at least block size (${blockSize})`);
        return;
      }

      const assignments = generateBlockedAllocation(groups, weights, n, blockSize, r);
      const out: RandRow[] = assignments.map((drug, i) => ({
        subjectId: String(i + 1).padStart(3, "0"),
        treatments: Array(periods).fill(drug),
      }));
      setRows(out);
    } else {
      if (groups.length < 2) {
        setGenError("At least 2 drugs required for crossover.");
        return;
      }
      const seqs = getCrossoverSequences(groups, periods);
      if (blockSize % seqs.length !== 0) {
        setGenError(`Block size (${blockSize}) must be a multiple of sequence count (${seqs.length})`);
        return;
      }
      if (n < blockSize) {
        setGenError(`Total volunteers (${n}) must be at least block size (${blockSize})`);
        return;
      }
      if (n % seqs.length !== 0) {
        setGenError(`Total volunteers (${n}) must be divisible by sequence count (${seqs.length}) for balanced design`);
        return;
      }

      const weights = Array(seqs.length).fill(1) as number[];
      const assigned = generateBlockedAllocation(seqs, weights, n, blockSize, r);
      const out: RandRow[] = assigned.map((seq, i) => ({
        subjectId: String(i + 1).padStart(3, "0"),
        treatments: seq,
      }));
      setRows(out);
    }

    setLastGeneration({
      seed,
      method,
      groups: [...groups],
      periods,
      n,
      blockSize,
      allocation: method === "parallel" ? allocationRaw : "balanced",
      generatedAt: new Date().toISOString(),
    });
  }

  async function exportPDF() {
    if (!rows.length) { alert("Generate first."); return; }
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF();
    const pdfHeaders = ["ID", ...Array.from({ length: periods }, (_, i) => `Period ${i + 1}`)];

    doc.setFont("times", "bold");
    doc.setFontSize(14);
    doc.text("Randomization Schedule", 14, 18);
    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.text(`METHOD: ${method.toUpperCase()}  ·  PERIODS: ${periods}  ·  DRUGS: ${groups.join(", ")}  ·  Volunteer Size = ${n}`, 14, 26);

    autoTable(doc, {
      head: [pdfHeaders],
      body: rows.map((r) => [r.subjectId, ...r.treatments]),
      startY: 32,
      styles: { font: "courier", fontSize: 8, cellPadding: 2, textColor: [20, 20, 20], fillColor: [255, 255, 255] },
      headStyles: { fillColor: [235, 235, 230], textColor: [20, 20, 20], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 247, 244] },
      tableLineColor: [180, 178, 170],
      tableLineWidth: 0.2,
      didParseCell(data) {
        if (data.column.index > 0) {
          data.cell.styles.halign = "center";
        }
        if (data.section === "body" && data.column.index > 0) {
          const cellVal = String(data.cell.raw);
          const idx = groups.indexOf(cellVal);
          if (idx >= 0) {
            data.cell.styles.textColor = GROUP_COLORS_PDF[idx % GROUP_COLORS_PDF.length];
            data.cell.styles.fontStyle = "bold";
          }
        }
      },
    });

    // Audit metadata footer
    const finalY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 100;
    const metadataY = finalY + 15;

    doc.setFont("courier", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 100, 100);

    const lines = [
      "— Generation details —",
      `Algorithm:  Mulberry32 PRNG with Fisher-Yates shuffle`,
      `Method:     ${method === "parallel" ? "Parallel" : "Crossover"} (${groups.join(", ")}), ${periods} period${periods > 1 ? "s" : ""}`,
      `Subjects:   ${n}`,
      `Block size: ${lastGeneration?.blockSize ?? blockSize}`,
      method === "parallel"
        ? `Allocation: ${lastGeneration?.allocation ?? allocationRaw}`
        : `Allocation: balanced (equal sequences)`,
      `Seed:       ${lastGeneration?.seed ?? seed}`,
      `Generated:  ${lastGeneration?.generatedAt ?? new Date().toISOString()}`,
      `Tool:       Trialgrids — trialgrids.com`,
    ];

    let y = metadataY;
    for (const line of lines) {
      if (y > 280) { doc.addPage(); y = 20; }
      doc.text(line, 14, y);
      y += 5;
    }

    doc.setTextColor(0, 0, 0);

    const totalPages = doc.getNumberOfPages();
    for (let p = 1; p <= totalPages; p++) {
      doc.setPage(p);
      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      doc.setTextColor(140, 138, 128);
      doc.text(
        `Page ${p} / ${totalPages}`,
        doc.internal.pageSize.width - 14,
        doc.internal.pageSize.height - 8,
        { align: "right" }
      );
      doc.text(
        "trialgrids.com",
        14,
        doc.internal.pageSize.height - 8
      );
    }

    doc.save("randomization.pdf");
  }

  const periodHeaders = Array.from({ length: periods }, (_, i) => `Period ${i + 1}`);
  const groupIndex = (val: string) => groups.indexOf(val);

  return (
    <main>
      <div className="hero">
        <div>
          <p className="eyebrow">
            Randomization for bioequivalence &amp; crossover trials
          </p>
          <h1>Randomization.</h1>
          <p className="lede">
            Generate randomization schedules for bioequivalence, bioavailability, and crossover clinical trials. Williams design, 2×2, parallel, and Latin square methods — all seeded, reproducible, and exportable. Runs entirely in your browser; your data never leaves this device.
          </p>
        </div>
        <div className="meta">
          tool 01
          <br />
          client-side only
          <br />
          block randomization
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Study parameters</h2>
          <span className="tag">configure</span>
        </div>
        <div className="panel-body">

          {/* Method — standalone row */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label>Method</label>
            <div className="method-toggle">
              <button
                className={`method-btn${method === "parallel" ? " active" : ""}`}
                onClick={() => { setMethod("parallel"); setRows([]); setGenError(""); }}
              >
                Parallel
              </button>
              <button
                className={`method-btn${method === "crossover" ? " active" : ""}`}
                onClick={() => { setMethod("crossover"); setRows([]); setGenError(""); }}
              >
                Crossover
              </button>
            </div>
          </div>

          {/* Parameter grid */}
          <div className="controls" style={{ alignItems: "flex-start" }}>
            <div>
              <label>Total volunteers</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder={method === "parallel" ? 'e.g. 24' : "e.g. 24"}
                value={nRaw}
                style={{ fontSize: ".63rem" }}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setNRaw(raw);
                  const num = parseInt(raw);
                  if (!isNaN(num) && num >= 2 && num <= 2000) setN(num);
                }}
                onBlur={() => {
                  const num = parseInt(nRaw);
                  if (!isNaN(num) && num >= 2 && num <= 2000) setN(num);
                }}
              />
            </div>
            <div>
              <label>Drugs</label>
              <input
                type="text"
                value={groupsRaw}
                onChange={(e) => setGroupsRaw(e.target.value)}
                placeholder="A, B"
                style={{ width: "100%", fontSize: ".72rem" }}
              />
            </div>
            <div>
              <label>Periods</label>
              <div className="method-toggle" style={{ height: "2.5rem", alignItems: "stretch" }}>
                {[1, 2, 3, 4].map((p) => (
                  <button
                    key={p}
                    className={`method-btn${periods === p ? " active" : ""}`}
                    onClick={() => setPeriods(p)}
                    style={{ flex: 1 }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label>Seed</label>
              <input
                type="text"
                inputMode="numeric"
                value={seedRaw}
                onChange={e => setSeedRaw(e.target.value.replace(/[^0-9]/g, ""))}
                onBlur={commitSeedFromInput}
                style={{ width: "100%" }}
              />
              <button
                onClick={generateRandomSeed}
                style={{ background: "none", border: "none", color: "var(--accent)", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".68rem", textTransform: "uppercase", letterSpacing: ".05em", cursor: "pointer", padding: 0, marginTop: ".35rem" }}
              >
                🎲 randomize
              </button>
            </div>
            <div>
              <label>Block size</label>
              <Select
                value={String(blockSize || "")}
                onChange={v => { const num = parseInt(v, 10); if (!isNaN(num)) setBlockSize(num); }}
                placeholder="Please select"
                options={[2, 4, 6, 8, 12].map(b => ({ value: String(b), label: String(b) }))}
              />
            </div>
            {method === "parallel" && (
              <div>
                <label>Allocation ratio</label>
                <input
                  type="text"
                  value={allocationRaw}
                  onChange={e => setAllocationRaw(e.target.value)}
                  placeholder="1:1"
                  style={{ width: "100%" }}
                />
              </div>
            )}
          </div>

          <div className="btn-row">
            <button className="btn" onClick={generate}>Generate</button>
            <button className="btn ghost" onClick={exportPDF}>Export PDF</button>
          </div>

          {genError && (
            <div style={{
              marginTop: "1rem",
              padding: ".75rem 1rem",
              border: "1px solid #c85a40",
              color: "#c85a40",
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: ".75rem",
              background: "rgba(200, 90, 64, 0.05)",
              borderRadius: "4px",
            }}>
              ⚠ {genError}
            </div>
          )}

          {rows.length > 0 && (
            <div className="result">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    {periodHeaders.map((h) => <th key={h} style={{ textAlign: "center" }}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.subjectId}>
                      <td>{row.subjectId}</td>
                      {row.treatments.map((t, i) => {
                        const idx = groupIndex(t);
                        return (
                          <td key={i} style={{ color: GROUP_COLORS_CSS[idx % GROUP_COLORS_CSS.length], fontWeight: 500, textAlign: "center" }}>{t}</td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
