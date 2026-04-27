"use client";

import React, { useState } from "react";
import Select from "@/app/components/Select";

const STORAGE_KEY = "trialgrids_tt_v2";

function uid() { return Math.random().toString(36).slice(2, 9); }

function addMinutes(hhmm: string, mins: number): string {
  const [h, m] = hhmm.split(":").map(Number);
  const t = h * 60 + m + mins;
  return `${String(Math.floor(t / 60) % 24).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
}

function fmtDate(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 4) return `${d.slice(0, 2)}.${d.slice(2)}`;
  return `${d.slice(0, 2)}.${d.slice(2, 4)}.${d.slice(4)}`;
}

function isStaggered(time: string): boolean {
  return /^\d{2}:\d{2}$/.test(time.trim());
}

function fmtTime(raw: string): string {
  if (raw.includes("-")) return raw; // range like 07:00-07:30, leave as-is
  const d = raw.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

interface StudyInfo { clinicCode: string; pi: string; protocolCode: string; period: string; createdBy: string; createdDate: string; }
interface StudyDay { id: string; label: string; date: string; }
interface Procedure {
  id: string; label: string; dayId: string;
  time: string;
  ae: boolean; heparin: boolean; isIMP: boolean;
}
interface Config {
  info: StudyInfo; n: number; stations: number; interval: number;
  days: StudyDay[]; procedures: Procedure[];
  hasMissing: boolean; missing: number[];
  missingMode: "empty" | "shift";
}

const INITIAL: Config = {
  info: { clinicCode: "", pi: "", protocolCode: "", period: "", createdBy: "", createdDate: "" },
  n: 24, stations: 3, interval: 1,
  days: [{ id: "d1", label: "Day 1", date: "" }],
  procedures: [
    { id: "p0", label: "P1 Pre-dose", dayId: "d1", time: "07:00-07:30", ae: false, heparin: true, isIMP: false },
    { id: "p1", label: "IMP Administration", dayId: "d1", time: "08:00", ae: false, heparin: false, isIMP: true },
    { id: "p2", label: "P2", dayId: "d1", time: "08:10", ae: false, heparin: false, isIMP: false },
  ],
  hasMissing: false, missing: [], missingMode: "shift",
};

export default function TimeTablePage() {
  const [cfg, setCfg] = useState<Config>(INITIAL);
  const [built, setBuilt] = useState(false);
  const [missingRaw, setMissingRaw] = useState("");
  const [nRaw, setNRaw] = useState(String(INITIAL.n));
  const [stationsRaw, setStationsRaw] = useState(String(INITIAL.stations));
  const [intervalRaw, setIntervalRaw] = useState(String(INITIAL.interval));

  function save(next: Config) {
    setCfg(next);
    setBuilt(false);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  const perStation = Math.max(1, Math.ceil(cfg.n / cfg.stations));

  /**
   * Returns slot values for a station, length always = perStation.
   *   s > 0  : regular subject number
   *   s < 0  : replacement subject (abs value = replacement number, shown differently)
   *   null   : padding (station has fewer slots than perStation)
   *
   * Replacement numbering: missing subjects sorted ascending get N+1, N+2, …
   * Times are NOT affected by null/negative slots — they always show.
   */
  function getStationSlots(si: number): (number | null)[] {
    if (!cfg.hasMissing || !cfg.missing.length) {
      const base: (number | null)[] = [];
      for (let i = si; i < cfg.n; i += cfg.stations) base.push(i + 1);
      while (base.length < perStation) base.push(null);
      return base;
    }

    if (cfg.missingMode === "empty") {
      const base: (number | null)[] = [];
      for (let i = si; i < cfg.n; i += cfg.stations) base.push(i + 1);
      while (base.length < perStation) base.push(null);
      return base.map(s => (s !== null && cfg.missing.includes(s) ? null : s));
    }

    // shift: remove missing subjects from the full list, redistribute remaining
    const active: number[] = [];
    for (let i = 1; i <= cfg.n; i++) {
      if (!cfg.missing.includes(i)) active.push(i);
    }
    const slots: (number | null)[] = [];
    for (let i = si; i < active.length; i += cfg.stations) slots.push(active[i]);
    while (slots.length < perStation) slots.push(null);
    return slots;
  }

  const byDay = cfg.days.map(day => ({ day, procs: cfg.procedures.filter(p => p.dayId === day.id) }));
  const hasAE = cfg.procedures.some(p => p.ae);
  const hasH = cfg.procedures.some(p => p.heparin);

  function setInfo(k: keyof StudyInfo, v: string) { save({ ...cfg, info: { ...cfg.info, [k]: v } }); }
  function addDay() { save({ ...cfg, days: [...cfg.days, { id: uid(), label: `Day ${cfg.days.length + 1}`, date: "" }] }); }
  function removeDay(id: string) { save({ ...cfg, days: cfg.days.filter(d => d.id !== id), procedures: cfg.procedures.filter(p => p.dayId !== id) }); }
  function updateDay(id: string, k: keyof StudyDay, v: string) { save({ ...cfg, days: cfg.days.map(d => d.id === id ? { ...d, [k]: v } : d) }); }
  function addProc() {
    const last = cfg.procedures[cfg.procedures.length - 1];
    const pointCount = cfg.procedures.filter(p => !p.isIMP).length;
    save({ ...cfg, procedures: [...cfg.procedures, { id: uid(), label: `P${pointCount + 1}`, dayId: last?.dayId ?? cfg.days[0]?.id ?? "", time: "00:00", ae: false, heparin: false, isIMP: false }] });
  }
  function addIMP() {
    const last = cfg.procedures[cfg.procedures.length - 1];
    save({ ...cfg, procedures: [...cfg.procedures, { id: uid(), label: "IMP Administration", dayId: last?.dayId ?? cfg.days[0]?.id ?? "", time: "08:00", ae: false, heparin: false, isIMP: true }] });
  }
  function removeProc(id: string) { save({ ...cfg, procedures: cfg.procedures.filter(p => p.id !== id) }); }
  function updateProc(id: string, k: keyof Procedure, v: string | boolean) { save({ ...cfg, procedures: cfg.procedures.map(p => p.id === id ? { ...p, [k]: v } : p) }); }

  function applyMissing(raw: string) {
    const nums = raw.split(",").map(s => parseInt(s.trim())).filter(n => !isNaN(n) && n >= 1 && n <= cfg.n);
    save({ ...cfg, missing: nums });
  }

  // ── PDF ───────────────────────────────────────────────────────────────────
  async function exportPDF() {
    if (!built) { alert("Generate first."); return; }
    const { default: jsPDF } = await import("jspdf");
    const { default: autoTable } = await import("jspdf-autotable");

    // jsPDF built-in fonts are Latin-1 — transliterate Turkish chars so they render correctly
    function safe(s: string): string {
      return s
        .replace(/ş/g, "s").replace(/Ş/g, "S")
        .replace(/ğ/g, "g").replace(/Ğ/g, "G")
        .replace(/ı/g, "i").replace(/İ/g, "I")
        .replace(/ç/g, "c").replace(/Ç/g, "C")
        .replace(/ö/g, "o").replace(/Ö/g, "O")
        .replace(/ü/g, "u").replace(/Ü/g, "U");
    }

    const totalCols = 3 + perStation;
    const orientation: "portrait" | "landscape" = totalCols > 10 ? "landscape" : "portrait";
    const doc = new jsPDF({ orientation });
    const pageW = doc.internal.pageSize.width;
    const mL = 14; // left margin
    const mR = 14; // right margin
    let curY = 14;

    // ── Title ────────────────────────────────────────────────────────────────
    doc.setFont("times", "bold");
    doc.setFontSize(13);
    doc.text("TIME TABLE", pageW / 2, curY, { align: "center" });
    curY += 5;

    doc.setDrawColor(160, 158, 150);
    doc.setLineWidth(0.4);
    doc.line(mL, curY, pageW - mR, curY);
    curY += 4.5;

    // ── Study identifiers ────────────────────────────────────────────────────
    doc.setFont("courier", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(30, 30, 30);

    // Clinic Code left / Protocol Code centre-left / Period right
    const hasIdFields = cfg.info.clinicCode || cfg.info.protocolCode || cfg.info.period;
    if (hasIdFields) {
      const leftParts: string[] = [];
      if (cfg.info.clinicCode) leftParts.push(`Clinic Code: ${safe(cfg.info.clinicCode)}`);
      if (cfg.info.protocolCode) leftParts.push(`Protocol Code: ${safe(cfg.info.protocolCode)}`);
      if (leftParts.length) doc.text(leftParts.join("   |   "), mL, curY);
      if (cfg.info.period) doc.text(`Period: ${safe(cfg.info.period)}`, pageW - mR, curY, { align: "right" });
      curY += 5;
    }

    // Principal Investigator — dedicated line, bold label
    if (cfg.info.pi) {
      doc.setFont("courier", "bold");
      doc.text("Principal Investigator: ", mL, curY);
      const labelW = doc.getTextWidth("Principal Investigator: ");
      doc.setFont("courier", "normal");
      doc.text(safe(cfg.info.pi), mL + labelW, curY);
      curY += 5;
    }

    doc.setDrawColor(160, 158, 150);
    doc.line(mL, curY, pageW - mR, curY);
    curY += 4.5;

    // ── Study parameters ─────────────────────────────────────────────────────
    const pointCount = cfg.procedures.filter(p => !p.isIMP).length;
    const volunteers = cfg.n - (cfg.hasMissing ? cfg.missing.length : 0);
    const paramLine = `Volunteers: ${volunteers}   |   Stations: ${cfg.stations}   |   Points: ${pointCount}   |   Interval: ${cfg.interval} min`;
    doc.text(paramLine, pageW / 2, curY, { align: "center" });
    curY += 5;

    // Prepared by left — Date right
    if (cfg.info.createdBy || cfg.info.createdDate) {
      if (cfg.info.createdBy) doc.text(`Prepared by: ${safe(cfg.info.createdBy)}`, mL, curY);
      if (cfg.info.createdDate) doc.text(`Date: ${safe(cfg.info.createdDate)}`, pageW - mR, curY, { align: "right" });
      curY += 5;
    }

    doc.setDrawColor(160, 158, 150);
    doc.line(mL, curY, pageW - mR, curY);
    curY += 4;

    // ── Build IMP row set ────────────────────────────────────────────────────
    const impRowIndices = new Set<number>();
    {
      let rowIdx = 0;
      for (const { procs } of byDay) {
        if (!procs.length) continue;
        rowIdx++; // day header row
        for (const proc of procs) {
          if (proc.isIMP) impRowIndices.add(rowIdx);
          rowIdx++;
        }
      }
    }

    // ── Head: station rows with volunteer numbers explicitly centred ─────────
    type CellDef = string | { content: string; colSpan?: number; styles?: object };
    const head: CellDef[][] = Array.from({ length: cfg.stations }, (_, si) => {
      const slots = getStationSlots(si);
      return [
        { content: `Station ${si + 1}`, colSpan: 3, styles: { halign: "left", fontStyle: "bold" } },
        ...slots.map(s => ({
          content: s === null ? "" : String(s).padStart(2, "0"),
          styles: { halign: "center" },   // must match data-cell alignment exactly
        })),
      ];
    });

    // ── Body ─────────────────────────────────────────────────────────────────
    const colCount = 3 + perStation;
    const body: CellDef[][] = [];

    for (const { day, procs } of byDay) {
      if (!procs.length) continue;
      body.push([{
        content: safe(`${day.label}${day.date ? ` (${day.date})` : ""}`),
        colSpan: colCount,
        styles: { halign: "center", fontStyle: "bold", fillColor: [235, 235, 230] },
      }]);
      for (const proc of procs) {
        if (!isStaggered(proc.time)) {
          body.push([
            safe(proc.label),
            proc.ae ? "*" : "",
            proc.heparin ? "H" : "",
            { content: proc.time || "\u2014", colSpan: perStation, styles: { halign: "center", fontStyle: "italic" } },
          ]);
        } else {
          const times = Array.from({ length: perStation }, (_, i) => addMinutes(proc.time, i * cfg.interval));
          body.push([safe(proc.label), proc.ae ? "*" : "", proc.heparin ? "H" : "", ...times]);
        }
      }
    }

    const footnotes = [...(hasAE ? ["* AE Questioning"] : []), ...(hasH ? ["H: Heparin"] : [])];
    if (footnotes.length) {
      body.push([{
        content: footnotes.join("   |   "),
        colSpan: colCount,
        styles: { halign: "center", fontStyle: "italic", fontSize: 6, fillColor: [255, 255, 255] },
      }]);
    }

    // ── Column widths ─────────────────────────────────────────────────────────
    const usableW = pageW - mL - mR;
    // 42mm minimum ensures "IMP Administration" (18 chars @ 7pt Courier) always fits
    const labelW = Math.max(42, Math.min(55, usableW * 0.2));
    const markerW = 5.5;
    const dataColW = Math.max(10, (usableW - labelW - markerW * 2) / perStation);
    const columnStyles: Record<number, object> = {
      0: { cellWidth: labelW },
      1: { cellWidth: markerW, halign: "center" },
      2: { cellWidth: markerW, halign: "center" },
    };
    for (let i = 3; i < totalCols; i++) {
      columnStyles[i] = { cellWidth: dataColW, halign: "center" };
    }

    autoTable(doc, {
      head,
      body,
      startY: curY,
      margin: { left: mL, right: mR },
      styles: { font: "courier", fontSize: 7, cellPadding: 2, textColor: [20, 20, 20], fillColor: [255, 255, 255], overflow: "linebreak", halign: "center" },
      headStyles: { fillColor: [235, 235, 230], textColor: [20, 20, 20], fontStyle: "bold", halign: "center" },
      alternateRowStyles: { fillColor: [248, 247, 244] },
      tableLineColor: [180, 178, 170], tableLineWidth: 0.2,
      columnStyles,
      didParseCell(data) {
        if (data.section === "body" && impRowIndices.has(data.row.index)) {
          data.cell.styles.fontStyle = "bold";
          data.cell.styles.fontSize = 8;
          data.cell.styles.textColor = [10, 10, 10];
        }
      },
    });

    const total = doc.getNumberOfPages();
    for (let p = 1; p <= total; p++) {
      doc.setPage(p);
      doc.setFont("courier", "normal");
      doc.setFontSize(7);
      doc.setTextColor(140, 138, 128);
      doc.text(`Page ${p} / ${total}`, pageW - 14, doc.internal.pageSize.height - 8, { align: "right" });
      doc.text("trialgrids.com", 14, doc.internal.pageSize.height - 8);
    }

    doc.save("timetable.pdf");
  }

  // ── render ────────────────────────────────────────────────────────────────
  return (
    <main>
      <div className="hero">
        <div>
          <p className="eyebrow">
            Schedule of assessments &amp; study time tables
          </p>
          <h1>Time table.</h1>
          <p className="lede">
            Build SPIRIT-compliant schedule of assessments and study day time tables for clinical trials, bioequivalence, and bioavailability studies. Design visits, procedures, and time-windows — then export publication-ready PDFs and tables. Everything runs in your browser; your data never leaves this device.
          </p>
        </div>
        <div className="meta">tool 02<br />station × procedure<br />clinical schedule</div>
      </div>

      {/* Study Info */}
      <div className="panel">
        <div className="panel-head"><h2>Study Info</h2><span className="tag">optional</span></div>
        <div className="panel-body">
          <div className="controls">
            <div>
              <label>Clinic Code</label>
              <input type="text" value={cfg.info.clinicCode} onChange={e => setInfo("clinicCode", e.target.value)} />
            </div>
            <div>
              <label>Principal Investigator</label>
              <input type="text" value={cfg.info.pi} onChange={e => setInfo("pi", e.target.value)} />
            </div>
            <div>
              <label>Protocol Code</label>
              <input type="text" value={cfg.info.protocolCode} onChange={e => setInfo("protocolCode", e.target.value)} />
            </div>
            <div>
              <label>Period</label>
              <input type="text" value={cfg.info.period} onChange={e => setInfo("period", e.target.value)} />
            </div>
            <div>
              <label>Prepared by</label>
              <input type="text" value={cfg.info.createdBy} onChange={e => setInfo("createdBy", e.target.value)} />
            </div>
            <div>
              <label>Date</label>
              <input type="text" placeholder="dd.mm.yyyy" value={cfg.info.createdDate}
                onChange={e => setInfo("createdDate", fmtDate(e.target.value))} />
            </div>
          </div>
        </div>
      </div>

      {/* Parameters */}
      <div className="panel">
        <div className="panel-head"><h2>Parameters</h2><span className="tag">required</span></div>
        <div className="panel-body">
          <div className="controls" style={{ marginBottom: "1.5rem" }}>
            <div>
              <label>Total subjects (Volunteer)</label>
              <input
                type="text"
                inputMode="numeric"
                value={nRaw}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setNRaw(raw);
                  const num = parseInt(raw);
                  if (!isNaN(num) && num >= 1 && num <= 500) save({ ...cfg, n: num });
                }}
                onBlur={() => {
                  const num = parseInt(nRaw);
                  if (isNaN(num) || num < 1) setNRaw(String(cfg.n));
                }}
              />
            </div>
            <div>
              <label>Stations</label>
              <input
                type="text"
                inputMode="numeric"
                value={stationsRaw}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setStationsRaw(raw);
                  const num = parseInt(raw);
                  if (!isNaN(num) && num >= 1 && num <= 20) save({ ...cfg, stations: num });
                }}
                onBlur={() => {
                  const num = parseInt(stationsRaw);
                  if (isNaN(num) || num < 1) setStationsRaw(String(cfg.stations));
                }}
              />
            </div>
            <div>
              <label>Minute interval</label>
              <input
                type="text"
                inputMode="numeric"
                value={intervalRaw}
                onChange={e => {
                  const raw = e.target.value.replace(/[^0-9]/g, "");
                  setIntervalRaw(raw);
                  const num = parseInt(raw);
                  if (!isNaN(num) && num >= 1 && num <= 60) save({ ...cfg, interval: num });
                }}
                onBlur={() => {
                  const num = parseInt(intervalRaw);
                  if (isNaN(num) || num < 1) setIntervalRaw(String(cfg.interval));
                }}
              />
            </div>
          </div>

          {/* Missing subjects */}
          <div style={{ borderTop: "1px solid var(--rule)", paddingTop: "1.2rem" }}>
            <div style={{ marginBottom: ".75rem" }}>
              <label>Missing subjects?</label>
              <div className="method-toggle">
                <button className={`method-btn${!cfg.hasMissing ? " active" : ""}`} onClick={() => save({ ...cfg, hasMissing: false, missing: [] })}>No</button>
                <button className={`method-btn${cfg.hasMissing ? " active" : ""}`} onClick={() => save({ ...cfg, hasMissing: true })}>Yes</button>
              </div>
            </div>
            {cfg.hasMissing && (
              <div style={{ display: "flex", flexDirection: "column", gap: ".75rem" }}>
                <div>
                  <label>Subject numbers (comma-separated)</label>
                  <input type="text" placeholder="Separate with commas: 6, 14, 22" value={missingRaw}
                    onChange={e => { setMissingRaw(e.target.value); applyMissing(e.target.value); }} />
                </div>
                {cfg.missing.length > 0 && (
                  <div>
                    <label>What to do with the missing slot?</label>
                    <div className="method-toggle">
                      <button className={`method-btn${cfg.missingMode === "empty" ? " active" : ""}`}
                        onClick={() => save({ ...cfg, missingMode: "empty" })}>Leave empty</button>
                      <button className={`method-btn${cfg.missingMode === "shift" ? " active" : ""}`}
                        onClick={() => save({ ...cfg, missingMode: "shift" })}>Shift forward</button>
                    </div>
                    <div style={{ marginTop: ".5rem", fontSize: ".72rem", fontFamily: "var(--font-jetbrains-mono)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
                      {cfg.missingMode === "empty"
                        ? "Missing slot appears blank — time position still reserved"
                        : "Subjects after the missing one shift up — last slot becomes empty"}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Study Days */}
      <div className="panel">
        <div className="panel-head"><h2>Study Days</h2><span className="tag">{cfg.days.length} day{cfg.days.length !== 1 ? "s" : ""}</span></div>
        <div className="panel-body">
          {cfg.days.map(day => (
            <div key={day.id} style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: ".75rem", alignItems: "flex-end", marginBottom: ".75rem" }}>
              <div>
                <label>Label</label>
                <input type="text" value={day.label} onChange={e => updateDay(day.id, "label", e.target.value)} />
              </div>
              <div>
                <label>Date (optional)</label>
                <input type="text" placeholder="dd.mm.yyyy" value={day.date}
                  onChange={e => updateDay(day.id, "date", fmtDate(e.target.value))} />
              </div>
              <button className="btn ghost" style={{ padding: ".55rem .8rem" }} disabled={cfg.days.length === 1} onClick={() => removeDay(day.id)}>×</button>
            </div>
          ))}
          <div className="btn-row">
            <button className="btn ghost" onClick={addDay}>+ Add day</button>
          </div>
        </div>
      </div>

      {/* Procedures */}
      <div className="panel">
        <div className="panel-head"><h2>Procedures</h2><span className="tag">{cfg.procedures.length} procedures</span></div>
        <div className="panel-body">
          <div className="tt-proc-grid tt-proc-header" style={{ marginBottom: ".5rem" }}>
            <label style={{ marginBottom: 0 }}>Label</label>
            <label style={{ marginBottom: 0 }}>Day</label>
            <label style={{ marginBottom: 0 }}>Time / Range</label>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".1em", color: "var(--muted)" }}>AE</span>
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".1em", color: "var(--muted)" }}>H</span>
            </div>
            <div style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
              <span style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".1em", color: "var(--muted)" }}>IMP</span>
            </div>
            <div />
          </div>
          {cfg.procedures.map(proc => (
            <div key={proc.id} className="tt-proc-grid" style={{ marginBottom: ".5rem" }}>
              <input type="text" value={proc.label} onChange={e => updateProc(proc.id, "label", e.target.value)} />
              <Select
                value={proc.dayId}
                onChange={v => updateProc(proc.id, "dayId", v)}
                options={cfg.days.map(d => ({ value: d.id, label: d.label }))}
              />
              <input
                type="text"
                placeholder="HH:MM or 07:00-07:30"
                value={proc.time}
                data-timeinput="true"
                onChange={e => updateProc(proc.id, "time", fmtTime(e.target.value))}
                onKeyDown={e => {
                  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
                  e.preventDefault();
                  const all = Array.from(document.querySelectorAll<HTMLInputElement>("[data-timeinput]"));
                  const idx = all.indexOf(e.currentTarget);
                  const next = e.key === "ArrowDown" ? all[idx + 1] : all[idx - 1];
                  if (next) { next.focus(); next.select(); }
                }}
              />
              {(["ae", "heparin", "isIMP"] as (keyof Procedure)[]).map(k => (
                <div key={k} style={{ display: "flex", justifyContent: "center", alignItems: "center" }}>
                  <input type="checkbox" checked={proc[k] as boolean}
                    onChange={e => updateProc(proc.id, k, e.target.checked)}
                    style={{ width: "auto", cursor: "pointer", accentColor: k === "ae" ? "var(--accent-2)" : k === "heparin" ? "var(--accent)" : "var(--ink)" }} />
                </div>
              ))}
              <button className="btn ghost" style={{ padding: ".4rem", width: "2rem", textAlign: "center" }} onClick={() => removeProc(proc.id)}>×</button>
            </div>
          ))}
          <div style={{ marginTop: ".75rem", fontSize: ".72rem", fontFamily: "var(--font-jetbrains-mono)", color: "var(--muted)", textTransform: "uppercase", letterSpacing: ".05em" }}>
            AE = AE Questioning &nbsp;·&nbsp; H = Heparin &nbsp;·&nbsp; IMP = Drug administration &nbsp;·&nbsp; range text → fixed row
          </div>
          <div className="btn-row">
            <button className="btn ghost" onClick={addProc}>+ Add blood sampling point</button>
            <button className="btn ghost" onClick={addIMP}>+ Add IMP administration</button>
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
          <div className="panel-head"><h2>Time Table</h2><span className="tag">generated</span></div>
          <div className="panel-body" style={{ padding: 0 }}>
            <div className="result" style={{ margin: 0 }}>
              <table>
                <thead>
                  {Array.from({ length: cfg.stations }, (_, si) => (
                    <tr key={si}>
                      <th colSpan={3} style={{ textAlign: "left" }}>Station {si + 1}</th>
                      {getStationSlots(si).map((s, i) => {
                        if (s === null) return <th key={i} />;
                        return <th key={i}>{String(s).padStart(2, "0")}</th>;
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {byDay.map(({ day, procs }) => {
                    if (!procs.length) return null;
                    return (
                      <React.Fragment key={day.id}>
                        <tr>
                          <td colSpan={3 + perStation} style={{ textAlign: "center", fontFamily: "var(--font-fraunces), serif", fontWeight: 600, fontSize: ".9rem", background: "var(--paper-2)", borderTop: "2px solid var(--rule)" }}>
                            {day.label}{day.date ? ` (${day.date})` : ""}
                          </td>
                        </tr>
                        {procs.map(proc => (
                          <tr key={proc.id}>
                            <td style={proc.isIMP ? { fontWeight: 700, fontSize: ".88rem" } : {}}>
                              {proc.label}
                            </td>
                            <td style={{ textAlign: "center", color: "var(--accent-2)", fontWeight: 700 }}>{proc.ae ? "*" : ""}</td>
                            <td style={{ textAlign: "center", color: "var(--accent)", fontWeight: 700 }}>{proc.heparin ? "H" : ""}</td>
                            {!isStaggered(proc.time)
                              ? <td colSpan={perStation} style={{ textAlign: "center", color: "var(--muted)", fontStyle: "italic" }}>{proc.time || "—"}</td>
                              : Array.from({ length: perStation }, (_, i) => (
                                <td key={i} style={
                                  proc.isIMP
                                    ? { fontWeight: 700, fontSize: ".88rem", color: "var(--ink)" }
                                    : { color: "var(--muted)" }
                                }>
                                  {addMinutes(proc.time, i * cfg.interval)}
                                </td>
                              ))
                            }
                          </tr>
                        ))}
                      </React.Fragment>
                    );
                  })}
                  {(hasAE || hasH) && (
                    <tr>
                      <td colSpan={3 + perStation} style={{ textAlign: "center", fontSize: ".72rem", color: "var(--muted)", fontStyle: "italic", borderTop: "1px solid var(--rule)", padding: ".6rem" }}>
                        {[hasAE && "* AE Questioning", hasH && "H: Heparin"].filter(Boolean).join("   ·   ")}
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
