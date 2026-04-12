"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "trialgrid_tt";

interface TTState {
  title: string;
  visits: string[];
  procs: string[];
  marks: Record<string, boolean>;
  rawVisits: string;
  rawProcs: string;
}

const DEFAULT_STATE: TTState = {
  title: "Study ABC-001",
  visits: [],
  procs: [],
  marks: {},
  rawVisits: "Screening,Baseline,Week 2,Week 4,Week 12,End of Study",
  rawProcs: "Informed consent,Eligibility,Demographics,Vital signs,Labs,ECG,Adverse events,Drug administration",
};

export default function TimeTablePage() {
  const [state, setState] = useState<TTState>(DEFAULT_STATE);
  const [built, setBuilt] = useState(false);
  const tableRef = useRef<HTMLDivElement>(null);

  // Auto-load from localStorage on mount
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const d = JSON.parse(raw) as TTState;
        setState(d);
        setBuilt(d.visits.length > 0);
      } catch {
        /* ignore corrupt data */
      }
    }
  }, []);

  function buildTable() {
    const visits = state.rawVisits.split(",").map((s) => s.trim()).filter(Boolean);
    const procs = state.rawProcs.split(",").map((s) => s.trim()).filter(Boolean);
    const next = { ...state, visits, procs };
    setState(next);
    setBuilt(true);
    autoSave(next);
  }

  function toggleMark(key: string) {
    setState((prev) => {
      const marks = { ...prev.marks, [key]: !prev.marks[key] };
      const next = { ...prev, marks };
      autoSave(next);
      return next;
    });
  }

  function autoSave(s: TTState) {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch { /* quota exceeded */ }
  }

  function exportCSV() {
    if (!built) { alert("Build the table first."); return; }
    let csv = "Procedure," + state.visits.map((v) => `"${v}"`).join(",") + "\n";
    state.procs.forEach((p, pi) => {
      const row = [`"${p}"`];
      state.visits.forEach((_, vi) => row.push(state.marks[`${pi}_${vi}`] ? "X" : ""));
      csv += row.join(",") + "\n";
    });
    download(csv, "time_table.csv");
  }

  return (
    <main>
      <div className="hero">
        <h1>Time table.</h1>
        <div className="meta">
          tool 02
          <br />
          visit × procedure
          <br />
          SPIRIT-style
        </div>
      </div>

      <div className="panel">
        <div className="panel-head">
          <h2>Schedule of Assessments</h2>
          <span className="tag">click cells to mark</span>
        </div>
        <div className="panel-body">
          <div className="controls">
            <div>
              <label>Study title</label>
              <input
                type="text"
                value={state.title}
                onChange={(e) => setState((s) => ({ ...s, title: e.target.value }))}
              />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label>Visits (comma-sep)</label>
              <input
                type="text"
                value={state.rawVisits}
                onChange={(e) => setState((s) => ({ ...s, rawVisits: e.target.value }))}
              />
            </div>
            <div style={{ gridColumn: "span 2" }}>
              <label>Procedures (comma-sep)</label>
              <input
                type="text"
                value={state.rawProcs}
                onChange={(e) => setState((s) => ({ ...s, rawProcs: e.target.value }))}
              />
            </div>
          </div>

          <div className="btn-row">
            <button className="btn" onClick={buildTable}>Build / rebuild</button>
            <button className="btn ghost" onClick={exportCSV}>Export CSV</button>
          </div>

          <div className="notice" style={{ marginTop: "1.2rem" }}>
            <strong>Tip.</strong> Click any cell to toggle an{" "}
            <code>×</code> mark. Your work auto-saves to this browser.
          </div>

          {built && state.visits.length > 0 && (
            <div className="result" ref={tableRef}>
              <table>
                <thead>
                  <tr>
                    <th style={{ minWidth: "200px" }}>Procedure \ Visit</th>
                    {state.visits.map((v) => (
                      <th key={v}>{v}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {state.procs.map((p, pi) => (
                    <tr key={pi}>
                      <td>
                        <strong>{p}</strong>
                      </td>
                      {state.visits.map((_, vi) => {
                        const key = `${pi}_${vi}`;
                        return (
                          <td
                            key={vi}
                            className={`tt-cell${state.marks[key] ? " marked" : ""}`}
                            onClick={() => toggleMark(key)}
                          >
                            {state.marks[key] ? "×" : ""}
                          </td>
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

function download(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
