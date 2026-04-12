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
}

export default function RandomizationPage() {
  const [method, setMethod] = useState<"simple" | "block">("block");
  const [n, setN] = useState(60);
  const [groupsRaw, setGroupsRaw] = useState("A,B");
  const [blockSize, setBlockSize] = useState(4);
  const [seed, setSeed] = useState(42);
  const [rows, setRows] = useState<RandRow[]>([]);

  function generate() {
    const groups = groupsRaw
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    const r = rng(seed);
    const out: string[] = [];

    if (method === "simple") {
      for (let i = 0; i < n; i++) out.push(groups[Math.floor(r() * groups.length)]);
    } else {
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
        for (const g of blk) { if (i >= n) break; out.push(g); i++; }
      }
    }

    setRows(
      out.map((g, i) => ({
        subjectId: `S-${String(i + 1).padStart(3, "0")}`,
        group: g,
        block: method === "block" ? Math.floor(i / blockSize) + 1 : "—",
      }))
    );
  }

  function exportCSV() {
    if (!rows.length) { alert("Generate first."); return; }
    let csv = "Subject ID,Allocation,Block\n";
    rows.forEach((r) => { csv += `${r.subjectId},${r.group},${r.block}\n`; });
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
            <div>
              <label>Method</label>
              <select value={method} onChange={(e) => setMethod(e.target.value as "simple" | "block")}>
                <option value="simple">Simple</option>
                <option value="block">Block</option>
              </select>
            </div>
            <div>
              <label>Sample size (N)</label>
              <input type="number" value={n} min={2} max={2000} onChange={(e) => setN(parseInt(e.target.value) || 2)} />
            </div>
            <div>
              <label>Groups (comma-sep)</label>
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
                    <th>Allocation</th>
                    <th>Block #</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.subjectId}>
                      <td>{row.subjectId}</td>
                      <td className={`group-${row.group}`}>{row.group}</td>
                      <td>{row.block}</td>
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
