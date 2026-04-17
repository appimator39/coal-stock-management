// Minimal CSV helpers — no dependencies, handles quoting + BOM for Excel.

function quote(cell: unknown): string {
  if (cell == null) return "";
  const s = String(cell);
  if (/[",\n\r]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function toCSV(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) return "";
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((k) => set.add(k));
      return set;
    }, new Set<string>()),
  );
  const lines = [headers.map(quote).join(",")];
  for (const row of rows) {
    lines.push(headers.map((h) => quote(row[h])).join(","));
  }
  return lines.join("\n");
}

export function downloadCSV(filename: string, rows: Array<Record<string, unknown>>) {
  const csv = toCSV(rows);
  // Prepend UTF-8 BOM so Excel reads it correctly.
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
