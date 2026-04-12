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

interface RandRow {
  subjectId: string;
  group: string;
  block: number | string;
  period1?: string;
  period2?: string;
}

type Method = "parallel" | "crossover";

export default function RandomizationPage() {
  const [method, setMethod] = useState<Method>("parallel");
  const [n, setN] = useState(60);
  const [groupsRaw, setGroupsRaw] = useState("A,B");
  const [blockSize, setBlockSize] = useState(4);
  const [seed, setSeed] = useState(42);
  const [rows, setRows] = useState<RandRow[]>([]);

  function generate() {
    const groups = groupsRaw.split(",").map((s) => s.trim()).filter(Boolean);
    const r = rng(seed);
    const out: RandRow[] = [];

    if (method === "parallel") {
      if (blockSize % groups.length !== 0) {
        alert(`Block size must be a multiple of group count (${groups.length}).`);
        return;
      }
      const per = blockSize / groups.length;
      let i = 0;
      while (i < n) {
        const blk: string[] = [];
        groups.forEach((g) => { for (let k = 0; k < per; k++) blk.push(g); });
        shuffle(blk, r);
        for (const g of blk) {
          if (i >= n) break;
          out.push({ subjectId: `S-${String(i + 1).padStart(3, "0")}`, group: g, block: Math.floor(i / blockSize) + 1 });
          i++;
        }
      }
    } else {
      if (groups.length !== 2) {
        alert("Crossover design requires exactly 2 groups.");
        return;
      }
      const sequences = [`${groups[0]}${groups[1]}`, `${groups[1]}${groups[0]}`];
      const perBlock = Math.max(2, Math.round(blockSize / 2) * 2);
      let i = 0;
      while (i < n) {
        const blk: string[] = [];
        for (let k = 0; k < perBlock / 2; k++) blk.push(...sequences);
        shuffle(blk, r);
        for (const seq of blk) {
          if (i >= n) break;
          out.push({
            subjectId: `S-${String(i + 1).padStart(3, "0")}`,
            group: seq,
            block: Math.floor(i / perBlock) + 1,
            period1: seq[0],
            period2: seq[1],
          });
          i++;
        }
      }
    }

    setRows(out);
  }

  function exportCSV() {
    if (!rows.length) { alert("Generate first."); return; }
    let csv = method === "parallel"
      ? "Subject ID,Allocation,Block\n"
      : "Subject ID,Sequence,Period 1,Period 2,Block\n";
    rows.forEach((r) => {
      csv += method === "parallel"
        ? `${r.subjectId},${r.group},${r.block}\n`
        : `${r.subjectId},${r.group},${r.period1},${r.period2},${r.block}\n`;
    });
    download(csv, "randomization.csv");
  }

  return (
    <main>
      <div className="hero">
        <h1>Randomization.</h1>
        <div className="meta">
          tool 01
          <br />
          client-side only
          <br />
          seed reproducible
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Parameters</h2>
          <span className="tag">configure</span>
        </div>
        <div className="panel-body">
          <div className="controls">

            {/* Method toggle */}
            <div>
              <label>Method</label>
              <div className="method-toggle">
                <button
                  className={`method-btn${method === "parallel" ? " active" : ""}`}
                  onClick={() => setMethod("parallel")}
                >
                  Parallel
                </button>
                <button
                  className={`method-btn${method === "crossover" ? " active" : ""}`}
                  onClick={() => setMethod("crossover")}
                >
                  Crossover
                </button>
              </div>
            </div>

            <div>
              <label>Sample size (N)</label>
              <input type="number" value={n} min={2} max={2000} onChange={(e) => setN(parseInt(e.target.value) || 2)} />
            </div>
            <div>
              <label>{method === "crossover" ? "Groups (2 required)" : "Groups (comma-sep)"}</label>
              <input type="text" value={groupsRaw} onChange={(e) => setGroupsRaw(e.target.value)} />
            </div>
            <div>
              <label>Block size</label>
              <input type="number" value={blockSize} min={2} max={20} onChange={(e) => setBlockSize(parseInt(e.target.value) || 2)} />
            </div>
            <div>
              <label>Seed</label>
              <input type="number" value={seed} onChange={(e) => setSeed(parseInt(e.target.value) || 0)} />
            </div>
          </div>

          <div className="btn-row">
            <button className="btn" onClick={generate}>Generate</button>
            <button className="btn ghost" onClick={exportCSV}>Export CSV</button>
          </div>

          {rows.length > 0 && (
            <div className="result">
              <table>
                <thead>
                  <tr>
                    <th>Subject ID</th>
                    {method === "parallel" ? (
                      <>
                        <th>Allocation</th>
                        <th>Block #</th>
                      </>
                    ) : (
                      <>
                        <th>Sequence</th>
                        <th>Period 1</th>
                        <th>Period 2</th>
                        <th>Block #</th>
                      </>
                    )}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.subjectId}>
                      <td>{row.subjectId}</td>
                      {method === "parallel" ? (
                        <>
                          <td className={`group-${row.group}`}>{row.group}</td>
                          <td>{row.block}</td>
                        </>
                      ) : (
                        <>
                          <td style={{ fontWeight: 500 }}>{row.group}</td>
                          <td className={`group-${row.period1}`}>{row.period1}</td>
                          <td className={`group-${row.period2}`}>{row.period2}</td>
                          <td>{row.block}</td>
                        </>
                      )}
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

function download(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
