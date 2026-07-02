"use client";

import { useEffect, useRef, useState } from "react";

const STORAGE_KEY = "trialgrids-ae-form-draft";
const DESC_MAX = 500;
const DESC_WARN = 480;

// --- Assessment matrix definitions ---

interface MatrixOption {
  value: string;
  label: string;
  tooltip?: string;
}

interface MatrixGroup {
  key: keyof Assessment;
  title: string;
  note?: string;
  warning?: { whenValue: string; text: string };
  multi?: boolean;
  options: MatrixOption[];
}

const MATRIX_GROUPS: MatrixGroup[] = [
  {
    key: "seriousness",
    title: "Seriousness",
    warning: {
      whenValue: "2",
      text: "If it is serious please inform to Sponsor and/or CRO representatives within 24 hours!",
    },
    options: [
      { value: "1", label: "Not serious" },
      { value: "2", label: "Serious" },
    ],
  },
  {
    key: "severity",
    title: "Severity",
    options: [
      { value: "1", label: "Mild", tooltip: "Not effect daily activity" },
      { value: "2", label: "Moderate", tooltip: "Effect daily activity" },
      {
        value: "3",
        label: "Severe",
        tooltip: "Not possible to continue daily activity",
      },
    ],
  },
  {
    key: "duration",
    title: "Duration / Type",
    options: [
      { value: "1", label: "Single" },
      { value: "2", label: "Intermittent" },
      { value: "3", label: "Continual" },
      { value: "4", label: "Not known" },
    ],
  },
  {
    key: "drugRelationship",
    title: "Drug Relationship",
    options: [
      { value: "1", label: "Certain" },
      { value: "2", label: "Probable / likely" },
      { value: "3", label: "Possible" },
      { value: "4", label: "Unlikely" },
      { value: "5", label: "Conditional / unclassified" },
      { value: "6", label: "Unassessable / unclassified" },
    ],
  },
  {
    key: "actionTaken",
    title: "Action Taken",
    multi: true,
    note: "Multiple selections allowed. If you select any of the options numbered 2, 3, or 5, please fill in the “Action Taken” field in the Action Details section.",
    options: [
      { value: "1", label: "Not necessary" },
      { value: "2", label: "Original treatment" },
      { value: "3", label: "Dosage reducing" },
      { value: "4", label: "Dropped-out" },
      { value: "5", label: "Other" },
    ],
  },
  {
    key: "result",
    title: "Result",
    options: [
      { value: "1", label: "Fully recovery" },
      { value: "2", label: "Recovery" },
      { value: "3", label: "Not changed" },
      { value: "4", label: "Aggravation" },
      { value: "5", label: "Death" },
      { value: "6", label: "Not known" },
    ],
  },
];

// --- Types ---

interface Assessment {
  seriousness: string;
  severity: string;
  duration: string;
  drugRelationship: string;
  actionTaken: string[]; // multi-select
  result: string;
}

interface FormState {
  formCode: string;
  formVersion: string;
  formVersionDate: string;
  effectiveDate: string;
  studyCode: string;
  screeningNo: string;
  volunteerNo: string;
  aeNumber: string;
  description: string;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  lastDoseDate: string;
  lastDoseTime: string;
  lastDoseNone: boolean;
  assessment: Assessment;
  informedPerson: string;
  actionDetails: string;
  dateOfReport: string;
  investigatorName: string;
}

const REQUIRED_FIELDS: { key: keyof FormState; label: string }[] = [
  { key: "studyCode", label: "Study Code" },
  { key: "screeningNo", label: "Screening No" },
  { key: "volunteerNo", label: "Volunteer No" },
  { key: "aeNumber", label: "AE Number" },
  { key: "description", label: "Description of adverse event" },
  { key: "startDate", label: "Starting date" },
  { key: "investigatorName", label: "Investigator Name" },
];

const EMPTY_FORM: FormState = {
  formCode: "",
  formVersion: "",
  formVersionDate: "",
  effectiveDate: "",
  studyCode: "",
  screeningNo: "",
  volunteerNo: "",
  aeNumber: "",
  description: "",
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  lastDoseDate: "",
  lastDoseTime: "",
  lastDoseNone: false,
  assessment: {
    seriousness: "",
    severity: "",
    duration: "",
    drugRelationship: "",
    actionTaken: [],
    result: "",
  },
  informedPerson: "",
  actionDetails: "",
  dateOfReport: "",
  investigatorName: "",
};

// --- Helpers ---

function sanitizeFilenamePart(s: string): string {
  return s.replace(/[^a-zA-Z0-9-]/g, "-");
}

function compactDate(iso: string): string {
  // "2024-11-11" -> "20241111". Empty -> today.
  const src = iso || new Date().toISOString().slice(0, 10);
  return src.replace(/-/g, "");
}

function formatDMY(iso: string): string {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  if (!y || !m || !d) return iso;
  return `${d}.${m}.${y}`;
}

function combineDateTime(date: string, time: string): Date | null {
  if (!date) return null;
  const t = time || "00:00";
  const dt = new Date(`${date}T${t}:00`);
  return isNaN(dt.getTime()) ? null : dt;
}

const ERROR_STYLE: React.CSSProperties = {
  marginTop: ".35rem",
  color: "#c85a40",
  fontFamily: "var(--font-jetbrains-mono)",
  fontSize: ".7rem",
  letterSpacing: ".02em",
};

const BANNER_ERROR_STYLE: React.CSSProperties = {
  marginTop: "1rem",
  padding: ".75rem 1rem",
  border: "1px solid #c85a40",
  color: "#c85a40",
  fontFamily: "var(--font-jetbrains-mono)",
  fontSize: ".75rem",
  background: "rgba(200, 90, 64, 0.05)",
  borderRadius: "4px",
};

const BANNER_OK_STYLE: React.CSSProperties = {
  marginTop: "1rem",
  padding: ".75rem 1rem",
  border: "1px solid var(--accent)",
  color: "var(--accent)",
  fontFamily: "var(--font-jetbrains-mono)",
  fontSize: ".75rem",
  background: "rgba(91, 141, 196, 0.05)",
  borderRadius: "4px",
};

const BANNER_INFO_STYLE: React.CSSProperties = {
  marginBottom: "1.5rem",
  padding: ".6rem 1rem",
  border: "1px solid var(--rule)",
  background: "var(--paper-2)",
  color: "var(--muted)",
  fontFamily: "var(--font-jetbrains-mono)",
  fontSize: ".72rem",
  letterSpacing: ".04em",
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
  gap: "1rem",
};

const REQ: React.CSSProperties = {
  color: "#c85a40",
  marginLeft: ".25rem",
};

const DATETIME_ROW: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "1fr 1fr",
  gap: ".6rem",
};

const DISABLED_INPUT_STYLE: React.CSSProperties = {
  opacity: 0.45,
  cursor: "not-allowed",
};

// --- Section save indicator ---

function SaveRow({
  hasContent,
  saved,
  onSave,
}: {
  hasContent: boolean;
  saved: boolean;
  onSave: () => void;
}) {
  if (!hasContent) return null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        marginTop: ".9rem",
      }}
    >
      {saved ? (
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: ".4rem",
            padding: ".4rem .75rem",
            border: "1px solid var(--accent)",
            background: "rgba(91, 141, 196, 0.08)",
            color: "var(--accent)",
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: ".72rem",
            textTransform: "uppercase",
            letterSpacing: ".08em",
            borderRadius: "2px",
          }}
        >
          ✓ Saved
        </span>
      ) : (
        <button
          type="button"
          className="btn ghost"
          onClick={onSave}
          style={{
            padding: ".4rem .9rem",
            fontSize: ".72rem",
            width: "auto",
          }}
        >
          Save
        </button>
      )}
    </div>
  );
}

// --- Assessment card (6-axis console) ---
// Segmented pill buttons instead of radio rows: cleaner scan, same data model.
// Single-select cards expose radiogroup semantics; multi-select uses aria-pressed.

function AssessmentCard({
  title,
  options,
  selected,
  multi,
  onSelect,
  note,
  warning,
}: {
  title: string;
  options: MatrixOption[];
  selected: string | string[];
  multi?: boolean;
  // Called with the option value — parent sets (single) or toggles (multi).
  onSelect: (v: string) => void;
  note?: string;
  warning?: { whenValue: string; text: string };
}) {
  const isChecked = (val: string): boolean =>
    Array.isArray(selected) ? selected.includes(val) : selected === val;
  const done = Array.isArray(selected) ? selected.length > 0 : !!selected;
  const showWarning =
    !!warning &&
    (Array.isArray(selected)
      ? selected.includes(warning.whenValue)
      : selected === warning.whenValue);
  return (
    <div className={`ae-card${done ? " done" : ""}`}>
      <div className="ae-card-head">
        <span className="ae-card-title">{title}</span>
        {done && <span className="ae-card-check">✓</span>}
      </div>
      <div className="ae-seg" role={multi ? "group" : "radiogroup"} aria-label={title}>
        {options.map((o) => {
          const checked = isChecked(o.value);
          const hasTip = !!o.tooltip;
          return (
            <button
              key={o.value}
              type="button"
              className={`ae-seg-btn${checked ? " on" : ""}${hasTip ? " ae-tip-wrap" : ""}`}
              role={multi ? undefined : "radio"}
              aria-checked={multi ? undefined : checked}
              aria-pressed={multi ? checked : undefined}
              onClick={() => onSelect(o.value)}
            >
              <span className="ae-code">{o.value}</span>
              {o.label}
              {hasTip && <span className="ae-tip-bubble">{o.tooltip}</span>}
            </button>
          );
        })}
      </div>
      {note && <div className="ae-card-note">{note}</div>}
      {showWarning && (
        <div
          style={{
            marginTop: ".7rem",
            padding: ".6rem .85rem",
            border: "1px solid var(--warn)",
            background: "var(--warn-soft)",
            color: "var(--warn)",
            fontFamily: "var(--font-jetbrains-mono)",
            fontSize: ".75rem",
            letterSpacing: ".02em",
            lineHeight: 1.5,
            borderRadius: "2px",
          }}
        >
          ⚠ {warning!.text}
        </div>
      )}
    </div>
  );
}

// --- Component ---

type SaveSection =
  | "formHeader"
  | "studyIds"
  | "aeNumber"
  | "description"
  | "dateTime"
  | "assessment"
  | "actionDetails"
  | "reportSig";

const SECTION_FIELDS: Record<SaveSection, (keyof FormState)[]> = {
  formHeader: ["formCode", "formVersion", "formVersionDate", "effectiveDate"],
  studyIds: ["studyCode", "screeningNo", "volunteerNo"],
  aeNumber: ["aeNumber"],
  description: ["description"],
  dateTime: [
    "startDate",
    "startTime",
    "endDate",
    "endTime",
    "lastDoseDate",
    "lastDoseTime",
    "lastDoseNone",
  ],
  // assessment fields live inside the nested object; handled in sectionHasContent / updateAssessment.
  assessment: [],
  actionDetails: ["informedPerson", "actionDetails"],
  reportSig: ["dateOfReport", "investigatorName"],
};

function sectionHasContent(section: SaveSection, form: FormState): boolean {
  if (section === "assessment") {
    return Object.values(form.assessment).some((v) => {
      if (Array.isArray(v)) return v.length > 0;
      return v !== "";
    });
  }
  return SECTION_FIELDS[section].some((k) => {
    const v = form[k];
    if (typeof v === "boolean") return v;
    return String(v ?? "").trim() !== "";
  });
}

export default function AdverseEventPage() {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [restored, setRestored] = useState(false);
  const [restoredVisible, setRestoredVisible] = useState(true);
  const [savedSections, setSavedSections] = useState<Set<SaveSection>>(
    new Set()
  );
  const hydrated = useRef(false);

  function findSectionForField(key: keyof FormState): SaveSection | null {
    for (const s of Object.keys(SECTION_FIELDS) as SaveSection[]) {
      if (SECTION_FIELDS[s].includes(key)) return s;
    }
    return null;
  }

  function markSectionSaved(s: SaveSection) {
    setSavedSections((prev) => {
      if (prev.has(s)) return prev;
      const next = new Set(prev);
      next.add(s);
      return next;
    });
  }

  function unmarkSectionSaved(s: SaveSection) {
    setSavedSections((prev) => {
      if (!prev.has(s)) return prev;
      const next = new Set(prev);
      next.delete(s);
      return next;
    });
  }

  // Restore draft on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<FormState>;
        // Merge so a missing nested key (e.g. new field) doesn't crash
        const restoredForm: FormState = {
          ...EMPTY_FORM,
          ...parsed,
          assessment: { ...EMPTY_FORM.assessment, ...(parsed.assessment ?? {}) },
        };
        // Migration: actionTaken used to be a single string before multi-select.
        // Older drafts may persist as "" or "2"; coerce to string[].
        const at = restoredForm.assessment.actionTaken as unknown;
        if (typeof at === "string") {
          restoredForm.assessment.actionTaken = at ? [at] : [];
        } else if (!Array.isArray(at)) {
          restoredForm.assessment.actionTaken = [];
        }
        // Only count as "restored" if there's actually content
        const hasContent = JSON.stringify(restoredForm) !== JSON.stringify(EMPTY_FORM);
        if (hasContent) {
          setForm(restoredForm);
          setRestored(true);
        }
      }
    } catch {
      // Ignore corrupted draft
    }
    hydrated.current = true;
  }, []);

  // Auto-save (after hydration so we don't overwrite the saved draft with EMPTY_FORM on first render)
  useEffect(() => {
    if (!hydrated.current) return;
    try {
      // Don't save if entirely empty
      if (JSON.stringify(form) === JSON.stringify(EMPTY_FORM)) {
        localStorage.removeItem(STORAGE_KEY);
        return;
      }
      localStorage.setItem(STORAGE_KEY, JSON.stringify(form));
    } catch {
      // Quota exceeded / private mode — best effort only
    }
  }, [form]);

  function update<K extends keyof FormState>(key: K, val: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: val }));
    setSuccessMsg("");
    const section = findSectionForField(key);
    if (section) unmarkSectionSaved(section);
  }

  function updateAssessment(key: keyof Assessment, val: string) {
    setForm((prev) => ({ ...prev, assessment: { ...prev.assessment, [key]: val } }));
    setSuccessMsg("");
    unmarkSectionSaved("assessment");
  }

  // Multi-select toggle for actionTaken — adds/removes the value from the array
  function toggleAssessmentOption(key: "actionTaken", val: string) {
    setForm((prev) => {
      const current = prev.assessment[key];
      const next = current.includes(val)
        ? current.filter((v) => v !== val)
        : [...current, val];
      return {
        ...prev,
        assessment: { ...prev.assessment, [key]: next },
      };
    });
    setSuccessMsg("");
    unmarkSectionSaved("assessment");
    clearFieldError("actionDetails");
  }

  function clearFieldError(key: string) {
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function handleBlurRequired(key: keyof FormState, label: string) {
    const v = String(form[key] ?? "").trim();
    if (!v) {
      setErrors((prev) => ({ ...prev, [key]: `${label} is required.` }));
    } else {
      clearFieldError(key);
    }
  }

  function validate(): boolean {
    const next: Record<string, string> = {};

    for (const { key, label } of REQUIRED_FIELDS) {
      const v = String(form[key] ?? "").trim();
      if (!v) next[key] = `${label} is required.`;
    }

    if (form.description.length > DESC_MAX) {
      next.description = `Description must be ${DESC_MAX} characters or fewer.`;
    }

    if (form.aeNumber.trim()) {
      const n = parseInt(form.aeNumber, 10);
      if (isNaN(n) || n < 1) {
        next.aeNumber = "AE Number must be a positive integer.";
      }
    }

    // Date/time validation — strict ordering when both pairs are fully entered
    if (dateOrderError) {
      next.endDate = dateOrderError;
    }

    // Action details required when Action Taken includes 2, 3, or 5
    const requiresActionDetails = form.assessment.actionTaken.some((v) =>
      ["2", "3", "5"].includes(v)
    );
    if (requiresActionDetails && !form.actionDetails.trim()) {
      next.actionDetails =
        'Selected action requires details. Please fill in "Action taken — specify".';
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function scrollToFirstError(errs: Record<string, string>) {
    const order: string[] = [
      "studyCode",
      "screeningNo",
      "volunteerNo",
      "aeNumber",
      "description",
      "startDate",
      "endDate",
      "actionDetails",
      "investigatorName",
    ];
    for (const k of order) {
      if (errs[k]) {
        const el = document.querySelector(`[data-field="${k}"]`) as HTMLElement | null;
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          const focusable = el.querySelector("input, textarea") as HTMLElement | null;
          focusable?.focus({ preventScroll: true });
        }
        return;
      }
    }
  }

  function clearAll() {
    if (
      !window.confirm("Clear all fields? This cannot be undone.")
    )
      return;
    setForm(EMPTY_FORM);
    setErrors({});
    setSubmitError("");
    setSuccessMsg("");
    setRestored(false);
    setSavedSections(new Set());
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
  }

  async function generatePDF() {
    setSubmitError("");
    setSuccessMsg("");
    const ok = validate();
    if (!ok) {
      // Use the freshly-computed errors via a microtask
      setTimeout(() => {
        // We need to read latest errors — call validate again to get the same set
        const errs: Record<string, string> = {};
        for (const { key, label } of REQUIRED_FIELDS) {
          const v = String(form[key] ?? "").trim();
          if (!v) errs[key] = `${label} is required.`;
        }
        if (form.description.length > DESC_MAX) {
          errs.description = `Description must be ${DESC_MAX} characters or fewer.`;
        }
        const requiresActionDetails = form.assessment.actionTaken.some((v) =>
          ["2", "3", "5"].includes(v)
        );
        if (requiresActionDetails && !form.actionDetails.trim()) {
          errs.actionDetails = "required";
        }
        scrollToFirstError(errs);
      }, 0);
      setSubmitError("Please fix the errors above before generating the PDF.");
      return;
    }

    // Late warning: last dose after start (don't block).
    // Skipped entirely when subject had not yet been dosed.
    const startDt = combineDateTime(form.startDate, form.startTime);
    const lastDoseDt = form.lastDoseNone
      ? null
      : combineDateTime(form.lastDoseDate, form.lastDoseTime);
    if (startDt && lastDoseDt && lastDoseDt.getTime() > startDt.getTime()) {
      // Non-blocking warning surfaced via console only — UI banner would be modal-ish.
      // Could be expanded later if requested.
      // eslint-disable-next-line no-console
      console.warn(
        "Last dose is after AE start — please verify this is intentional."
      );
    }

    try {
      await renderPDF(form);
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error(err);
      setSubmitError("PDF generation failed. Please try again.");
      return;
    }

    // Wipe local draft after successful PDF
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // ignore
    }
    setForm(EMPTY_FORM);
    setErrors({});
    setRestored(false);
    setSavedSections(new Set());
    setSuccessMsg("PDF generated. Form cleared.");
  }

  const descLen = form.description.length;
  const descCounterColor =
    descLen >= DESC_MAX
      ? "#c85a40"
      : descLen >= DESC_WARN
      ? "#c85a40"
      : "var(--muted)";

  // Live ordering check — only enforces when both Starting and Ending have
  // BOTH date AND time filled. Avoids false errors mid-typing.
  const dateOrderError = (() => {
    if (
      !form.startDate ||
      !form.startTime ||
      !form.endDate ||
      !form.endTime
    )
      return "";
    const start = combineDateTime(form.startDate, form.startTime);
    const end = combineDateTime(form.endDate, form.endTime);
    if (!start || !end) return "";
    if (end.getTime() <= start.getTime()) {
      return "Ending date & time must be after Starting date & time.";
    }
    return "";
  })();

  return (
    <main>
      {/* Hero */}
      <div className="hero">
        <div>
          <p className="eyebrow">ADVERSE EVENT · AE FORM · ICH E2A ALIGNED</p>
          <h1>Adverse event form.</h1>
        </div>
        <div className="meta">
          fill at the bedside
          <br />
          export to pdf
          <br />
          sign and attach
        </div>
      </div>

      <p className="lede">
        Generate a printable Adverse Event form for clinical research. Fill in
        the volunteer&apos;s details on phone or tablet at the bedside, export
        a clean PDF, print, sign, and attach to the CRF. Aligned with ICH E2A
        terminology.
      </p>

      {restored && restoredVisible && (
        <div style={BANNER_INFO_STYLE}>
          <span>Draft restored from your previous session.</span>
          <button
            onClick={() => setRestoredVisible(false)}
            style={{
              background: "none",
              border: "none",
              color: "var(--muted)",
              cursor: "pointer",
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: ".9rem",
              padding: 0,
            }}
            aria-label="Dismiss"
          >
            ×
          </button>
        </div>
      )}

      {/* Section 1: Form header */}
      <div className="panel">
        <div className="panel-head">
          <h2>Form header</h2>
          <span className="tag">optional · printed at top</span>
        </div>
        <div className="panel-body">
          <div className="controls">
            <div data-field="formCode">
              <label>Form Code</label>
              <input
                type="text"
                placeholder="e.g. Doc-01"
                value={form.formCode}
                onChange={(e) => update("formCode", e.target.value)}
              />
            </div>
            <div data-field="formVersion">
              <label>Form Version</label>
              <input
                type="text"
                placeholder="e.g. 2.0"
                value={form.formVersion}
                onChange={(e) => update("formVersion", e.target.value)}
              />
            </div>
            <div data-field="formVersionDate">
              <label>Form Version Date</label>
              <input
                type="date"
                lang="en-GB"
                value={form.formVersionDate}
                onChange={(e) => update("formVersionDate", e.target.value)}
              />
            </div>
            <div data-field="effectiveDate">
              <label>Effective Date</label>
              <input
                type="date"
                lang="en-GB"
                value={form.effectiveDate}
                onChange={(e) => update("effectiveDate", e.target.value)}
              />
            </div>
          </div>
          <SaveRow
            hasContent={sectionHasContent("formHeader", form)}
            saved={savedSections.has("formHeader")}
            onSave={() => markSectionSaved("formHeader")}
          />
        </div>
      </div>

      {/* Section 2: Study identifiers */}
      <div className="panel">
        <div className="panel-head">
          <h2>Study identifiers</h2>
          <span className="tag">required</span>
        </div>
        <div className="panel-body">
          <div className="controls">
            <div data-field="studyCode">
              <label>
                Study Code<span style={REQ}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. TG-001-ZE"
                value={form.studyCode}
                onChange={(e) => {
                  update("studyCode", e.target.value);
                  clearFieldError("studyCode");
                }}
                onBlur={() => handleBlurRequired("studyCode", "Study Code")}
              />
              {errors.studyCode && <div style={ERROR_STYLE}>{errors.studyCode}</div>}
            </div>
            <div data-field="screeningNo">
              <label>
                Screening No<span style={REQ}>*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 027 or 38"
                value={form.screeningNo}
                onChange={(e) => {
                  update("screeningNo", e.target.value.replace(/[^0-9]/g, ""));
                  clearFieldError("screeningNo");
                }}
                onBlur={() => handleBlurRequired("screeningNo", "Screening No")}
              />
              {errors.screeningNo && <div style={ERROR_STYLE}>{errors.screeningNo}</div>}
            </div>
            <div data-field="volunteerNo">
              <label>
                Volunteer No<span style={REQ}>*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 027 or 07"
                value={form.volunteerNo}
                onChange={(e) => {
                  update("volunteerNo", e.target.value.replace(/[^0-9]/g, ""));
                  clearFieldError("volunteerNo");
                }}
                onBlur={() => handleBlurRequired("volunteerNo", "Volunteer No")}
              />
              {errors.volunteerNo && <div style={ERROR_STYLE}>{errors.volunteerNo}</div>}
            </div>
          </div>
          <SaveRow
            hasContent={sectionHasContent("studyIds", form)}
            saved={savedSections.has("studyIds")}
            onSave={() => markSectionSaved("studyIds")}
          />
        </div>
      </div>

      {/* Section 3: AE specific */}
      <div className="panel">
        <div className="panel-head">
          <h2>Event identifiers</h2>
          <span className="tag">one form per AE</span>
        </div>
        <div className="panel-body">
          <div className="controls">
            <div data-field="aeNumber">
              <label>
                AE Number<span style={REQ}>*</span>
              </label>
              <input
                type="text"
                inputMode="numeric"
                placeholder="e.g. 1"
                value={form.aeNumber}
                onChange={(e) => {
                  update("aeNumber", e.target.value.replace(/[^0-9]/g, ""));
                  clearFieldError("aeNumber");
                }}
                onBlur={() => handleBlurRequired("aeNumber", "AE Number")}
              />
              {errors.aeNumber && <div style={ERROR_STYLE}>{errors.aeNumber}</div>}
            </div>
          </div>
          <SaveRow
            hasContent={sectionHasContent("aeNumber", form)}
            saved={savedSections.has("aeNumber")}
            onSave={() => markSectionSaved("aeNumber")}
          />
        </div>
      </div>

      {/* Section 4: Description */}
      <div className="panel">
        <div className="panel-head">
          <h2>Description of adverse event</h2>
          <span className="tag">required · max {DESC_MAX} chars</span>
        </div>
        <div className="panel-body">
          <div data-field="description">
            <label>
              Describe what was reported<span style={REQ}>*</span>
            </label>
            <textarea
              rows={5}
              placeholder="e.g. Mild headache reported 2 hours after dosing. Subject describes pressure behind both eyes."
              value={form.description}
              onChange={(e) => {
                update("description", e.target.value);
                clearFieldError("description");
              }}
              onBlur={() =>
                handleBlurRequired("description", "Description of adverse event")
              }
              style={{ minHeight: "120px" }}
            />
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: ".4rem",
              }}
            >
              <div style={{ minHeight: ".9rem" }}>
                {errors.description && (
                  <span style={ERROR_STYLE}>{errors.description}</span>
                )}
              </div>
              <div
                style={{
                  fontFamily: "var(--font-jetbrains-mono)",
                  fontSize: ".72rem",
                  color: descCounterColor,
                  letterSpacing: ".04em",
                }}
              >
                {descLen} / {DESC_MAX}
              </div>
            </div>
          </div>
          <SaveRow
            hasContent={sectionHasContent("description", form)}
            saved={savedSections.has("description")}
            onSave={() => markSectionSaved("description")}
          />
        </div>
      </div>

      {/* Section 5: Date/time */}
      <div className="panel">
        <div className="panel-head">
          <h2>Date &amp; time</h2>
          <span className="tag">required</span>
        </div>
        <div className="panel-body">
          {/* Top-aligned: the default .controls end-alignment made the first two
              columns sit lower than the taller "Last dose" block (asymmetric). */}
          <div className="controls" style={{ alignItems: "start" }}>
            <div data-field="startDate">
              <label>
                Starting<span style={REQ}>*</span>
              </label>
              <div style={DATETIME_ROW}>
                <input
                  type="date"
                  lang="en-GB"
                  value={form.startDate}
                  onChange={(e) => {
                    update("startDate", e.target.value);
                    clearFieldError("startDate");
                    clearFieldError("endDate");
                  }}
                />
                <input
                  type="time"
                  value={form.startTime}
                  onChange={(e) => {
                    update("startTime", e.target.value);
                    clearFieldError("endDate");
                  }}
                />
              </div>
              {errors.startDate && <div style={ERROR_STYLE}>{errors.startDate}</div>}
            </div>
            <div data-field="endDate">
              <label>Ending</label>
              <div style={DATETIME_ROW}>
                <input
                  type="date"
                  lang="en-GB"
                  value={form.endDate}
                  onChange={(e) => {
                    update("endDate", e.target.value);
                    clearFieldError("endDate");
                  }}
                />
                <input
                  type="time"
                  value={form.endTime}
                  onChange={(e) => {
                    update("endTime", e.target.value);
                    clearFieldError("endDate");
                  }}
                />
              </div>
              {(errors.endDate || dateOrderError) && (
                <div style={ERROR_STYLE}>
                  {errors.endDate || dateOrderError}
                </div>
              )}
            </div>
            <div data-field="lastDoseDate">
              {/* Label row carries the compact "None" toggle so all three columns
                  share the exact same height (symmetric with Starting/Ending). */}
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".6rem" }}>
                <label style={{ marginBottom: 0 }}>Last dose before AE</label>
                <label
                  title="Subject had not yet received drug"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: ".35rem",
                    cursor: "pointer",
                    textTransform: "none",
                    letterSpacing: 0,
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontSize: ".68rem",
                    color: form.lastDoseNone ? "var(--ink)" : "var(--muted)",
                    marginBottom: 0,
                    whiteSpace: "nowrap",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={form.lastDoseNone}
                    onChange={(e) => {
                      const checked = e.target.checked;
                      setForm((prev) => ({
                        ...prev,
                        lastDoseNone: checked,
                        lastDoseDate: checked ? "" : prev.lastDoseDate,
                        lastDoseTime: checked ? "" : prev.lastDoseTime,
                      }));
                      setSuccessMsg("");
                      unmarkSectionSaved("dateTime");
                    }}
                    style={{
                      width: "auto",
                      margin: 0,
                      cursor: "pointer",
                      accentColor: "var(--accent)",
                    }}
                  />
                  None
                </label>
              </div>
              <div style={{ ...DATETIME_ROW, marginTop: ".4rem" }}>
                <input
                  type="date"
                  lang="en-GB"
                  value={form.lastDoseDate}
                  disabled={form.lastDoseNone}
                  onChange={(e) => update("lastDoseDate", e.target.value)}
                  style={form.lastDoseNone ? DISABLED_INPUT_STYLE : undefined}
                />
                <input
                  type="time"
                  value={form.lastDoseTime}
                  disabled={form.lastDoseNone}
                  onChange={(e) => update("lastDoseTime", e.target.value)}
                  style={form.lastDoseNone ? DISABLED_INPUT_STYLE : undefined}
                />
              </div>
              {form.lastDoseNone && (
                <div
                  style={{
                    marginTop: ".45rem",
                    fontFamily: "var(--font-jetbrains-mono)",
                    fontSize: ".68rem",
                    color: "var(--muted)",
                    fontStyle: "italic",
                  }}
                >
                  Subject had not yet received drug.
                </div>
              )}
            </div>
          </div>
          <SaveRow
            hasContent={sectionHasContent("dateTime", form)}
            saved={savedSections.has("dateTime")}
            onSave={() => markSectionSaved("dateTime")}
          />
        </div>
      </div>

      {/* Section 6: Assessment — live 6-axis profile console */}
      <div className="panel">
        <div className="panel-head">
          <h2>Assessment</h2>
          <span className="tag">live profile</span>
        </div>
        <div className="panel-body">
          {/* Profile strip: one chip per axis, updated in real time as the matrix is filled. */}
          <div className="ae-profile">
            {MATRIX_GROUPS.map((g) => {
              const sel = form.assessment[g.key];
              const labels = g.options
                .filter((o) => (Array.isArray(sel) ? sel.includes(o.value) : sel === o.value))
                .map((o) => o.label);
              const filled = labels.length > 0;
              const alert = !!g.warning && (Array.isArray(sel) ? sel.includes(g.warning.whenValue) : sel === g.warning.whenValue);
              return (
                <span key={g.key} className={`ae-chip${alert ? " alert" : filled ? " filled" : ""}`}>
                  {filled ? labels.join(" + ") : `${g.title}: —`}
                </span>
              );
            })}
            {(() => {
              const doneCount = MATRIX_GROUPS.filter((g) => {
                const sel = form.assessment[g.key];
                return Array.isArray(sel) ? sel.length > 0 : !!sel;
              }).length;
              const complete = doneCount === MATRIX_GROUPS.length;
              return (
                <span className={`ae-progress${complete ? " complete" : ""}`}>
                  {complete ? "✓ 6/6 assessed" : `${doneCount}/${MATRIX_GROUPS.length} assessed`}
                </span>
              );
            })()}
          </div>
          <div className="ae-matrix">
            {MATRIX_GROUPS.map((g) => (
              <AssessmentCard
                key={g.key}
                title={g.title}
                options={g.options}
                selected={form.assessment[g.key]}
                multi={g.multi}
                onSelect={(v) =>
                  g.multi
                    ? toggleAssessmentOption(g.key as "actionTaken", v)
                    : updateAssessment(g.key, v)
                }
                note={g.note}
                warning={g.warning}
              />
            ))}
          </div>
          <SaveRow
            hasContent={sectionHasContent("assessment", form)}
            saved={savedSections.has("assessment")}
            onSave={() => markSectionSaved("assessment")}
          />
        </div>
      </div>

      {/* Section 7: Action details */}
      <div className="panel">
        <div className="panel-head">
          <h2>Action details</h2>
          <span className="tag">optional</span>
        </div>
        <div className="panel-body">
          <div className="controls">
            <div data-field="informedPerson">
              <label>Informed person (phone / email)</label>
              <input
                type="text"
                placeholder="e.g. Dr. Smith · +90 555 1234567"
                value={form.informedPerson}
                onChange={(e) => update("informedPerson", e.target.value)}
              />
            </div>
          </div>
          <div data-field="actionDetails" style={{ marginTop: "1rem" }}>
            <label>
              Action taken — specify
              {form.assessment.actionTaken.some((v) =>
                ["2", "3", "5"].includes(v)
              ) && <span style={REQ}>*</span>}
            </label>
            <textarea
              rows={3}
              placeholder="e.g. Subject observed. No intervention required. Symptom self-resolved."
              value={form.actionDetails}
              onChange={(e) => {
                update("actionDetails", e.target.value);
                clearFieldError("actionDetails");
              }}
              style={{ minHeight: "90px" }}
            />
            {errors.actionDetails && (
              <div style={ERROR_STYLE}>{errors.actionDetails}</div>
            )}
          </div>
          <SaveRow
            hasContent={sectionHasContent("actionDetails", form)}
            saved={savedSections.has("actionDetails")}
            onSave={() => markSectionSaved("actionDetails")}
          />
        </div>
      </div>

      {/* Section 8: Footer */}
      <div className="panel">
        <div className="panel-head">
          <h2>Report &amp; signature</h2>
          <span className="tag">signed manually after printing</span>
        </div>
        <div className="panel-body">
          <div className="controls">
            <div data-field="dateOfReport">
              <label>Date of report</label>
              <input
                type="date"
                lang="en-GB"
                value={form.dateOfReport}
                onChange={(e) => update("dateOfReport", e.target.value)}
              />
            </div>
            <div data-field="investigatorName">
              <label>
                Investigator name<span style={REQ}>*</span>
              </label>
              <input
                type="text"
                placeholder="e.g. Jack Williams"
                value={form.investigatorName}
                onChange={(e) => {
                  update("investigatorName", e.target.value);
                  clearFieldError("investigatorName");
                }}
                onBlur={() =>
                  handleBlurRequired("investigatorName", "Investigator Name")
                }
              />
              {errors.investigatorName && (
                <div style={ERROR_STYLE}>{errors.investigatorName}</div>
              )}
            </div>
          </div>
          <p
            style={{
              fontFamily: "var(--font-jetbrains-mono)",
              fontSize: ".72rem",
              color: "var(--muted)",
              marginTop: ".25rem",
              lineHeight: 1.6,
            }}
          >
            The signature line on the printed PDF is left blank for a manual
            pen signature. The investigator name above is typed under that
            line.
          </p>
          <SaveRow
            hasContent={sectionHasContent("reportSig", form)}
            saved={savedSections.has("reportSig")}
            onSave={() => markSectionSaved("reportSig")}
          />
        </div>
      </div>

      {/* Actions */}
      <div className="panel">
        <div className="panel-body">
          <div className="btn-row">
            <button
              className="btn"
              onClick={generatePDF}
              style={{
                background: "var(--accent-2)",
                color: "var(--paper)",
                borderColor: "var(--accent-2)",
              }}
            >
              Generate PDF
            </button>
            <button className="btn ghost" onClick={clearAll}>
              Clear
            </button>
          </div>
          {submitError && <div style={BANNER_ERROR_STYLE}>⚠ {submitError}</div>}
          {successMsg && <div style={BANNER_OK_STYLE}>✓ {successMsg}</div>}
        </div>
      </div>
    </main>
  );
}

// --- PDF rendering ---

async function renderPDF(form: FormState): Promise<void> {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const ML = 12; // left margin
  const MR = 12; // right margin
  const innerW = pageW - ML - MR;

  // --- Header table ---
  const headerTop = 12;
  const headerH = 26; // bumped to fit 3-row right column (Effective / Version / Version date)
  const colW = innerW / 3;

  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  // Outer border
  doc.rect(ML, headerTop, innerW, headerH);
  // Vertical dividers
  doc.line(ML + colW, headerTop, ML + colW, headerTop + headerH);
  doc.line(ML + 2 * colW, headerTop, ML + 2 * colW, headerTop + headerH);

  // Inline label+value helpers (same baseline, label gray-regular / value black-bold)
  function lvWidth(label: string, value: string): number {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const lblW = doc.getTextWidth(label);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    const valW = doc.getTextWidth(value);
    return lblW + 1.2 + valW;
  }
  function drawLV(x: number, y: number, label: string, value: string): void {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(80, 80, 80);
    doc.text(label, x, y);
    const lblW = doc.getTextWidth(label);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text(value, x + lblW + 1.2, y);
  }

  // Left column: Screening No + Volunteer No (inline) — vertically centered in 26mm box
  drawLV(ML + 2, headerTop + 11, "Screening No:", form.screeningNo || "—");
  drawLV(ML + 2, headerTop + 19, "Volunteer No:", form.volunteerNo || "—");

  // Center column: Form code + Study code, both inline label+value, centered
  const centerColMid = ML + colW + colW / 2;
  const formCodeValue = form.formCode || "—";
  const formCodeTotal = lvWidth("Form Code:", formCodeValue);
  drawLV(centerColMid - formCodeTotal / 2, headerTop + 11, "Form Code:", formCodeValue);
  const studyValue = form.studyCode || "—";
  const studyTotal = lvWidth("Study Code:", studyValue);
  drawLV(centerColMid - studyTotal / 2, headerTop + 19, "Study Code:", studyValue);

  // Right column: Effective date + Version + Version date (3 inline rows)
  drawLV(
    ML + 2 * colW + 2,
    headerTop + 8,
    "Effective date:",
    formatDMY(form.effectiveDate) || "—"
  );
  drawLV(
    ML + 2 * colW + 2,
    headerTop + 15,
    "Version:",
    form.formVersion || "—"
  );
  drawLV(
    ML + 2 * colW + 2,
    headerTop + 22,
    "Version date:",
    formatDMY(form.formVersionDate) || "—"
  );

  // --- Title ---
  let y = headerTop + headerH + 8;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.setTextColor(0, 0, 0);
  doc.text(
    `ADVERSE EVENT FORM   /   AE NO: [${form.aeNumber || "—"}]`,
    pageW / 2,
    y,
    { align: "center" }
  );
  y += 5;
  doc.setFont("helvetica", "italic");
  doc.setFontSize(8.5);
  doc.setTextColor(90, 90, 90);
  doc.text(
    "(Please fill a different form for each adverse event)",
    pageW / 2,
    y,
    { align: "center" }
  );

  // --- Definitions block ---
  // Regulatory-accurate definitions per ICH E2A and 21 CFR 312.32.
  // The SAE list keeps the inline (1)…(6) format but uses semicolons as
  // separators because individual items now contain commas (IME examples).
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text("Adverse Event (AE) — ICH E2A:", ML, y);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const aeDef =
    "Any untoward medical occurrence in a patient or clinical investigation subject administered a pharmaceutical (investigational) product, which does not necessarily have a causal relationship with this treatment. An AE can therefore be any unfavourable and unintended sign (including an abnormal laboratory finding), symptom, or disease temporally associated with the use of a medicinal (investigational) product, whether or not considered related to it.";
  const aeDefLines = doc.splitTextToSize(aeDef, innerW);
  doc.text(aeDefLines, ML, y + 4);
  y += 4 + aeDefLines.length * 3.6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text("Serious Adverse Event (SAE) — ICH E2A / 21 CFR 312.32:", ML, y + 1);
  doc.setFont("helvetica", "italic");
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const saeDef =
    "Any untoward medical occurrence that, at any dose: (1) results in death; (2) is life-threatening*; (3) requires inpatient hospitalisation or prolongation of existing hospitalisation; (4) results in persistent or significant disability/incapacity; (5) is a congenital anomaly/birth defect; or (6) is an Important Medical Event (IME) — a medical event that may not be immediately life-threatening or fatal, but may jeopardise the subject or require medical/surgical intervention to prevent one of the outcomes above (e.g., allergic bronchospasm, blood dyscrasias, convulsions).";
  const saeDefLines = doc.splitTextToSize(saeDef, innerW);
  doc.text(saeDefLines, ML, y + 5);
  y += 5 + saeDefLines.length * 3.6;

  // Asterisk clarification for "life-threatening" — same muted italic style.
  const lifeNote =
    '* "Life-threatening" means the subject was at immediate risk of death at the time of the event — not that the event could have been fatal in a more severe form.';
  const lifeNoteLines = doc.splitTextToSize(lifeNote, innerW);
  doc.text(lifeNoteLines, ML, y + 1);
  y += 1 + lifeNoteLines.length * 3.6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(180, 60, 40);
  doc.text("A different form must be used in case of SAE!", ML, y + 1);
  doc.setTextColor(0, 0, 0);
  y += 5;

  // --- Description ---
  // The description is the visual centerpiece of the form. Render it in
  // serif bold (Times) — distinct from the rest of the form (Helvetica) —
  // and center it both horizontally and vertically within its bordered box.
  y += 2;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Description of adverse event:", ML, y);
  y += 4;

  const descFontSize = 11.5;
  const descLineH = 5.2;
  const descPadX = 6;
  doc.setFont("times", "bold");
  doc.setFontSize(descFontSize);
  doc.setTextColor(0, 0, 0);
  const descLines = doc.splitTextToSize(
    form.description,
    innerW - descPadX * 2
  ) as string[];
  const linesBlockH = descLines.length * descLineH;
  const descBoxH = Math.max(linesBlockH + 12, 26);

  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.rect(ML, y, innerW, descBoxH);

  // First-line baseline so the whole block sits visually centered in the box.
  // Adding ~0.7 * lineH lowers the baseline from the block-top into the
  // cap-height region for Times at this size.
  const firstBaselineY =
    y + (descBoxH - linesBlockH) / 2 + descLineH * 0.72;
  doc.text(descLines, ML + innerW / 2, firstBaselineY, {
    align: "center",
  });

  y += descBoxH + 5;

  // --- Date/Time table (3 cols) ---
  function fmtDT(date: string, time: string): string {
    if (!date && !time) return "—";
    const d = formatDMY(date) || "—";
    const t = time || "—";
    return `${d}   ${t}`;
  }
  const lastDoseCell = form.lastDoseNone
    ? "None\n(not yet dosed)"
    : fmtDT(form.lastDoseDate, form.lastDoseTime);
  autoTable(doc, {
    startY: y,
    head: [
      [
        "Starting (Date · Time)",
        "Ending (Date · Time)",
        "Last dose before AE (Date · Time)",
      ],
    ],
    body: [
      [
        fmtDT(form.startDate, form.startTime),
        fmtDT(form.endDate, form.endTime),
        lastDoseCell,
      ],
    ],
    theme: "grid",
    headStyles: {
      fillColor: [240, 240, 240],
      textColor: [20, 20, 20],
      fontSize: 8.5,
      fontStyle: "bold",
      halign: "center",
    },
    bodyStyles: {
      fontSize: 10,
      halign: "center",
      cellPadding: 2.5,
      textColor: [20, 20, 20],
    },
    styles: { lineColor: [160, 160, 160], lineWidth: 0.2 },
    margin: { left: ML, right: MR },
  });
  y =
    (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable
      ?.finalY ?? y;
  y += 5;

  // --- Assessment matrix (manual render) ---
  // Custom layout: filled black circle for selected, hollow gray circle for
  // unselected. Text is always regular weight (bold-vs-regular caused width
  // asymmetry → some selected options wrapped while regular didn't). Visual
  // emphasis comes from the bullet fill + color contrast (black vs gray),
  // which keeps every option on the same number of lines.
  {
    const COL_W = [25, 24, 27, 47, 32, 31]; // sums to 186 = innerW
    const cellPadX = 1.6;
    const cellPadY = 3;
    const lineH = 4.2;
    const headerH = 7;
    const bulletR = 0.9;
    const bulletGap = 2.4; // gap between bullet center and text start

    // Pre-compute wrapped text lines per option. Use regular font for ALL
    // options so the measurement is consistent; selection emphasis is purely
    // visual via bullet fill + text color, not font weight.
    type OptLayout = { selected: boolean; lines: string[] };
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const colLayouts: OptLayout[][] = MATRIX_GROUPS.map((g, i) => {
      const textW = COL_W[i] - cellPadX * 2 - bulletGap - bulletR;
      const selectedVal = form.assessment[g.key];
      return g.options.map((opt) => {
        const isSel = Array.isArray(selectedVal)
          ? selectedVal.includes(opt.value)
          : opt.value === selectedVal;
        const text = `${opt.value}=${opt.label}`;
        const lines = doc.splitTextToSize(text, textW) as string[];
        return { selected: isSel, lines };
      });
    });

    // Body height = tallest column total
    let bodyH = 0;
    for (const col of colLayouts) {
      const h = col.reduce((sum, ol) => sum + ol.lines.length * lineH, 0);
      if (h > bodyH) bodyH = h;
    }
    bodyH += cellPadY * 2;

    const matrixStartY = y;
    const totalH = headerH + bodyH;

    // Outer border
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.2);
    doc.rect(ML, matrixStartY, innerW, totalH);

    // Header background
    doc.setFillColor(240, 240, 240);
    doc.rect(ML, matrixStartY, innerW, headerH, "F");

    // Header texts + vertical dividers (full height)
    let cx = ML;
    for (let i = 0; i < MATRIX_GROUPS.length; i++) {
      const w = COL_W[i];
      if (i > 0) {
        doc.setDrawColor(160, 160, 160);
        doc.setLineWidth(0.2);
        doc.line(cx, matrixStartY, cx, matrixStartY + totalH);
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8.5);
      doc.setTextColor(20, 20, 20);
      doc.text(MATRIX_GROUPS[i].title, cx + w / 2, matrixStartY + 4.7, {
        align: "center",
      });
      cx += w;
    }

    // Header bottom divider
    doc.setDrawColor(160, 160, 160);
    doc.setLineWidth(0.2);
    doc.line(ML, matrixStartY + headerH, ML + innerW, matrixStartY + headerH);

    // Body — render each column's options
    cx = ML;
    for (let i = 0; i < MATRIX_GROUPS.length; i++) {
      const w = COL_W[i];
      let oy = matrixStartY + headerH + cellPadY + 2.6; // baseline of first line

      for (const ol of colLayouts[i]) {
        const bulletX = cx + cellPadX + bulletR + 0.2;
        const bulletY = oy - 1.3;

        if (ol.selected) {
          doc.setFillColor(0, 0, 0);
          doc.setDrawColor(0, 0, 0);
          doc.setLineWidth(0.2);
          doc.circle(bulletX, bulletY, bulletR, "FD");
        } else {
          doc.setDrawColor(130, 130, 130);
          doc.setLineWidth(0.3);
          doc.circle(bulletX, bulletY, bulletR, "S");
        }

        doc.setFont("helvetica", "normal");
        doc.setFontSize(8.5);
        if (ol.selected) {
          doc.setTextColor(0, 0, 0);
        } else {
          doc.setTextColor(135, 135, 135);
        }
        doc.text(ol.lines, bulletX + bulletGap, oy);

        oy += ol.lines.length * lineH;
      }

      cx += w;
    }

    y = matrixStartY + totalH + 6;
  }

  // --- Informed person + Action taken specify ---
  // Measure the bold label width while bold is still the active font —
  // measuring after switching to regular underestimates the width and the
  // value text overlaps the label.
  const informedLabel = "Informed person's phone, e-mail:";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  const informedLabelW = doc.getTextWidth(informedLabel);
  doc.text(informedLabel, ML, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  const infoStart = ML + informedLabelW + 2.5;
  doc.text(form.informedPerson || "—", infoStart, y);
  doc.setDrawColor(160, 160, 160);
  doc.setLineWidth(0.2);
  doc.line(infoStart, y + 1, ML + innerW, y + 1);
  y += 6;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text("Action Taken:", ML, y);
  y += 4;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  const actionLines = doc.splitTextToSize(form.actionDetails || "—", innerW);
  const actionBoxH = Math.max(actionLines.length * 4.5 + 4, 14);
  doc.setDrawColor(180, 180, 180);
  doc.setLineWidth(0.2);
  doc.rect(ML, y, innerW, actionBoxH);
  doc.text(actionLines, ML + 2, y + 5);
  y += actionBoxH + 8;

  // --- Signature row ---
  // Ensure room for signature, footer
  const minNeeded = 28;
  if (y > pageH - minNeeded) {
    doc.addPage();
    y = 20;
  }

  const dateLabel = "Date of report:";
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.setTextColor(0, 0, 0);
  doc.text(dateLabel, ML, y);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(20, 20, 20);
  doc.text(formatDMY(form.dateOfReport) || "—", ML + doc.getTextWidth(dateLabel) + 2, y);

  // Right side signature
  const sigLineX1 = ML + innerW - 75;
  const sigLineX2 = ML + innerW;
  const sigY = y + 4;
  doc.setDrawColor(40, 40, 40);
  doc.setLineWidth(0.3);
  doc.line(sigLineX1, sigY, sigLineX2, sigY);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(9);
  doc.setTextColor(0, 0, 0);
  doc.text("Signature of investigator", (sigLineX1 + sigLineX2) / 2, sigY + 4, {
    align: "center",
  });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(80, 80, 80);
  doc.text(form.investigatorName, (sigLineX1 + sigLineX2) / 2, sigY + 8.5, {
    align: "center",
  });

  // Footer on every page: CONFIDENTIAL centered, page number right-aligned.
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(140, 140, 140);
    doc.text("CONFIDENTIAL", pageW / 2, pageH - 8, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text(`Page ${p} / ${totalPages}`, pageW - MR, pageH - 8, {
      align: "right",
    });
  }

  // Filename
  const study = sanitizeFilenamePart(form.studyCode);
  const volunteer = sanitizeFilenamePart(form.volunteerNo);
  const dateForFile = compactDate(form.dateOfReport);
  const filename = `AE-Form_${study}_${volunteer}_AE${form.aeNumber}_${dateForFile}.pdf`;
  doc.save(filename);
}
