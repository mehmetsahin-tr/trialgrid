"use client";

import { useState } from "react";
import Select from "@/app/components/Select";

const STORAGE_KEY = "trialgrids_meal_log_v2";
const ADD_CUSTOM_VALUE = "__add_custom__";

const STANDARD_MEALS = [
  "Day 0 Dinner",
  "Day 1 Breakfast",
  "Day 1 Lunch",
  "Day 1 Dinner",
];

function fmtTime(raw: string): string {
  if (raw.includes("-")) return raw;
  const d = raw.replace(/\D/g, "").slice(0, 4);
  if (d.length <= 2) return d;
  return `${d.slice(0, 2)}:${d.slice(2)}`;
}

function subjectId(i: number): string {
  return String(i + 1).padStart(3, "0");
}

function timeValid(start: string, end: string): boolean {
  if (!start || !end || start.length < 5 || end.length < 5) return true;
  const toMin = (t: string) => { const [h, m] = t.split(":").map(Number); return h * 60 + m; };
  return toMin(end) >= toMin(start);
}

function parseSubjectList(raw: string): number[] {
  const result = new Set<number>();
  raw.split(",").forEach(part => {
    const n = parseInt(part.trim());
    if (!isNaN(n) && n >= 1) result.add(n - 1);
  });
  return Array.from(result).sort((a, b) => a - b);
}

interface StudyInfo {
  studyCode: string;
  clinicCode: string;
  preparedBy: string;
  hallName: string;
  singleHall: boolean;
  multiHallName: string;
  multiHallPreparedBy: string;
  multiHallSubjectsRaw: string;
}

interface SubjectMealEntry { startTime: string; endTime: string; completed: boolean; note: string; }
type DropoutMap = Record<number, string>;
type EntryMap = Record<string, Record<number, SubjectMealEntry>>;

interface State {
  info: StudyInfo;
  nSubjects: number;
  nSubjectsRaw: string;
  nPeriods: number;
  nPeriodsRaw: string;
  periodLabels: string[];
  customMeals: Record<number, string[]>;
  entries: EntryMap;
  dropouts: DropoutMap;
  activeMeal: string;
}

function buildPeriodLabels(count: number, existing: string[]): string[] {
  return Array.from({ length: count }, (_, i) => existing[i] ?? `Period ${i + 1}`);
}

function getMealKeys(periodIdx: number, periodLabels: string[], customMeals: Record<number, string[]>): string[] {
  const label = periodLabels[periodIdx] ?? `Period ${periodIdx + 1}`;
  const keys: string[] = [];
  STANDARD_MEALS.forEach(m => keys.push(`${label}|||${m}`));
  (customMeals[periodIdx] ?? []).forEach(m => keys.push(`${label}|||${m}`));
  return keys;
}

function mealLabel(key: string): string {
  const [, meal] = key.split("|||");
  return meal;
}

function fullMealLabel(key: string): string {
  const [period, meal] = key.split("|||");
  return `${period} — ${meal}`;
}

function isDroppedAtOrBefore(
  subjectIdx: number,
  mealKey: string,
  dropouts: DropoutMap,
  allKeys: string[]
): { dropped: boolean; at: string | undefined } {
  const dropKey = dropouts[subjectIdx];
  if (!dropKey) return { dropped: false, at: undefined };
  const dropIdx = allKeys.indexOf(dropKey);
  const curIdx = allKeys.indexOf(mealKey);
  return { dropped: curIdx >= dropIdx, at: dropKey };
}

const INITIAL_STATE: State = {
  info: {
    studyCode: "", clinicCode: "", preparedBy: "", hallName: "",
    singleHall: true,
    multiHallName: "", multiHallPreparedBy: "", multiHallSubjectsRaw: "",
  },
  nSubjects: 24,
  nSubjectsRaw: "",
  nPeriods: 1,
  nPeriodsRaw: "",
  periodLabels: ["Period 1", "Period 2", "Period 3", "Period 4"],
  customMeals: {},
  entries: {},
  dropouts: {},
  activeMeal: "",
};

export default function MealLogPage() {
  const [state, setState] = useState<State>(INITIAL_STATE);
  const [customInput, setCustomInput] = useState("");
  const [addingCustom, setAddingCustom] = useState(false);
  const [periodsWarning, setPeriodsWarning] = useState(false);

  function save(next: State) {
    setState(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch {}
  }

  function setInfo(field: keyof StudyInfo, val: string | boolean) {
    save({ ...state, info: { ...state.info, [field]: val } });
  }

  function setNSubjects(raw: string) {
    const cleaned = raw.replace(/[^0-9]/g, "");
    const num = parseInt(cleaned);
    const next = { ...state, nSubjectsRaw: cleaned };
    if (!isNaN(num) && num >= 1 && num <= 200) next.nSubjects = num;
    save(next);
  }

  function setNPeriods(raw: string) {
    const digits = raw.replace(/[^0-9]/g, "");
    if (digits.length > 1 || parseInt(digits) > 4) { setPeriodsWarning(true); return; }
    setPeriodsWarning(false);
    const num = parseInt(digits);
    const next = { ...state, nPeriodsRaw: digits };
    if (!isNaN(num) && num >= 1 && num <= 4) {
      next.nPeriods = num;
      next.activeMeal = "";
      if (state.periodLabels.length < 4) next.periodLabels = buildPeriodLabels(4, state.periodLabels);
    }
    save(next);
  }

  function getEntry(mealKey: string, si: number): SubjectMealEntry {
    return state.entries[mealKey]?.[si] ?? { startTime: "", endTime: "", completed: false, note: "" };
  }

  function setEntry(mealKey: string, si: number, patch: Partial<SubjectMealEntry>) {
    const prev = getEntry(mealKey, si);
    const entries: EntryMap = {
      ...state.entries,
      [mealKey]: { ...(state.entries[mealKey] ?? {}), [si]: { ...prev, ...patch } },
    };
    save({ ...state, entries });
  }

  function dropout(si: number, mealKey: string) {
    save({ ...state, dropouts: { ...state.dropouts, [si]: mealKey } });
  }

  function undropout(si: number) {
    const d = { ...state.dropouts };
    delete d[si];
    save({ ...state, dropouts: d });
  }

  const periodIdx = state.nPeriods - 1;

  function addCustomMeal() {
    const name = customInput.trim();
    if (!name) return;
    const existing = state.customMeals[periodIdx] ?? [];
    if (existing.includes(name)) return;
    const newCustomMeals = { ...state.customMeals, [periodIdx]: [...existing, name] };
    const label = state.periodLabels[periodIdx] ?? `Period ${state.nPeriods}`;
    const newKey = `${label}|||${name}`;
    save({ ...state, customMeals: newCustomMeals, activeMeal: newKey });
    setCustomInput("");
    setAddingCustom(false);
  }

  function removeCustomMeal(name: string) {
    const existing = state.customMeals[periodIdx] ?? [];
    save({ ...state, customMeals: { ...state.customMeals, [periodIdx]: existing.filter(m => m !== name) } });
  }

  function applyHourToAll(mealKey: string, time: string) {
    const hour = time.slice(0, 2);
    const updated: Record<number, SubjectMealEntry> = { ...(state.entries[mealKey] ?? {}) };
    activeSubjects.forEach(si => {
      const prev = updated[si] ?? { startTime: "", endTime: "", completed: false, note: "" };
      if (!prev.startTime) updated[si] = { ...prev, startTime: hour };
    });
    save({ ...state, entries: { ...state.entries, [mealKey]: updated } });
  }

  const mealKeys = getMealKeys(periodIdx, state.periodLabels, state.customMeals);
  const activeMeal = state.activeMeal && mealKeys.includes(state.activeMeal) ? state.activeMeal : "";

  const activeSubjects: number[] = state.info.singleHall
    ? Array.from({ length: state.nSubjects }, (_, i) => i)
    : parseSubjectList(state.info.multiHallSubjectsRaw);

  const subjectPreviewText = !state.info.singleHall && activeSubjects.length > 0
    ? `${activeSubjects.length} subject${activeSubjects.length > 1 ? "s" : ""}: ${activeSubjects.slice(0, 6).map(i => subjectId(i)).join(", ")}${activeSubjects.length > 6 ? ` … ${subjectId(activeSubjects[activeSubjects.length - 1])}` : ""}`
    : !state.info.singleHall && state.info.multiHallSubjectsRaw ? "No valid subjects" : "";

  function handleMealSelect(val: string) {
    if (val === ADD_CUSTOM_VALUE) {
      setAddingCustom(true);
      setCustomInput("");
    } else {
      setAddingCustom(false);
      save({ ...state, activeMeal: val });
    }
  }

  function focusCell(si: number, col: string) {
    const el = document.querySelector(`[data-row="${si}"][data-col="${col}"]`) as HTMLElement | null;
    el?.focus();
  }

  function adjacentSubject(si: number, dir: 1 | -1): number | null {
    const pos = activeSubjects.indexOf(si);
    if (pos === -1) return null;
    const next = activeSubjects[pos + dir];
    return next !== undefined ? next : null;
  }

  const firstFilled = activeMeal
    ? activeSubjects.map(i => ({ si: i, time: getEntry(activeMeal, i).startTime }))
        .find(x => x.time.length === 5) ?? null
    : null;
  const showApplyHour = !!firstFilled &&
    activeSubjects.some(i => i !== firstFilled.si && !getEntry(activeMeal, i).startTime);

  async function exportPDF() {
    if (!activeMeal) { alert("Please select a meal first."); return; }
    if (!state.info.singleHall && activeSubjects.length === 0) {
      alert("No subjects selected. Enter a subject range first."); return;
    }

    try {
      const { default: jsPDF } = await import("jspdf");
      const { default: autoTable } = await import("jspdf-autotable");

      const doc = new jsPDF();
      const pageW = doc.internal.pageSize.width;
      const pageH = doc.internal.pageSize.height;
      const date = new Date().toLocaleDateString("en-GB");

      const effectivePreparedBy = state.info.singleHall
        ? state.info.preparedBy
        : state.info.multiHallPreparedBy;
      const effectiveHall = state.info.singleHall
        ? state.info.hallName
        : state.info.multiHallName;

      doc.setFont("times", "bold");
      doc.setFontSize(14);
      doc.text("Meal Intake Log", pageW / 2, 18, { align: "center" });
      doc.setFont("courier", "normal");
      doc.setFontSize(8);
      const headerParts = [
        state.info.studyCode ? `Study Code: ${state.info.studyCode}` : "",
        state.info.clinicCode ? `Clinic Code: ${state.info.clinicCode}` : "",
        effectiveHall ? `Hall: ${effectiveHall}` : "",
        effectivePreparedBy ? `Prepared by: ${effectivePreparedBy}` : "",
      ].filter(Boolean);
      if (headerParts.length > 0) doc.text(headerParts.join("  ·  "), pageW / 2, 26, { align: "center" });
      doc.text(`Date: ${date}`, pageW / 2, 32, { align: "center" });

      const body = activeSubjects.map(si => {
        const { dropped } = isDroppedAtOrBefore(si, activeMeal, state.dropouts, mealKeys);
        if (dropped) return [subjectId(si), "-", "-", "-", "Drop-out"];
        const e = getEntry(activeMeal, si);
        return [
          subjectId(si),
          e.startTime || "-",
          e.endTime || "-",
          e.completed ? "Yes" : "No",
          e.note || "-",
        ];
      });

      autoTable(doc, {
        head: [
          [{ content: fullMealLabel(activeMeal), colSpan: 5, styles: { fontStyle: "bold", halign: "center" as const } }],
          [
            { content: "Subject", styles: { halign: "center" as const } },
            { content: "Start", styles: { halign: "center" as const } },
            { content: "End", styles: { halign: "center" as const } },
            { content: "Completed", styles: { halign: "center" as const } },
            { content: "Note / Status", styles: { halign: "center" as const } },
          ],
        ],
        body,
        startY: 40,
        styles: { font: "courier", fontSize: 8, cellPadding: 2, halign: "center", textColor: [20, 20, 20] as [number, number, number], fillColor: [255, 255, 255] as [number, number, number] },
        headStyles: { fillColor: [235, 235, 230] as [number, number, number], textColor: [20, 20, 20] as [number, number, number], fontStyle: "bold" },
        alternateRowStyles: { fillColor: [248, 247, 244] as [number, number, number] },
        tableLineColor: [180, 178, 170] as [number, number, number],
        tableLineWidth: 0.2,
        columnStyles: {
          0: { halign: "center" as const },
          1: { halign: "center" as const },
          2: { halign: "center" as const },
          3: { halign: "center" as const },
          4: { halign: "center" as const },
        },
        didParseCell(data) {
          if (data.section === "body" && data.column.index === 4) {
            const val = String(data.cell.raw ?? "");
            if (val === "Drop-out") {
              data.cell.styles.textColor = [160, 80, 60] as [number, number, number];
              data.cell.styles.fontStyle = "italic";
            }
          }
        },
      });

      const totalPages = doc.getNumberOfPages();
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        doc.setFont("courier", "normal");
        doc.setFontSize(7);
        doc.setTextColor(140, 138, 128);
        doc.text(`Page ${p} / ${totalPages}`, pageW - 14, pageH - 8, { align: "right" });
        doc.text("trialgrids.com", 14, pageH - 8);
      }

      doc.save("meal-log.pdf");
    } catch (err) {
      alert("PDF could not be generated: " + String(err));
    }
  }

  function clearAll() {
    if (!confirm("Clear all meal log data? This cannot be undone.")) return;
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    setState(INITIAL_STATE);
    setPeriodsWarning(false);
    setAddingCustom(false);
    setCustomInput("");
  }

  const toggleStyle = (active: boolean): React.CSSProperties => ({
    fontFamily: "var(--font-jetbrains-mono)",
    fontSize: ".72rem",
    textTransform: "uppercase",
    letterSpacing: ".05em",
    padding: "0.35rem 0.8rem",
    border: "1px solid var(--rule)",
    cursor: "pointer",
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#fff" : "var(--muted)",
  });

  return (
    <main>
      <div className="hero">
        <div>
          <p className="eyebrow">Meal intake log · bioequivalence &amp; crossover trials</p>
          <h1>Meal log.</h1>
          <p className="lede">
            Track meal start and completion times for every participant across study periods.
            Built for bioequivalence and bioavailability studies, standardized meal protocols,
            and crossover trials. Export compliance-ready PDFs. Your data stays local.
          </p>
        </div>
        <div className="meta">tool 03<br />client-side only<br />meal compliance</div>
      </div>

      {/* Panel 1 — Study Info */}
      <div className="panel">
        <div className="panel-head"><h2>Study Info</h2><span className="tag">optional</span></div>
        <div className="panel-body">

          {/* Single hall question */}
          <div style={{ marginBottom: "1.5rem" }}>
            <label style={{ display: "block", marginBottom: ".6rem" }}>Single hall?</label>
            <div style={{ display: "flex", gap: 0 }}>
              <button style={toggleStyle(state.info.singleHall)} onClick={() => setInfo("singleHall", true)}>Yes</button>
              <button style={toggleStyle(!state.info.singleHall)} onClick={() => setInfo("singleHall", false)}>No</button>
            </div>
          </div>

          <div className="controls">
            <div>
              <label>Study Code</label>
              <input type="text" placeholder="Please specify" value={state.info.studyCode} onChange={e => setInfo("studyCode", e.target.value)} />
            </div>
            <div>
              <label>Clinic Code</label>
              <input type="text" placeholder="Please specify" value={state.info.clinicCode} onChange={e => setInfo("clinicCode", e.target.value)} />
            </div>

            {state.info.singleHall ? (
              <>
                <div>
                  <label>Hall name</label>
                  <input type="text" placeholder="e.g. Main Hall" value={state.info.hallName} onChange={e => setInfo("hallName", e.target.value)} />
                </div>
                <div>
                  <label>Prepared by</label>
                  <input type="text" placeholder="Name and Surname" value={state.info.preparedBy} onChange={e => setInfo("preparedBy", e.target.value)} />
                </div>
              </>
            ) : (
              <>
                <div>
                  <label>Hall name</label>
                  <input type="text" placeholder="e.g. Hall B" value={state.info.multiHallName} onChange={e => setInfo("multiHallName", e.target.value)} />
                </div>
                <div>
                  <label>Prepared by</label>
                  <input type="text" placeholder="Staff name" value={state.info.multiHallPreparedBy} onChange={e => setInfo("multiHallPreparedBy", e.target.value)} />
                </div>
                <div style={{ gridColumn: "1 / -1" }}>
                  <label>Subjects in this hall</label>
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="e.g. 1, 2, 3, 13, 14"
                    value={state.info.multiHallSubjectsRaw}
                    onChange={e => setInfo("multiHallSubjectsRaw", e.target.value.replace(/[^0-9,]/g, ""))}
                    style={{ maxWidth: "280px" }}
                  />
                  {subjectPreviewText && (
                    <p style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: ".72rem", color: activeSubjects.length > 0 ? "var(--accent)" : "var(--accent-2)", marginTop: ".4rem" }}>
                      {subjectPreviewText}
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Panel 2 — Configuration */}
      <div className="panel">
        <div className="panel-head"><h2>Configuration</h2><span className="tag">required</span></div>
        <div className="panel-body">
          <div className="controls">
            <div>
              <label>Number of subjects</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="Enter value"
                value={state.info.singleHall ? state.nSubjectsRaw : (activeSubjects.length > 0 ? String(activeSubjects.length) : "")}
                readOnly={!state.info.singleHall}
                onChange={e => { if (state.info.singleHall) setNSubjects(e.target.value); }}
                onBlur={() => {
                  if (!state.info.singleHall || !state.nSubjectsRaw) return;
                  const num = parseInt(state.nSubjectsRaw);
                  if (isNaN(num) || num < 1) save({ ...state, nSubjectsRaw: String(state.nSubjects) });
                }}
                style={{ opacity: state.info.singleHall ? 1 : 0.5, cursor: state.info.singleHall ? undefined : "not-allowed" }}
              />
            </div>
            <div>
              <label>Period</label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="1–4"
                value={state.nPeriodsRaw}
                onChange={e => setNPeriods(e.target.value)}
                onBlur={() => {
                  if (!state.nPeriodsRaw) return;
                  if (isNaN(parseInt(state.nPeriodsRaw))) {
                    save({ ...state, nPeriodsRaw: String(state.nPeriods) });
                    setPeriodsWarning(false);
                  }
                }}
                style={{ maxWidth: "80px" }}
              />
              {periodsWarning && (
                <p style={{ color: "var(--accent-2)", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".68rem", marginTop: ".4rem" }}>
                  Max period: 4
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Panel 3 — Meal Log */}
      <div className="panel">
        <div className="panel-head"><h2>Meal log</h2><span className="tag">active</span></div>
        <div className="panel-body">

          {/* Meal selector */}
          <div style={{ marginBottom: "1rem" }}>
            <label>Select meal</label>
            <Select
              value={addingCustom ? ADD_CUSTOM_VALUE : (activeMeal || "")}
              onChange={handleMealSelect}
              placeholder="Select meal"
              options={[
                ...mealKeys.map(k => ({ value: k, label: mealLabel(k) })),
                { value: ADD_CUSTOM_VALUE, label: "+ Add custom meal..." },
              ]}
              style={{ maxWidth: "340px" }}
            />
          </div>

          {/* Custom meal input */}
          {addingCustom && (
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end", marginBottom: "1rem" }}>
              <div>
                <label>Custom meal name</label>
                <input
                  type="text"
                  placeholder="e.g. Day 1 Snack"
                  value={customInput}
                  autoFocus
                  onChange={e => setCustomInput(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") addCustomMeal(); if (e.key === "Escape") { setAddingCustom(false); setCustomInput(""); } }}
                  style={{ maxWidth: "220px" }}
                />
              </div>
              <button className="btn ghost" style={{ padding: "0.6rem 0.8rem", fontSize: ".7rem", whiteSpace: "nowrap" }} onClick={addCustomMeal}>
                Save
              </button>
            </div>
          )}

          {/* Custom meal tags */}
          {(state.customMeals[periodIdx] ?? []).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4rem", marginBottom: "1rem" }}>
              {(state.customMeals[periodIdx] ?? []).map(cm => (
                <span key={cm} style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: ".72rem", background: "var(--paper-2)", border: "1px solid var(--rule)", padding: "0.2rem 0.5rem", display: "inline-flex", alignItems: "center", gap: "0.4rem" }}>
                  {cm}
                  <button onClick={() => removeCustomMeal(cm)} style={{ background: "none", border: "none", color: "var(--muted)", cursor: "pointer", fontSize: ".8rem", padding: 0 }}>×</button>
                </span>
              ))}
            </div>
          )}

          {!activeMeal ? (
            <p style={{ color: "var(--muted)", fontSize: ".9rem" }}>Select a meal above to begin logging.</p>
          ) : !state.info.singleHall && activeSubjects.length === 0 ? (
            <p style={{ color: "var(--accent-2)", fontSize: ".9rem", fontFamily: "var(--font-jetbrains-mono)" }}>
              Enter subject range in Study Info to begin logging.
            </p>
          ) : (
            <div className="result">
              <table>
                <thead>
                  <tr>
                    <th>Subject</th>
                    <th>
                      Start
                      {showApplyHour && (
                        <button
                          onClick={() => applyHourToAll(activeMeal, firstFilled!.time)}
                          title={`Apply hour "${firstFilled!.time.slice(0, 2)}:__" to all subjects without a start time`}
                          style={{ marginLeft: "0.5rem", background: "none", border: "1px solid var(--rule)", color: "var(--accent)", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".6rem", textTransform: "uppercase", letterSpacing: ".05em", cursor: "pointer", padding: "0.1rem 0.35rem" }}
                        >
                          {firstFilled!.time.slice(0, 2)}:__ → all
                        </button>
                      )}
                    </th>
                    <th>End</th>
                    <th>Completed</th>
                    <th>Note</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSubjects.map(si => {
                    const { dropped, at } = isDroppedAtOrBefore(si, activeMeal, state.dropouts, mealKeys);
                    const e = getEntry(activeMeal, si);
                    const startEndInvalid = !timeValid(e.startTime, e.endTime);
                    const noteRequired = !!e.endTime && !e.completed && !e.note;

                    if (dropped) {
                      return (
                        <tr key={si} style={{ opacity: 0.45 }}>
                          <td style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: ".78rem" }}>{subjectId(si)}</td>
                          <td colSpan={4} style={{ fontStyle: "italic", color: "var(--muted)", fontSize: ".78rem" }}>
                            {state.dropouts[si] === activeMeal ? "Dropped out at this meal" : `Dropped out at: ${at ? mealLabel(at) : ""}`}
                          </td>
                          <td>
                            <button onClick={() => undropout(si)} style={{ background: "none", border: "none", color: "var(--accent)", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".65rem", textTransform: "uppercase", cursor: "pointer", letterSpacing: ".05em" }}>
                              Revert
                            </button>
                          </td>
                        </tr>
                      );
                    }

                    return (
                      <tr key={si}>
                        <td style={{ fontFamily: "var(--font-jetbrains-mono)", fontSize: ".78rem", whiteSpace: "nowrap" }}>{subjectId(si)}</td>
                        <td>
                          <input
                            type="text"
                            placeholder="HH:MM"
                            value={e.startTime}
                            data-row={si}
                            data-col="start"
                            onChange={ev => setEntry(activeMeal, si, { startTime: fmtTime(ev.target.value) })}
                            onKeyDown={ev => {
                              if (ev.key === "ArrowDown") { ev.preventDefault(); const n = adjacentSubject(si, 1); if (n !== null) focusCell(n, "start"); }
                              if (ev.key === "ArrowUp") { ev.preventDefault(); const n = adjacentSubject(si, -1); if (n !== null) focusCell(n, "start"); }
                              if (ev.key === "ArrowRight" || ev.key === "Enter") { ev.preventDefault(); focusCell(si, "end"); }
                            }}
                            style={{ width: "72px", outline: startEndInvalid ? "2px solid var(--accent-2)" : undefined }}
                          />
                        </td>
                        <td>
                          <input
                            type="text"
                            placeholder="HH:MM"
                            value={e.endTime}
                            data-row={si}
                            data-col="end"
                            onChange={ev => setEntry(activeMeal, si, { endTime: fmtTime(ev.target.value) })}
                            onKeyDown={ev => {
                              if (ev.key === "ArrowDown") { ev.preventDefault(); const n = adjacentSubject(si, 1); if (n !== null) focusCell(n, "end"); }
                              if (ev.key === "ArrowUp") { ev.preventDefault(); const n = adjacentSubject(si, -1); if (n !== null) focusCell(n, "end"); }
                              if (ev.key === "ArrowRight" || ev.key === "Enter") { ev.preventDefault(); focusCell(si, "completed"); }
                              if (ev.key === "ArrowLeft") { ev.preventDefault(); focusCell(si, "start"); }
                            }}
                            style={{ width: "72px", outline: startEndInvalid ? "2px solid var(--accent-2)" : undefined }}
                          />
                        </td>
                        <td style={{ textAlign: "center" }}>
                          <input
                            type="checkbox"
                            data-row={si}
                            data-col="completed"
                            style={{ width: "auto", margin: 0 }}
                            checked={e.completed}
                            onChange={ev => setEntry(activeMeal, si, { completed: ev.target.checked, note: ev.target.checked ? "" : e.note })}
                            onKeyDown={ev => {
                              if (ev.key === "Enter") { ev.preventDefault(); setEntry(activeMeal, si, { completed: !e.completed, note: !e.completed ? "" : e.note }); }
                              if (ev.key === "ArrowDown") { ev.preventDefault(); const n = adjacentSubject(si, 1); if (n !== null) focusCell(n, "completed"); }
                              if (ev.key === "ArrowUp") { ev.preventDefault(); const n = adjacentSubject(si, -1); if (n !== null) focusCell(n, "completed"); }
                              if (ev.key === "ArrowLeft") { ev.preventDefault(); focusCell(si, "end"); }
                            }}
                          />
                        </td>
                        <td>
                          {!e.completed && (
                            <input
                              type="text"
                              placeholder="Reason"
                              value={e.note}
                              onChange={ev => setEntry(activeMeal, si, { note: ev.target.value })}
                              style={{ minWidth: "130px", outline: noteRequired ? "2px solid var(--accent-2)" : undefined }}
                            />
                          )}
                        </td>
                        <td>
                          <button
                            onClick={() => dropout(si, activeMeal)}
                            style={{ background: "none", border: "1px solid var(--rule)", color: "var(--muted)", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".65rem", textTransform: "uppercase", cursor: "pointer", letterSpacing: ".05em", padding: "0.25rem 0.5rem" }}
                          >
                            Drop out
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Panel 4 — Export */}
      <div className="panel">
        <div className="panel-head"><h2>Export</h2></div>
        <div className="panel-body">
          <div className="btn-row">
            <button className="btn" onClick={exportPDF}>Generate PDF</button>
          </div>
        </div>
      </div>

      <div style={{ marginTop: "1rem", borderTop: "1px solid var(--rule)", paddingTop: "1.5rem" }}>
        <button
          onClick={clearAll}
          style={{ background: "none", border: "none", color: "var(--muted)", fontFamily: "var(--font-jetbrains-mono)", fontSize: ".68rem", textTransform: "uppercase", letterSpacing: ".08em", cursor: "pointer" }}
        >
          Clear all data
        </button>
      </div>
    </main>
  );
}
