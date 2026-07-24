// Word (.docx) exporter for tube label sheets. Reproduces the Tanex TW-2052
// grid as a fixed-layout table: label columns are 46 mm wide, gutter columns
// 3 mm, every row exactly 21 mm high (HeightRule.EXACT clips overflow, so
// content can never push later rows down — no cumulative drift). Page margins
// carry the 11/8 mm sheet margins plus any printer calibration offsets.
import {
  AlignmentType,
  BorderStyle,
  Document,
  HeightRule,
  LineRuleType,
  Packer,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableLayoutType,
  TableRow,
  TabStopType,
  TextRun,
  WidthType,
  type ISectionOptions,
} from "docx";
import { LABEL_LAYOUT, type Calibration } from "./label-layout";
import {
  type LabelItem,
  type SubjectIdDigits,
  type TubeItem,
  type SeparatorItem,
  padSubject,
  separatorTexts,
  timeLine,
  tubeVariant,
  variantTag,
} from "./labels-shared";

const FONT_BODY = "Arial";
const FONT_SERIF = "Times New Roman";

function mmToTwips(mm: number): number {
  return Math.round((mm * 1440) / 25.4);
}

// A4 in twips
const PAGE_W = mmToTwips(210);
const PAGE_H = mmToTwips(297);

const CELL_PAD_X = mmToTwips(1.5);
const CELL_PAD_TOP = mmToTwips(0.7);

// Right tab stop at the label's inner width (46 − 2×1.5 mm padding).
const RIGHT_TAB = mmToTwips(LABEL_LAYOUT.labelW - 3);

type Line = { line: number; lineRule: (typeof LineRuleType)[keyof typeof LineRuleType] };

// Exact line height in points; keeps six lines inside the 21 mm cell.
function exactLine(pt: number): Line {
  return { line: pt * 20, lineRule: LineRuleType.EXACT };
}

const NO_BORDER = { style: BorderStyle.NONE, size: 0, color: "FFFFFF" } as const;
const TABLE_NO_BORDERS = {
  top: NO_BORDER,
  bottom: NO_BORDER,
  left: NO_BORDER,
  right: NO_BORDER,
  insideHorizontal: NO_BORDER,
  insideVertical: NO_BORDER,
} as const;

const LABEL_BORDER = { style: BorderStyle.SINGLE, size: 4, color: "B4B4B4" } as const;
const SEPARATOR_BORDER = { style: BorderStyle.DASHED, size: 4, color: "A0A0A0" } as const;

interface WordExportOptions {
  studyCode: string;
  drugName: string;
  subjectIdDigits: SubjectIdDigits;
  calibration: Calibration;
}

function tubeCellParagraphs(item: TubeItem, opts: WordExportOptions): Paragraph[] {
  const variant = tubeVariant(item);
  return [
    new Paragraph({
      spacing: exactLine(8),
      tabStops: [{ type: TabStopType.RIGHT, position: RIGHT_TAB }],
      children: [
        new TextRun({ text: "Study: ", bold: true, font: FONT_BODY, size: 10 }),
        new TextRun({ text: opts.studyCode, font: FONT_BODY, size: 10 }),
        new TextRun({ text: `\t${variantTag(variant)}`, bold: true, font: FONT_BODY, size: 10, color: "000000" }),
      ],
    }),
    new Paragraph({
      spacing: exactLine(10),
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: opts.drugName, bold: true, font: FONT_BODY, size: 12 })],
    }),
    new Paragraph({
      spacing: exactLine(7),
      children: [new TextRun({ text: "Subj. ID:", bold: true, font: FONT_BODY, size: 10 })],
    }),
    new Paragraph({
      spacing: exactLine(15),
      alignment: AlignmentType.CENTER,
      children: [
        new TextRun({
          text: padSubject(item.subject, opts.subjectIdDigits),
          bold: true,
          font: FONT_SERIF,
          size: 28,
        }),
      ],
    }),
    new Paragraph({
      spacing: exactLine(8),
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: timeLine(item.pointIndex, item.time), font: FONT_BODY, size: 12 })],
    }),
    new Paragraph({
      spacing: exactLine(7),
      children: [
        new TextRun({ text: "Period: ", bold: true, font: FONT_BODY, size: 10 }),
        new TextRun({ text: String(item.period), font: FONT_BODY, size: 10 }),
      ],
    }),
  ];
}

function separatorCellParagraphs(item: SeparatorItem): Paragraph[] {
  const t = separatorTexts(item);
  return [
    new Paragraph({
      spacing: { ...exactLine(12), before: 60 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: t.top, bold: true, font: FONT_BODY, size: 12, color: "323232" })],
    }),
    new Paragraph({
      spacing: { ...exactLine(8), before: 60 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: t.mid1, font: FONT_BODY, size: 9, color: "6E6E6E" })],
    }),
    new Paragraph({
      spacing: exactLine(8),
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: t.mid2, font: FONT_BODY, size: 9, color: "6E6E6E" })],
    }),
    new Paragraph({
      spacing: { ...exactLine(12), before: 80 },
      alignment: AlignmentType.CENTER,
      children: [new TextRun({ text: t.bottom, bold: true, font: FONT_BODY, size: 12, color: "323232" })],
    }),
  ];
}

function labelCell(item: LabelItem | null, widthTwips: number, opts: WordExportOptions): TableCell {
  const base = {
    width: { size: widthTwips, type: WidthType.DXA },
    margins: { top: CELL_PAD_TOP, bottom: 0, left: CELL_PAD_X, right: CELL_PAD_X },
  };
  if (item === null || item.type === "page-break") {
    return new TableCell({ ...base, children: [new Paragraph({ spacing: exactLine(1) })] });
  }
  if (item.type.startsWith("tube-")) {
    const borders = { top: LABEL_BORDER, bottom: LABEL_BORDER, left: LABEL_BORDER, right: LABEL_BORDER };
    return new TableCell({ ...base, borders, children: tubeCellParagraphs(item as TubeItem, opts) });
  }
  return new TableCell({
    ...base,
    borders: {
      top: SEPARATOR_BORDER,
      bottom: SEPARATOR_BORDER,
      left: SEPARATOR_BORDER,
      right: SEPARATOR_BORDER,
    },
    shading: { type: ShadingType.CLEAR, color: "auto", fill: "F8F8F8" },
    children: separatorCellParagraphs(item as SeparatorItem),
  });
}

function gutterCell(widthTwips: number): TableCell {
  return new TableCell({
    width: { size: widthTwips, type: WidthType.DXA },
    margins: { top: 0, bottom: 0, left: 0, right: 0 },
    children: [new Paragraph({ spacing: exactLine(1) })],
  });
}

function sheetTable(sheet: LabelItem[], opts: WordExportOptions): Table {
  const L = LABEL_LAYOUT;
  const cal = opts.calibration;
  const labelW = mmToTwips(L.labelW);
  const gutterW = mmToTwips(Math.max(0.5, L.gutterX + cal.pitchX));
  const rowH = mmToTwips(L.labelH + cal.pitchY);

  // 4 label columns interleaved with 3 gutter columns
  const columnWidths: number[] = [];
  for (let c = 0; c < L.cols; c++) {
    columnWidths.push(labelW);
    if (c < L.cols - 1) columnWidths.push(gutterW);
  }
  const tableW = columnWidths.reduce((a, b) => a + b, 0);

  const rows: TableRow[] = [];
  for (let r = 0; r < L.rows; r++) {
    const cells: TableCell[] = [];
    for (let c = 0; c < L.cols; c++) {
      const item = sheet[r * L.cols + c] ?? null;
      cells.push(labelCell(item, labelW, opts));
      if (c < L.cols - 1) cells.push(gutterCell(gutterW));
    }
    rows.push(
      new TableRow({
        height: { value: rowH, rule: HeightRule.EXACT },
        cantSplit: true,
        children: cells,
      })
    );
  }

  return new Table({
    layout: TableLayoutType.FIXED,
    width: { size: tableW, type: WidthType.DXA },
    columnWidths,
    borders: TABLE_NO_BORDERS,
    rows,
  });
}

export async function exportSheetsToWordBlob(sheets: LabelItem[][], opts: WordExportOptions): Promise<Blob> {
  const L = LABEL_LAYOUT;
  const cal = opts.calibration;

  const sections: ISectionOptions[] = sheets.map((sheet) => ({
    properties: {
      page: {
        size: { width: PAGE_W, height: PAGE_H },
        margin: {
          top: mmToTwips(Math.max(0, L.marginTop + cal.offsetY)),
          bottom: mmToTwips(4),
          left: mmToTwips(Math.max(0, L.marginLeft + cal.offsetX)),
          right: mmToTwips(4),
        },
      },
    },
    children: [
      sheetTable(sheet, opts),
      // Word requires a paragraph after a table; keep it 1pt tall so it fits
      // in the 13 mm bottom slack and never spills to a new page.
      new Paragraph({ spacing: exactLine(1) }),
    ],
  }));

  const doc = new Document({
    styles: {
      default: { document: { run: { font: FONT_BODY, size: 10 } } },
    },
    sections,
  });

  return Packer.toBlob(doc);
}
