import { parseCsv } from "./csv";

export type Verdict = "TP" | "FP" | "UNSURE";

export interface LabelRow {
  id: string;
  set: string;
  ruleId: string;
  verdict: Verdict;
}

export interface Ratio {
  num: number;
  den: number;
  value: number | null;
  lo: number | null;
  hi: number | null;
}

export interface GroupMetrics {
  name: string;
  total: number;
  decided: number;
  tp: number;
  fp: number;
  unsure: number;
  rulesOnlyPrecision: Ratio;
  ai?: {
    kept: number;
    precision: Ratio;
    tpRetention: Ratio; // fraction of real issues the AI layer kept
    fpReduction: Ratio; // fraction of false alarms the AI layer removed
  };
}

export interface RuleBreakdown {
  ruleId: string;
  tp: number;
  fp: number;
  unsure: number;
}

export interface EvalResult {
  groups: GroupMetrics[];
  byRule: RuleBreakdown[];
  unlabeled: number;
}

/** 95% Wilson score interval. Honest about small samples. */
export function wilson(k: number, n: number): { lo: number; hi: number } | null {
  if (n === 0) return null;
  const z = 1.96;
  const p = k / n;
  const denom = 1 + (z * z) / n;
  const center = (p + (z * z) / (2 * n)) / denom;
  const half = (z * Math.sqrt((p * (1 - p)) / n + (z * z) / (4 * n * n))) / denom;
  return { lo: Math.max(0, center - half), hi: Math.min(1, center + half) };
}

export function ratio(num: number, den: number): Ratio {
  const ci = wilson(num, den);
  return { num, den, value: den ? num / den : null, lo: ci?.lo ?? null, hi: ci?.hi ?? null };
}

export function parseLabels(csvText: string): { rows: LabelRow[]; unlabeled: number } {
  const table = parseCsv(csvText);
  if (table.length === 0) throw new Error("labels file is empty");
  const header = table[0].map((h) => h.trim().toLowerCase());
  const col = (name: string) => header.indexOf(name);
  if (col("id") < 0 || col("verdict") < 0) {
    throw new Error(
      `labels CSV needs "id" and "verdict" columns (found: ${header.join(", ")}). Generate the sheet with "rn-secscan export --csv".`
    );
  }
  const rows: LabelRow[] = [];
  const seen = new Set<string>();
  let unlabeled = 0;

  table.slice(1).forEach((r, i) => {
    const id = r[col("id")]?.trim();
    if (!id) return;
    if (seen.has(id)) throw new Error(`duplicate id on CSV row ${i + 2}: ${id}`);
    seen.add(id);
    const v = (r[col("verdict")] ?? "").trim().toUpperCase();
    if (v === "") {
      unlabeled++;
      return;
    }
    if (v !== "TP" && v !== "FP" && v !== "UNSURE") {
      throw new Error(`CSV row ${i + 2}: unknown verdict "${v}" (use TP, FP or UNSURE)`);
    }
    rows.push({
      id,
      set: (col("set") >= 0 && r[col("set")]?.trim()) || "unspecified",
      ruleId: (col("rule_id") >= 0 && r[col("rule_id")]?.trim()) || "unknown",
      verdict: v,
    });
  });
  return { rows, unlabeled };
}

/** Predictions are JSONL: {"id": "...", "keep": true|false}. keep=true means "real issue". */
export function parsePredictions(jsonl: string): Map<string, boolean> {
  const out = new Map<string, boolean>();
  jsonl.split(/\r?\n/).forEach((line, i) => {
    if (!line.trim()) return;
    let obj: any;
    try {
      obj = JSON.parse(line);
    } catch {
      throw new Error(`predictions line ${i + 1} is not valid JSON`);
    }
    if (typeof obj.id !== "string" || typeof obj.keep !== "boolean") {
      throw new Error(`predictions line ${i + 1} needs {"id": string, "keep": boolean}`);
    }
    out.set(obj.id, obj.keep);
  });
  return out;
}

function groupMetrics(name: string, rows: LabelRow[], preds?: Map<string, boolean>): GroupMetrics {
  const decided = rows.filter((r) => r.verdict !== "UNSURE");
  const tp = decided.filter((r) => r.verdict === "TP").length;
  const fp = decided.length - tp;
  const m: GroupMetrics = {
    name,
    total: rows.length,
    decided: decided.length,
    tp,
    fp,
    unsure: rows.length - decided.length,
    rulesOnlyPrecision: ratio(tp, decided.length),
  };
  if (preds) {
    const kept = decided.filter((r) => preds.get(r.id) === true);
    const keptTp = kept.filter((r) => r.verdict === "TP").length;
    const keptFp = kept.length - keptTp;
    m.ai = {
      kept: kept.length,
      precision: ratio(keptTp, kept.length),
      tpRetention: ratio(keptTp, tp),
      fpReduction: ratio(fp - keptFp, fp),
    };
  }
  return m;
}

export function evaluate(rows: LabelRow[], unlabeled = 0, preds?: Map<string, boolean>): EvalResult {
  if (preds) {
    const missing = rows.filter((r) => r.verdict !== "UNSURE" && !preds.has(r.id)).map((r) => r.id);
    if (missing.length) {
      throw new Error(
        `${missing.length} labeled finding(s) have no prediction (e.g. ${missing.slice(0, 3).join(", ")}). ` +
          `Run the judge on every labeled finding so both columns use the same rows.`
      );
    }
  }
  const sets = [...new Set(rows.map((r) => r.set))].sort();
  const groups = [groupMetrics("ALL", rows, preds), ...sets.map((s) => groupMetrics(s, rows.filter((r) => r.set === s), preds))];

  const byRuleMap = new Map<string, RuleBreakdown>();
  for (const r of rows) {
    const b = byRuleMap.get(r.ruleId) ?? { ruleId: r.ruleId, tp: 0, fp: 0, unsure: 0 };
    if (r.verdict === "TP") b.tp++;
    else if (r.verdict === "FP") b.fp++;
    else b.unsure++;
    byRuleMap.set(r.ruleId, b);
  }
  return { groups, byRule: [...byRuleMap.values()].sort((a, b) => a.ruleId.localeCompare(b.ruleId)), unlabeled };
}

const pct = (x: number | null) => (x === null ? "n/a" : `${(x * 100).toFixed(1)}%`);
const fmt = (r: Ratio) =>
  r.den === 0 ? "n/a (0 findings)" : `${r.num}/${r.den} = ${pct(r.value)} (95% CI ${pct(r.lo)} to ${pct(r.hi)})`;

export function formatEval(res: EvalResult): string {
  const out: string[] = [];
  for (const g of res.groups) {
    out.push(`Set: ${g.name}   decided ${g.decided} (${g.tp} TP, ${g.fp} FP), ${g.unsure} unsure excluded`);
    out.push(`  Rules only   precision ${fmt(g.rulesOnlyPrecision)}`);
    if (g.ai) {
      out.push(`  Rules + AI   precision ${fmt(g.ai.precision)}`);
      out.push(`               real issues kept   ${fmt(g.ai.tpRetention)}`);
      out.push(`               false alarms cut   ${fmt(g.ai.fpReduction)}`);
    }
    out.push("");
  }
  out.push("By rule (TP / FP / unsure):");
  for (const r of res.byRule) out.push(`  ${r.ruleId.padEnd(9)} ${r.tp} / ${r.fp} / ${r.unsure}`);
  if (res.unlabeled) out.push(`\n${res.unlabeled} finding(s) still have no verdict and are not counted.`);
  out.push(
    "\nNote: this measures triage precision only. It cannot measure scanner recall, because vulnerabilities the scanner missed are not in the label sheet."
  );
  return out.join("\n") + "\n";
}
