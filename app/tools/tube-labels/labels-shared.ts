// Label content model shared by the PDF and Word exporters.

export type Timepoint = {
  index: number;
  time: string;
};

export type Aliquot = "master" | "backup";
export type Section = "blood" | "plasma-master" | "plasma-backup";
export type SubjectIdDigits = 2 | 3;
export type TubeVariant = "blood" | "plasma-master" | "plasma-backup";

export type LabelItem =
  | { type: "tube-blood"; subject: number; period: number; pointIndex: number; time: string }
  | { type: "tube-plasma-master"; subject: number; period: number; pointIndex: number; time: string }
  | { type: "tube-plasma-backup"; subject: number; period: number; pointIndex: number; time: string }
  | { type: "separator-point"; fromPoint: number; toPoint: number; context: Section }
  | { type: "separator-period"; fromPeriod: number; toPeriod: number }
  | { type: "separator-aliquot"; fromAliquot: Aliquot; toAliquot: Aliquot }
  | { type: "separator-section"; fromSection: Section; toSection: Section }
  | { type: "page-break" };

export type TubeItem = Extract<LabelItem, { type: `tube-${string}` }>;
export type SeparatorItem = Exclude<LabelItem, TubeItem | { type: "page-break" }>;

export interface BuildParams {
  studyCode: string;
  drugName: string;
  subjects: number;
  periods: number;
  timepointsPerPeriod: number;
  timepoints: Timepoint[];
  duplicateTime0: boolean;
}

// --- Text helpers ---

export function padSubject(n: number, digits: SubjectIdDigits): string {
  return String(n).padStart(digits, "0");
}

export function pointLabel(idx: number): string {
  return `P${String(idx).padStart(2, "0")}`;
}

function normalizeTime(raw: string): string {
  // "Time 0" → "0"; "0.33" → "0.33"
  return raw.trim().replace(/^time\s+/i, "");
}

export function timeLine(pointIndex: number, time: string): string {
  return `${pointLabel(pointIndex)} · Time: ${normalizeTime(time)}`;
}

export function variantTag(variant: TubeVariant): string {
  if (variant === "blood") return "WHOLE BLOOD";
  if (variant === "plasma-master") return "PLASMA · MASTER";
  return "PLASMA · BACKUP";
}

export function tubeVariant(item: TubeItem): TubeVariant {
  if (item.type === "tube-blood") return "blood";
  if (item.type === "tube-plasma-master") return "plasma-master";
  return "plasma-backup";
}

function sectionDisplay(s: Section): string {
  if (s === "blood") return "BLOOD TUBE LABELS";
  if (s === "plasma-master") return "PLASMA · MASTER";
  return "PLASMA · BACKUP";
}

export interface SeparatorTexts {
  top: string;
  mid1: string;
  mid2: string;
  bottom: string;
}

export function separatorTexts(item: SeparatorItem): SeparatorTexts {
  if (item.type === "separator-point") {
    return {
      top: `END OF ${pointLabel(item.fromPoint)}`,
      mid1: "Please proceed to the",
      mid2: item.context === "blood" ? "next blood sampling point." : "next plasma sample.",
      bottom: `> NEXT: ${pointLabel(item.toPoint)}`,
    };
  }
  if (item.type === "separator-period") {
    return {
      top: `END OF PERIOD ${item.fromPeriod}`,
      mid1: "Please proceed to",
      mid2: `Period ${item.toPeriod}.`,
      bottom: `> NEXT: PERIOD ${item.toPeriod}`,
    };
  }
  if (item.type === "separator-aliquot") {
    const fromLabel = item.fromAliquot === "master" ? "ALIQUOT 1 (Master)" : "ALIQUOT 2 (Backup)";
    const toLabel = item.toAliquot === "master" ? "ALIQUOT 1 (Master)" : "ALIQUOT 2 (Backup)";
    return {
      top: `END OF ${fromLabel}`,
      mid1: "Please proceed to the",
      mid2: "next plasma aliquot.",
      bottom: `> NEXT: ${toLabel}`,
    };
  }
  return {
    top: `END OF ${sectionDisplay(item.fromSection)}`,
    mid1: "Switch label sheet.",
    mid2: "Next section starts here.",
    bottom: `> NEXT: ${sectionDisplay(item.toSection)}`,
  };
}

// --- Label sequence generation ---

function generateBloodTubeSection(p: BuildParams): LabelItem[] {
  const items: LabelItem[] = [];
  for (let period = 1; period <= p.periods; period++) {
    for (let pointIndex = 1; pointIndex <= p.timepointsPerPeriod; pointIndex++) {
      const time = p.timepoints[pointIndex - 1]?.time ?? "";
      const copies = pointIndex === 1 && period === 1 && p.duplicateTime0 ? 2 : 1;

      for (let subject = 1; subject <= p.subjects; subject++) {
        for (let c = 0; c < copies; c++) {
          items.push({ type: "tube-blood", subject, period, pointIndex, time });
        }
      }

      const isLastPoint = pointIndex === p.timepointsPerPeriod;
      const isLastPeriod = period === p.periods;

      if (isLastPoint && !isLastPeriod) {
        items.push({ type: "separator-period", fromPeriod: period, toPeriod: period + 1 });
      } else if (!isLastPoint) {
        items.push({ type: "separator-point", fromPoint: pointIndex, toPoint: pointIndex + 1, context: "blood" });
      }
    }
  }
  return items;
}

function generatePlasmaPeriodAliquot(p: BuildParams, period: number, aliquot: Aliquot): LabelItem[] {
  const items: LabelItem[] = [];
  const itemType: LabelItem["type"] = aliquot === "master" ? "tube-plasma-master" : "tube-plasma-backup";
  const sepContext: Section = aliquot === "master" ? "plasma-master" : "plasma-backup";
  for (let pointIndex = 1; pointIndex <= p.timepointsPerPeriod; pointIndex++) {
    const time = p.timepoints[pointIndex - 1]?.time ?? "";
    const copies = pointIndex === 1 && period === 1 && p.duplicateTime0 ? 2 : 1;

    for (let subject = 1; subject <= p.subjects; subject++) {
      for (let c = 0; c < copies; c++) {
        items.push({ type: itemType, subject, period, pointIndex, time } as LabelItem);
      }
    }

    if (pointIndex < p.timepointsPerPeriod) {
      items.push({ type: "separator-point", fromPoint: pointIndex, toPoint: pointIndex + 1, context: sepContext });
    }
  }
  return items;
}

export function generateAllItems(p: BuildParams): LabelItem[] {
  const items: LabelItem[] = [];

  // Section 1: Blood tube labels
  items.push(...generateBloodTubeSection(p));

  // Force a fresh page before plasma section
  items.push({ type: "page-break" });

  // Plasma section starts with a section transition separator
  items.push({ type: "separator-section", fromSection: "blood", toSection: "plasma-master" });

  // Section 2: Plasma, grouped by period (master → backup within each period)
  for (let period = 1; period <= p.periods; period++) {
    items.push(...generatePlasmaPeriodAliquot(p, period, "master"));
    items.push({ type: "separator-aliquot", fromAliquot: "master", toAliquot: "backup" });
    items.push(...generatePlasmaPeriodAliquot(p, period, "backup"));

    if (period < p.periods) {
      items.push({ type: "separator-period", fromPeriod: period, toPeriod: period + 1 });
    }
  }

  return items;
}

export function packIntoSheets(items: LabelItem[], cellsPerSheet: number): LabelItem[][] {
  const sheets: LabelItem[][] = [];
  let current: LabelItem[] = [];
  for (const item of items) {
    if (item.type === "page-break") {
      if (current.length > 0) {
        sheets.push(current);
        current = [];
      }
      continue;
    }
    if (current.length === cellsPerSheet) {
      sheets.push(current);
      current = [];
    }
    current.push(item);
  }
  if (current.length > 0) sheets.push(current);
  return sheets;
}
