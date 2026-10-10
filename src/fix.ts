import fs from "node:fs";
import path from "node:path";
import type { Finding } from "./types";

export const FIXABLE_RULES = new Set(["RNSEC002", "RNSEC101"]);

export interface FixChange {
  file: string;
  ruleId: string;
  line: number;
  before: string;
  after: string;
}

export interface FixResult {
  changes: FixChange[];
  skipped: Finding[];
}

function replaceAndroidBackup(line: string): string {
  if (/android:allowBackup\s*=\s*"true"/.test(line)) {
    return line.replace(/android:allowBackup\s*=\s*"true"/, 'android:allowBackup="false"');
  }
  if (/<application(?:\s|>)/.test(line) && !/android:allowBackup\s*=/.test(line)) {
    return line.replace(/<application(?=\s|>)/, '<application android:allowBackup="false"');
  }
  return line;
}

function replaceHttp(line: string): string {
  return line.replace(/http:\/\//i, "https://");
}

function applyFinding(content: string, finding: Finding): string {
  const lines = content.split(/\r?\n/);
  const index = finding.line - 1;
  if (index < 0 || index >= lines.length) return content;

  if (finding.ruleId === "RNSEC101") lines[index] = replaceAndroidBackup(lines[index]);
  if (finding.ruleId === "RNSEC002") lines[index] = replaceHttp(lines[index]);
  return lines.join("\n");
}

export function fixFindings(target: string, findings: Finding[], write: boolean): FixResult {
  const changes: FixChange[] = [];
  const skipped: Finding[] = [];
  const originalByFile = new Map<string, string>();
  const updatedByFile = new Map<string, string>();

  for (const finding of findings) {
    if (!FIXABLE_RULES.has(finding.ruleId)) {
      skipped.push(finding);
      continue;
    }
    const file = path.resolve(target, finding.file);
    const original = originalByFile.get(file) ?? fs.readFileSync(file, "utf8");
    const current = updatedByFile.get(file) ?? original;
    const updated = applyFinding(current, finding);
    const beforeLine = current.split(/\r?\n/)[finding.line - 1] ?? "";
    const afterLine = updated.split(/\r?\n/)[finding.line - 1] ?? "";
    if (beforeLine === afterLine) {
      skipped.push(finding);
      continue;
    }
    originalByFile.set(file, original);
    updatedByFile.set(file, updated);
    changes.push({
      file: path.relative(target, file).split(path.sep).join("/"),
      ruleId: finding.ruleId,
      line: finding.line,
      before: beforeLine,
      after: afterLine,
    });
  }

  if (write) {
    for (const [file, content] of updatedByFile) fs.writeFileSync(file, content);
  }
  return { changes, skipped };
}
