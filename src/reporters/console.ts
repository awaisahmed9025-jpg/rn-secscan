import type { Finding, Severity } from "../types";

const COLORS: Record<Severity, string> = { high: "\x1b[31m", medium: "\x1b[33m", low: "\x1b[36m" };
const DIM = "\x1b[2m";
const BOLD = "\x1b[1m";
const RESET = "\x1b[0m";

export function formatConsole(findings: Finding[], color = true): string {
  const c = (code: string, s: string) => (color ? `${code}${s}${RESET}` : s);
  if (findings.length === 0) return c(BOLD, "No issues found.") + "\n";

  const byFile = new Map<string, Finding[]>();
  for (const f of findings) byFile.set(f.file, [...(byFile.get(f.file) ?? []), f]);

  const out: string[] = [];
  for (const [file, items] of byFile) {
    out.push(c(BOLD, file));
    for (const f of items) {
      out.push(`  ${String(f.line).padStart(4)}  ${c(COLORS[f.severity], f.severity.toUpperCase().padEnd(6))} ${f.ruleId}  ${f.message}`);
      out.push(c(DIM, `        ${f.masvs} | ${f.snippet}`));
    }
    out.push("");
  }

  const count = (s: Severity) => findings.filter((f) => f.severity === s).length;
  out.push(c(BOLD, `${findings.length} finding${findings.length === 1 ? "" : "s"}`) + ` (${count("high")} high, ${count("medium")} medium, ${count("low")} low)`);
  return out.join("\n") + "\n";
}
