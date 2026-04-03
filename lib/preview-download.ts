import type { AnalysisDocumentV1 } from "@/lib/analysis/analysis-schemas";

export function sanitizeDownloadBasename(name: string): string {
  const s = name
    .replace(/[/\\?%*:|"<>]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
  return s.length > 0 ? s : "export";
}

export function downloadTextFile(
  filename: string,
  content: string,
  mimeType: string,
) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

function csvCellString(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function csvEscapeCell(raw: string): string {
  if (/[",\n\r]/.test(raw)) return `"${raw.replace(/"/g, '""')}"`;
  return raw;
}

/** RFC 4180-style CSV; UTF-8 BOM prefix helps Excel recognize encoding. */
export function tableRowsToCsv(
  rows: Record<string, unknown>[],
  keys: string[],
): string {
  const header = keys.map((k) => csvEscapeCell(k)).join(",");
  const body = rows.map((row) =>
    keys.map((k) => csvEscapeCell(csvCellString(row[k]))).join(","),
  );
  return `\uFEFF${[header, ...body].join("\r\n")}`;
}

export function analysisDocumentToMarkdown(opts: {
  title: string;
  asOfLabel: string | null;
  contextLine: string | null;
  document: AnalysisDocumentV1;
}): string {
  const lines: string[] = [`# ${opts.title}`, ""];

  const metaBits: string[] = [];
  if (opts.asOfLabel) metaBits.push(`As of ${opts.asOfLabel}`);
  if (opts.contextLine) metaBits.push(opts.contextLine);
  if (metaBits.length > 0) {
    lines.push(`*${metaBits.join(" · ")}*`, "");
  }

  opts.document.blocks.forEach((block, index) => {
    const n = index + 1;
    const kicker = `Section ${String(n).padStart(2, "0")}`;
    lines.push(`## ${kicker}${block.title ? ` — ${block.title}` : ""}`, "");
    lines.push(block.markdown.trimEnd(), "");
    if (block.chartData && block.chartData.length > 0) {
      lines.push(
        "### Chart data (tabular)",
        "",
        "```json",
        JSON.stringify(block.chartData, null, 2),
        "```",
        "",
      );
    }
    lines.push(`*Sources: ${block.sources}*`, "");
  });

  return lines.join("\n").trimEnd() + "\n";
}
