import { describe, expect, it } from "vitest";
import { compareBenchmarkFindings, normalizeFindings } from "../src/benchmark";

const findings = [
  { tool: "rn-secscan", target: "app", file: "src/a.ts", line: 10, ruleId: "RNSEC001" },
  { tool: "semgrep", target: "app", file: "src/a.ts", line: 10, ruleId: "rnsec-benchmark-asyncstorage-sensitive" },
  { tool: "semgrep", target: "app", file: "src/b.ts", line: 20, ruleId: "unknown-rule" },
  { tool: "rn-secscan", target: "app", file: "src/c.ts", line: 30, ruleId: "RNSEC002" },
];

describe("benchmark normalization", () => {
  it("maps known rules and keeps unknown findings as other", () => {
    expect(normalizeFindings(findings).map((finding) => finding.category)).toEqual([
      "asyncstorage-secrets",
      "asyncstorage-secrets",
      "other",
      "cleartext-http",
    ]);
  });

  it("builds coverage, counts, pooled blind rows, and hand-checkable metrics", () => {
    const result = compareBenchmarkFindings(
      findings,
      new Map([
        ["app:src/a.ts:10", "TP"],
        ["app:src/c.ts:30", "FP"],
      ]),
    );
    expect(result.coverage["rn-secscan"]["asyncstorage-secrets"]).toBe(true);
    expect(result.coverage.eslint["hardcoded-secrets"]).toBe(false);
    expect(result.counts.semgrep.app["other"]).toBe(1);
    expect(result.pooled).toEqual([
      { id: "app:src/a.ts:10", target: "app", file: "src/a.ts", line: 10, categories: ["asyncstorage-secrets"] },
      { id: "app:src/c.ts:30", target: "app", file: "src/c.ts", line: 30, categories: ["cleartext-http"] },
    ]);
    expect(result.pooledSources["app:src/a.ts:10"].tools).toEqual(["rn-secscan", "semgrep"]);
    expect(result.metrics["rn-secscan"].precision.value).toBe(0.5);
    expect(result.metrics["rn-secscan"].relativeRecall.value).toBe(1);
    expect(result.metrics.semgrep.precision.value).toBe(1);
    expect(result.metrics.semgrep.relativeRecall.value).toBe(1);
  });
});
