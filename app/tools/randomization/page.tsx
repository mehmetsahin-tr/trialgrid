"use client";

import { useState } from "react";

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

interface RandRow {
  subjectId: string;
  treatments: string[];
}

type Method = "parallel" | "crossover";

// Colors indexed by group position — works for any drug name
const GROUP_COLORS_CSS = ["#5b8dc4", "#c85a40", "#5a7a3a", "#8a5a2b"];
const GROUP_COLORS_PDF = [[91, 141, 196], [200, 90, 64], [90, 122, 58], [138, 90, 43]] as [number, number, number][];

export default function RandomizationPage() {
  const [method, setMethod] = useState<Method>("parallel");
  const [n, setN] = useState(60);
  const [groupsRaw, setGroupsRaw] = useState("A,B");
  const [periods, setPeriods] = useState(2);
  const [rows, setRows] = useState<RandRow[]>([]);

  const groups = groupsRaw.split(",").map((s) => s.trim()).filter(Boolean);

  function generate() {
    const r = rng(Date.now());

    if (method === "parallel") {
      // All subjects follow the same fixed schedule: Period 1 = drugs[0], Period 2 = drugs[1], …
      const schedule = Array.from({ length: periods }, (_, i) => groups[i % groups.length]);
      const out: RandRow[] = Array.from({ length: n }, (_, i) => ({
        subjectId: String(i + 1).padStart(3, "0"),
        treatments: schedule,
      }));
      setRows(out);
    } else {
      if (groups.length < 2) { alert("At least 2 groups required for crossover."); return; }
      const seqs = getCrossoverSequences(groups, periods);
      const out: RandRow[] = [];
      let i = 0;
      while (i < n) {
        const blk = [...seqs];
        shuffle(blk, r);
        for (const seq of blk) {
          if (i >= n) break;
          out.push({ subjectId: String(i + 1).padStart(3, "0"), treatments: seq });
          i++;
        }
      }
      setRows(out);
    }
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
    doc.text(`METHOD: ${method.toUpperCase()}  ·  PERIODS: ${periods}  ·  DRUGS: ${groups.join(", ")}  ·  N = ${n}`, 14, 26);

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

    // Add "Page X / Y" to every page after table is fully rendered
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
    }

    doc.save("randomization.pdf");
  }

  const periodHeaders = Array.from({ length: periods }, (_, i) => `Period ${i + 1}`);
  const groupIndex = (val: string) => groups.indexOf(val);

  return (
    <main>
      <div className="hero">
        <h1>Randomization.</h1>
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
          <h2>Parameters</h2>
          <span className="tag">configure</span>
        </div>
        <div className="panel-body">

          {/* Method — standalone row */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label>Method</label>
            <div className="method-toggle">
              <button
                className={`method-btn${method === "parallel" ? " active" : ""}`}
                onClick={() => { setMethod("parallel"); setRows([]); }}
              >
                Parallel
              </button>
              <button
                className={`method-btn${method === "crossover" ? " active" : ""}`}
                onClick={() => { setMethod("crossover"); setRows([]); }}
              >
                Crossover
              </button>
            </div>
          </div>

          {/* Parameter grid */}
          <div className="controls">
            <div>
              <label>Sample size (N)</label>
              <input type="number" value={n} min={2} max={2000}
                onChange={(e) => setN(parseInt(e.target.value) || 2)} />
            </div>
            <div>
              <label>Drugs (comma-sep)</label>
              <input type="text" value={groupsRaw}
                onChange={(e) => setGroupsRaw(e.target.value)} />
            </div>
            <div>
                <label>Periods</label>
                <div className="method-toggle">
                  {[1, 2, 3, 4].map((p) => (
                    <button
                      key={p}
                      className={`method-btn${periods === p ? " active" : ""}`}
                      onClick={() => setPeriods(p)}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              </div>
          </div>

          <div className="btn-row">
            <button className="btn" onClick={generate}>Generate</button>
            <button className="btn ghost" onClick={exportPDF}>Export PDF</button>
          </div>

          {rows.length > 0 && (
            <div className="result">
              <table>
                <thead>
                  <tr>
                    <th>ID</th>
                    {periodHeaders.map((h) => <th key={h}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.subjectId}>
                      <td>{row.subjectId}</td>
                      {row.treatments.map((t, i) => {
                        const idx = groupIndex(t);
                        return (
                          <td key={i} style={{ color: GROUP_COLORS_CSS[idx % GROUP_COLORS_CSS.length], fontWeight: 500 }}>{t}</td>
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
