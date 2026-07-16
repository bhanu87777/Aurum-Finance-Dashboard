// Server-side CSV helpers: generation for export routes, parsing for import.

// RFC 4180-style escaping: quote when the cell contains a comma, quote, or newline.
function esc(v: string | number): string {
  const s = String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function toCsv(headers: string[], rows: (string | number)[][]): string {
  const lines = [headers.map(esc).join(",")];
  for (const row of rows) lines.push(row.map(esc).join(","));
  return lines.join("\r\n") + "\r\n";
}

export function csvResponse(filename: string, csv: string): Response {
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}

// Minimal state-machine parser: handles quoted cells, embedded commas,
// escaped quotes ("") and embedded newlines. Hard cap keeps serverless
// memory bounded — callers surface the cap as a validation error.
export const CSV_MAX_ROWS = 5_000;

export function parseCsv(text: string): string[][] {
  // Strip BOM so the first header cell matches cleanly.
  if (text.charCodeAt(0) === 0xfeff) text = text.slice(1);

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(cell);
      cell = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      cell = "";
      // Skip fully empty trailing/blank lines.
      if (row.length > 1 || row[0] !== "") rows.push(row);
      row = [];
      if (rows.length > CSV_MAX_ROWS) throw new Error(`CSV exceeds ${CSV_MAX_ROWS} rows.`);
    } else {
      cell += ch;
    }
  }
  if (cell !== "" || row.length > 0) {
    row.push(cell);
    if (row.length > 1 || row[0] !== "") rows.push(row);
  }
  return rows;
}
