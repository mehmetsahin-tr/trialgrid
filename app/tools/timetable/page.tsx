"use client";

import React, { useEffect, useState } from "react";

const STORAGE_KEY = "trialgrid_tt_v2";

function uid() {
  return Math.random().toString(36).slice(2, 9);
}

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const t = h * 60 + m + mins;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

interface StudyInfo {
  clinicCode: string;
  pi: string;
  protocolCode: string;
  period: string;
}

interface StudyDay {
  id: string;
  label: string;
  date: string;
}

interface Procedure {
  id: string;
  label: string;
  dayId: string;
  startTime: string;
  ae: boolean;
  isIMP: boolean;
}

interface Config {
  info: StudyInfo;
  n: number;
  stations: number;
  interval: number;
  days: StudyDay[];
  procedures: Procedure[];
}

const INITIAL: Config = {
  info: { clinicCode: "", pi: "", protocolCode: "", period: "" },
  n: 30,
  stations: 3,
  interval: 1,
  days: [{ id: "d1", label: "Day 1", date: "" }],
  procedures: [
    { id: "p1", label: "P1 — IMP Administration", dayId: "d1", startTime: "08:00", ae: false, isIMP: true },
    { id: "p2", label: "P2", dayId: "d1", startTime: "08:10", ae: false, isIMP: false },
  ],
};

export default function TimeTablePage() {
  const [cfg, setCfg] = useState<Config>(INITIAL);
  const [built, setBuilt] = useState(false);

  useEffect(() => {
    try {
      const s = localStorage.getItem(STORAGE_KEY);
      if (s) setCfg(JSON.parse(s));
    } catch {}
  }, []);

  function save(next: Config) {
    setCfg(next);
    setBuilt(false);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  const perStation = Math.max(1, Math.ceil(cfg.n / cfg.stations));

  function stationSubjects(si: number): number[] {
    const out: number[] = [];
    for (let i = si; i < cfg.n; i += cfg.stations) out.push(i + 1);
    return out;
  }

  function procTimes(proc: Procedure): string[] {
    return Array.from({ length: perStation }, (_, i) =>
      addMinutes(proc.startTime, i * cfg.interval)
    );
  }

  const byDay = cfg.days.map((day) => ({
    day,
    procs: cfg.procedures.filter((p) => p.dayId === day.id),
  }));

  const hasAE = cfg.procedures.some((p) => p.ae);

  // ── handlers ──────────────────────────────────────────────
  function setInfo(k: keyof StudyInfo, v: string) {
    save({ ...cfg, info: { ...cfg.info, [k]: v } });
  }

  function addDay() {
    save({ ...cfg, days: [...cfg.days, { id: uid(), label: `Day ${cfg.days.length + 1}`, date: "" }] });
  }

  function removeDay(id: string) {
    save({ ...cfg, days: cfg.days.filter((d) => d.id !== id), procedures: cfg.procedures.filter((p) => p.dayId !== id) });
  }

  function updateDay(id: string, k: keyof StudyDay, v: string) {
    save({ ...cfg, days: cfg.days.map((d) => d.id === id ? { ...d, [k]: v } : d) });
  }

  function addProc() {
    const last = cfg.procedures[cfg.procedures.length - 1];
    save({
      ...cfg,
      procedures: [
        ...cfg.procedures,
        {
          id: uid(),
          label: `P${cfg.procedures.length + 1}`,
          dayId: last?.dayId ?? cfg.days[0]?.id ?? "",
          startTime: last ? addMinutes(last.startTime, 10) : "08:00",
          ae: false,
          isIMP: false,
        },
      ],
    });
  }

  function removeProc(id: string) {
    save({ ...cfg, procedures: cfg.procedures.filter((p) => p.id !== id) });
  }

  function updateProc(id: string, k: keyof Procedure, v: string | boolean) {
    save({ ...cfg, procedures: cfg.procedures.map((p) => p.id === id ? { ...p, [k]: v } : p) });
  }

  // ── PDF export ─────────────────────────────────────────────
  async function exportPDF() {
    if (!built) { alert("Generate first."); return; }
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    const doc = new jsPDF({ orientation: "landscape" });
    const pageW = doc.internal.pageSize.width;

    // Title
    doc.setFont("times", "bold");
    doc.setFontSize(12);
    doc.text("TIME TABLE", pageW / 2, 14, { align: "center" });
    doc.setFont("courier", "normal");
    doc.setFontSize(7);
    const parts = [
      cfg.info.clinicCode && `Clinic: ${cfg.info.clinicCode}`,
      cfg.info.pi && `PI: ${cfg.info.pi}`,
      cfg.info.protocolCode && `Protocol: ${cfg.info.protocolCode}`,
      cfg.info.period && `Period: ${cfg.info.period}`,
      `N = ${cfg.n}`,
      `Stations: ${cfg.stations}`,
      `Subjects/Station: ${perStation}`,
      `Interval: ${cfg.interval} min`,
    ].filter(Boolean);
    doc.text(parts.join("  ·  "), pageW / 2, 20, { align: "center" });

    // Station assignment
    autoTable(doc, {
      head: [["", ...Array.from({ length: perStation }, (_, i) => String(i + 1))]],
      body: Array.from({ length: cfg.stations }, (_, si) => [
        `Station ${si + 1}`,
        ...stationSubjects(si).map((s) => String(s).padStart(2, "0")),
        ...Array(perStation - stationSubjects(si).length).fill(""),
      ]),
      startY: 24,
      styles: { font: "courier", fontSize: 7, cellPadding: 1.5, textColor: [20, 20, 20], fillColor: [255, 255, 255] },
      headStyles: { fillColor: [235, 235, 230], textColor: [20, 20, 20], fontStyle: "bold" },
      tableLineColor: [180, 178, 170],
      tableLineWidth: 0.2,
    });

    // Time table
    type BodyRow = (string | { content: string; colSpan: number; styles: object })[];
    const body: BodyRow[] = [];

    for (const { day, procs } of byDay) {
      if (!procs.length) continue;
      body.push([{
        content: `${day.label}${day.date ? ` (${day.date})` : ""}`,
        colSpan: 2 + perStation,
        styles: { halign: "center", fontStyle: "bold", fillColor: [235, 235, 230] },
      }]);
      for (const proc of procs) {
        body.push([proc.label, proc.ae ? "*" : "", ...procTimes(proc)]);
      }
    }

    if (hasAE) {
      body.push([{
        content: "* AE Questioning",
        colSpan: 2 + perStation,
        styles: { halign: "center", fontStyle: "italic", fontSize: 6, fillColor: [255, 255, 255] },
      }]);
    }

    const startY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 5;

    autoTable(doc, {
      head: [["Procedure", "*", ...Array.from({ length: perStation }, (_, i) => String(i + 1))]],
      body,
      startY,
      styles: { font: "courier", fontSize: 7, cellPadding: 1.5, textColor: [20, 20, 20], fillColor: [255, 255, 255] },
      headStyles: { fillColor: [235, 235, 230], textColor: [20, 20, 20], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 247, 244] },
      tableLineColor: [180, 178, 170],
      tableLineWidth: 0.2,
    });

    // Page numbers
    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      doc.setTextColor(140, 138, 128);
      doc.text(`Page ${p} / ${total}`, pageW - 14, doc.internal.pageSize.height - 8, { align: "right" });
    }

    doc.save("timetable.pdf");
  }

  // ── render ─────────────────────────────────────────────────
  return (
    <main>
      <div className="hero">
        <h1>Time table.</h1>
        <div className="meta">
          tool 02<br />
          station × procedure<br />
          clinical schedule
        </div>
      </div>

      {/* Study Info */}
      <div className="panel">
        <div className="panel-head">
          <h2>Study Info</h2>
          <span className="tag">optional</span>
        </div>
        <div className="panel-body">
          <div className="controls">
            {(["clinicCode", "pi", "protocolCode", "period"] as (keyof StudyInfo)[]).map((k) => (
              <div key={k}>
                <label>{k === "clinicCode" ? "Clinic Code" : k === "pi" ? "PI" : k === "protocolCode" ? "Protocol Code" : "Period"}</label>
                <input type="text" value={cfg.info[k]} onChange={(e) => setInfo(k, e.target.value)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Parameters */}
      <div className="panel">
        <div className="panel-head">
          <h2>Parameters</h2>
          <span className="tag">required</span>
        </div>
        <div className="panel-body">
          <div className="controls">
            <div>
              <label>Total subjects (N)</label>
              <input type="number" min={1} max={500} value={cfg.n}
                onChange={(e) => save({ ...cfg, n: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <label>Stations</label>
              <input type="number" min={1} max={20} value={cfg.stations}
                onChange={(e) => save({ ...cfg, stations: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <label>Minute interval</label>
              <input type="number" min={1} max={60} value={cfg.interval}
                onChange={(e) => save({ ...cfg, interval: parseInt(e.target.value) || 1 })} />
            </div>
            <div>
              <label>Subjects / station</label>
              <input readOnly value={perStation}
                style={{ background: "var(--paper-2)", color: "var(--muted)", cursor: "default" }} />
            </div>
          </div>
        </div>
      </div>

      {/* Study Days */}
      <div className="panel">
        <div className="panel-head">
          <h2>Study Days</h2>
          <span className="tag">{cfg.days.length} day{cfg.days.length !== 1 ? "s" : ""}</span>
        </div>
        <div className="panel-body">
          {cfg.days.map((day) => (
            <div key={day.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: ".75rem", alignItems: "flex-end", marginBottom: ".75rem" }}>
              <div>
                <label>Label</label>
                <input type="text" value={day.label} onChange={(e) => updateDay(day.id, "label", e.target.value)} />
              </div>
              <div>
                <label>Date (optional)</label>
                <input type="text" placeholder="dd.mm.yyyy" value={day.date} onChange={(e) => updateDay(day.id, "date", e.target.value)} />
              </div>
              <button className="btn ghost" style={{ padding: ".55rem .8rem" }}
                disabled={cfg.days.length === 1}
                onClick={() => removeDay(day.id)}>×</button>
            </div>
          ))}
          <div className="btn-row">
            <button className="btn ghost" onClick={addDay}>+ Add day</button>
          </div>
        </div>
      </div>

      {/* Procedures */}
      <div className="panel">
        <div className="panel-head">
          <h2>Procedures</h2>
          <span className="tag">{cfg.procedures.length} procedures</span>
        </div>
        <div className="panel-body">
          <div className="tt-proc-grid tt-proc-header">
            <label style={{ marginBottom: 0 }}>Label</label>
            <label style={{ marginBottom: 0 }}>Day</label>
            <label style={{ marginBottom: 0 }}>Start time</label>
            <label style={{ marginBottom: 0, textAlign: "center" }}>AE</label>
            <label style={{ marginBottom: 0, textAlign: "center" }}>IMP</label>
            <div />
          </div>
          {cfg.procedures.map((proc) => (
            <div key={proc.id} className="tt-proc-grid" style={{ marginBottom: ".5rem" }}>
              <input type="text" value={proc.label} onChange={(e) => updateProc(proc.id, "label", e.target.value)} />
              <select value={proc.dayId} onChange={(e) => updateProc(proc.id, "dayId", e.target.value)}>
                {cfg.days.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
              <input type="time" value={proc.startTime} onChange={(e) => updateProc(proc.id, "startTime", e.target.value)} />
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <input type="checkbox" checked={proc.ae} onChange={(e) => updateProc(proc.id, "ae", e.target.checked)}
                  style={{ width: "auto", cursor: "pointer", accentColor: "var(--accent-2)" }} />
              </div>
              <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                <input type="checkbox" checked={proc.isIMP} onChange={(e) => updateProc(proc.id, "isIMP", e.target.checked)}
                  style={{ width: "auto", cursor: "pointer", accentColor: "var(--accent)" }} />
              </div>
              <button className="btn ghost" style={{ padding: ".4rem .6rem" }}
                onClick={() => removeProc(proc.id)}>×</button>
            </div>
          ))}
          <div className="btn-row">
            <button className="btn ghost" onClick={addProc}>+ Add procedure</button>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="btn-row" style={{ marginBottom: "2rem" }}>
        <button className="btn" onClick={() => setBuilt(true)}>Generate</button>
        {built && <button className="btn ghost" onClick={exportPDF}>Export PDF</button>}
      </div>

      {/* Generated table */}
      {built && (
        <div className="panel">
          <div className="panel-head">
            <h2>Time Table</h2>
            <span className="tag">generated</span>
          </div>
          <div className="panel-body" style={{ padding: 0 }}>
            <div className="result" style={{ margin: 0 }}>
              <table>
                <thead>
                  {Array.from({ length: cfg.stations }, (_, si) => (
                    <tr key={si}>
                      <th style={{ textAlign: "left", minWidth: 160 }}>Station {si + 1}</th>
                      <th style={{ minWidth: 24 }} />
                      {stationSubjects(si).map((s) => (
                        <th key={s}>{String(s).padStart(2, "0")}</th>
                      ))}
                      {Array.from({ length: perStation - stationSubjects(si).length }, (_, i) => (
                        <th key={`pad${i}`} />
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {byDay.map(({ day, procs }) => {
                    if (!procs.length) return null;
                    return (
                      <React.Fragment key={day.id}>
                        <tr>
                          <td colSpan={2 + perStation} style={{
                            textAlign: "center",
                            fontFamily: "var(--font-fraunces), serif",
                            fontWeight: 600,
                            fontSize: ".9rem",
                            background: "var(--paper-2)",
                            borderTop: "2px solid var(--rule)",
                          }}>
                            {day.label}{day.date ? ` (${day.date})` : ""}
                          </td>
                        </tr>
                        {procs.map((proc) => (
                          <tr key={proc.id} style={proc.isIMP ? { background: "var(--paper-2)" } : {}}>
                            <td style={{ fontWeight: proc.isIMP ? 600 : 400 }}>{proc.label}</td>
                            <td style={{ color: "var(--accent-2)", textAlign: "center", fontWeight: 600 }}>
                              {proc.ae ? "*" : ""}
                            </td>
                            {procTimes(proc).map((t, i) => (
                              <td key={i} style={{ color: "var(--muted)" }}>{t}</td>
                            ))}
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  {hasAE && (
                    <tr>
                      <td colSpan={2 + perStation} style={{
                        textAlign: "center",
                        fontSize: ".72rem",
                        color: "var(--muted)",
                        fontStyle: "italic",
                        borderTop: "1px solid var(--rule)",
                      }}>
                        * AE Questioning
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
