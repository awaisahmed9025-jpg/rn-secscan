import fs from "node:fs";
import path from "node:path";
import fg from "fast-glob";
import { Project } from "ts-morph";
import type { Finding, JsRule, NativeRule, Rule } from "./types";
import { jsRules as defaultJs, nativeRules as defaultNative } from "./rules";

export interface ScanOptions {
  /** Directory that reported paths are relative to. Defaults to process.cwd(). */
  base?: string;
  includeTests?: boolean;
  rules?: Rule[];
}

const COMMON_IGNORE = ["**/node_modules/**", "**/Pods/**", "**/build/**", "**/dist/**", "**/.git/**", "**/DerivedData/**"];
const TEST_IGNORE = ["**/*.test.*", "**/*.spec.*", "**/__tests__/**", "**/__mocks__/**"];
const JS_IGNORE = ["**/android/**", "**/ios/**", "**/*.d.ts", "**/*.min.js", "**/*.bundle.js"];

const IGNORE_COMMENT = /rn-secscan-ignore(?:\s+([A-Z0-9, ]+))?/;

function isSuppressed(lines: string[], line: number, ruleId: string): boolean {
  for (const l of [lines[line - 1], lines[line - 2]]) {
    const m = l?.match(IGNORE_COMMENT);
    if (!m) continue;
    const ids = m[1]?.split(/[ ,]+/).filter(Boolean);
    if (!ids || ids.length === 0 || ids.includes(ruleId)) return true;
  }
  return false;
}

export function scan(target: string, opts: ScanOptions = {}): Finding[] {
  const root = path.resolve(target);
  const base = path.resolve(opts.base ?? process.cwd());
  const rules = opts.rules;
  const js: JsRule[] = rules ? (rules.filter((r) => r.kind === "js") as JsRule[]) : defaultJs;
  const native: NativeRule[] = rules ? (rules.filter((r) => r.kind === "native") as NativeRule[]) : defaultNative;

  const ignore = [...COMMON_IGNORE, ...(opts.includeTests ? [] : TEST_IGNORE)];
  const findings: Finding[] = [];

  // --- JS / TS ---
  const jsFiles = fg.sync(["**/*.{ts,tsx,js,jsx}"], { cwd: root, absolute: true, ignore: [...ignore, ...JS_IGNORE] });
  const project = new Project({ skipAddingFilesFromTsConfig: true, compilerOptions: { allowJs: true } });
  for (const f of jsFiles) project.addSourceFileAtPath(f);
  for (const sf of project.getSourceFiles()) {
    for (const rule of js) {
      try {
        findings.push(...rule.check(sf));
      } catch (err) {
        process.stderr.write(`rn-secscan: rule ${rule.id} failed on ${sf.getFilePath()}: ${(err as Error).message}\n`);
      }
    }
  }

  // --- Native config ---
  const nativeFiles = fg.sync(["**/AndroidManifest.xml", "**/Info.plist"], { cwd: root, absolute: true, ignore });
  for (const f of nativeFiles) {
    const content = fs.readFileSync(f, "utf8");
    for (const rule of native) {
      if (!rule.appliesTo(f)) continue;
      try {
        findings.push(...rule.check({ path: f, content }));
      } catch (err) {
        process.stderr.write(`rn-secscan: rule ${rule.id} failed on ${f}: ${(err as Error).message}\n`);
      }
    }
  }

  // --- Suppressions + relative paths ---
  const lineCache = new Map<string, string[]>();
  const result: Finding[] = [];
  for (const f of findings) {
    if (!lineCache.has(f.file)) lineCache.set(f.file, fs.readFileSync(f.file, "utf8").split("\n"));
    if (isSuppressed(lineCache.get(f.file)!, f.line, f.ruleId)) continue;
    result.push({ ...f, file: path.relative(base, f.file).split(path.sep).join("/") });
  }

  return result.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
}
