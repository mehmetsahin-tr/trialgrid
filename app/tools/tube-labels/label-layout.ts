// Tube label sheet geometry (all values in mm, A4 portrait).
// Cells are placed from absolute (x, y) offsets — never stacked with
// cumulative margins — so misalignment cannot accumulate down the page.
export const LABEL_LAYOUT = {
  pageWidth: 210,
  pageHeight: 297,
  marginTop: 11,
  marginBottom: 11,
  marginLeft: 8,
  marginRight: 8,
  cols: 4,
  rows: 13,
  labelW: 46,
  labelH: 21,
  gutterX: 3,
  gutterY: 0,
  cornerRadius: 1.5,
} as const;

export const CELLS_PER_SHEET = LABEL_LAYOUT.cols * LABEL_LAYOUT.rows; // 52

// Printer calibration, applied on top of the base grid.
// offsetX/offsetY shift the whole grid (constant misalignment: printer feed
// offset). pitchX/pitchY add extra mm per column/row step (cumulative
// misalignment: real die-cut pitch differs from the nominal 49/21 mm).
export interface Calibration {
  offsetX: number;
  offsetY: number;
  pitchX: number;
  pitchY: number;
}

export const ZERO_CALIBRATION: Calibration = { offsetX: 0, offsetY: 0, pitchX: 0, pitchY: 0 };

// Top-left corner of cell at column c (0-based).
export function cellX(c: number, cal: Calibration = ZERO_CALIBRATION): number {
  return LABEL_LAYOUT.marginLeft + cal.offsetX + c * (LABEL_LAYOUT.labelW + LABEL_LAYOUT.gutterX + cal.pitchX);
}

// Top-left corner of cell at row r (0-based).
export function cellY(r: number, cal: Calibration = ZERO_CALIBRATION): number {
  return LABEL_LAYOUT.marginTop + cal.offsetY + r * (LABEL_LAYOUT.labelH + LABEL_LAYOUT.gutterY + cal.pitchY);
}

// Geometry must fit the page; fail loudly at module load if the constants drift.
(() => {
  const L = LABEL_LAYOUT;
  const usedW = L.marginLeft + L.cols * L.labelW + (L.cols - 1) * L.gutterX + L.marginRight;
  const usedH = L.marginTop + L.rows * L.labelH + (L.rows - 1) * L.gutterY + L.marginBottom;
  if (usedW > L.pageWidth) {
    throw new Error(`LABEL_LAYOUT horizontal overflow: ${usedW}mm > ${L.pageWidth}mm`);
  }
  if (usedH > L.pageHeight) {
    throw new Error(`LABEL_LAYOUT vertical overflow: ${usedH}mm > ${L.pageHeight}mm`);
  }
})();
