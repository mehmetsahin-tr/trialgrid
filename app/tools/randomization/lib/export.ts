// Client-side export helpers. CSV is produced with a Blob (zero dependency);
// XLSX reuses the dependency-free writer in xlsx.ts. Nothing leaves the browser.

import type { Cell } from "./xlsx.ts";

function escapeCSV(value: Cell): string {
  const s = String(value);
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

/** Serialize a 2-D matrix to CSV text (CRLF line endings for Excel/SAS). */
export function toCSV(matrix: Cell[][]): string {
  return matrix.map((row) => row.map(escapeCSV).join(",")).join("\r\n");
}

/** Trigger a client-side download of arbitrary bytes/text. */
export function download(filename: string, mime: string, data: string | Uint8Array | Blob): void {
  const blob = new Blob([data as BlobPart], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
