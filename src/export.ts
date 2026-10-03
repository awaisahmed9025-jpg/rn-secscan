import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { Node, Project, SyntaxKind } from "ts-morph";
import { scan } from "./scanner";
import { csvEscape, parseCsv } from "./csv";
import { redactLine } from "./redact";
import type { Severity } from "./types";

export interface ExportOptions {
  set?: string; // e.g. "dev", "heldout", "rich"
  repoName?: string; // use a pseudonym (repo-A) if you publish anything
  contextLines?: number;
  includeTests?: boolean;
}

export interface ExportRecord {
  id: string;
  set: string;
  repo: string;
  commit?: string;
  ruleId: string;
  masvs: string;
  severity: Severity;
  message: string;
  file: string;
  line: number;
  snippet: string;
  /** Numbered code window around the finding. Contains third-party source: keep local. */
  context: string;
  enclosing?: { name: string; startLine: number; code: string };
  verdict: null;
  reason: string;
}

const FUNCTION_KINDS = new Set<SyntaxKind>([
  SyntaxKind.FunctionDeclaration,
  SyntaxKind.MethodDeclaration,
  SyntaxKind.ArrowFunction,
  SyntaxKind.FunctionExpression,
]);
const MAX_FUNCTION_LINES = 80;

function gitCommit(root: string): string | undefined {
  try {
    return execFileSync("git", ["-C", root, "rev-parse", "HEAD"], { stdio: ["ignore", "pipe", "ignore"] })
      .toString()
      .trim();
  } catch {
    return undefined;
  }
}

function nameOf(n: Node): string {
  if (Node.isFunctionDeclaration(n) || Node.isMethodDeclaration(n)) return n.getName() ?? "(anonymous)";
  const p = n.getParent();
  if (p && (Node.isVariableDeclaration(p) || Node.isPropertyAssignment(p))) return p.getName();
  return "(anonymous)";
}

function enclosingFunction(project: Project, abs: string, line: number) {
  if (!/\.(tsx?|jsx?)$/.test(abs)) return undefined;
  const sf = project.getSourceFile(abs) ?? project.addSourceFileAtPath(abs);
  let best: Node | undefined;
  for (const n of sf.getDescendants()) {
    if (!FUNCTION_KINDS.has(n.getKind())) continue;
    if (n.getStartLineNumber() > line || n.getEndLineNumber() < line) continue;
    if (!best || n.getEnd() - n.getStart() < best.getEnd() - best.getStart()) best = n;
  }
  if (!best) return undefined;
  return {
    name: nameOf(best),
    startLine: best.getStartLineNumber(),
    code: best.getText().split("\n").slice(0, MAX_FUNCTION_LINES).map(redactLine).join("\n"),
  };
}

function contextWindow(lines: string[], line: number, radius: number): string {
  const start = Math.max(1, line - radius);
  const end = Math.min(lines.length, line + radius);
  const out: string[] = [];
  for (let i = start; i <= end; i++) {
    out.push(`${i === line ? ">" : " "} ${String(i).padStart(5)} | ${redactLine(lines[i - 1])}`);
  }
  return out.join("\n");
}

export function exportFindings(root: string, opts: ExportOptions = {}): ExportRecord[] {
  const abs = path.resolve(root);
  const repo = opts.repoName ?? path.basename(abs);
  const set = opts.set ?? "unspecified";
  const radius = opts.contextLines ?? 20;
  const commit = gitCommit(abs);

  // Paths are relative to the repo root so they resolve against `abs`.
  const findings = scan(abs, { base: abs, includeTests: opts.includeTests });
  const project = new Project({ skipAddingFilesFromTsConfig: true, compilerOptions: { allowJs: true } });
  const fileCache = new Map<string, string[]>();
  const seen = new Map<string, number>();

  return findings.map((f) => {
    const full = path.join(abs, f.file);
    if (!fileCache.has(full)) fileCache.set(full, fs.readFileSync(full, "utf8").split(/\r?\n/));

    // Stable, unique id. Two findings of one rule on one line get a #n suffix.
    const base = `${repo}:${f.ruleId}:${f.file}:${f.line}`;
    const n = (seen.get(base) ?? 0) + 1;
    seen.set(base, n);

    return {
      id: n === 1 ? base : `${base}#${n}`,
      set,
      repo,
      commit,
      ruleId: f.ruleId,
      masvs: f.masvs,
      severity: f.severity,
      message: f.message,
      file: f.file,
      line: f.line,
      snippet: redactLine(f.snippet),
      context: contextWindow(fileCache.get(full)!, f.line, radius),
      enclosing: enclosingFunction(project, full, f.line),
      verdict: null,
      reason: "",
    };
  });
}

export function writeJsonl(file: string, records: unknown[]): void {
  fs.writeFileSync(file, records.map((r) => JSON.stringify(r)).join("\n") + (records.length ? "\n" : ""));
}

export const SHEET_HEADER = ["id", "set", "repo", "commit", "rule_id", "severity", "file", "line", "verdict", "reason"];

/**
 * Appends new findings to a labeling sheet. Existing rows (and the verdicts
 * you typed into them) are never modified or removed.
 */
export function appendLabelSheet(file: string, records: ExportRecord[]): { added: number; skipped: number } {
  let existingText = "";
  const existingIds = new Set<string>();

  if (fs.existsSync(file)) {
    existingText = fs.readFileSync(file, "utf8");
    const table = parseCsv(existingText);
    const header = (table[0] ?? []).map((h) => h.trim().toLowerCase());
    if (header.join(",") !== SHEET_HEADER.join(",")) {
      throw new Error(
        `${file} exists but its header is not "${SHEET_HEADER.join(",")}". Use a new file name for the labeling sheet.`
      );
    }
    for (const row of table.slice(1)) if (row[0]) existingIds.add(row[0].trim());
  }

  const fresh = records.filter((r) => !existingIds.has(r.id));
  const lines = fresh.map((r) =>
    [r.id, r.set, r.repo, r.commit ?? "", r.ruleId, r.severity, r.file, r.line, "", ""].map(csvEscape).join(",")
  );

  if (!existingText) {
    fs.writeFileSync(file, [SHEET_HEADER.join(","), ...lines].join("\n") + "\n");
  } else if (lines.length) {
    const sep = /\n$/.test(existingText) ? "" : "\n";
    fs.appendFileSync(file, sep + lines.join("\n") + "\n");
  }
  return { added: fresh.length, skipped: records.length - fresh.length };
}
