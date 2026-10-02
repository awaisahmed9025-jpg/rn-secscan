import { describe, it, expect } from "vitest";
import path from "node:path";
import { scan } from "../src/scanner";
import { allRules } from "../src/rules";
import { toSarif } from "../src/reporters/sarif";

const root = path.resolve(__dirname, "..");
const vuln = path.join(root, "fixtures/vulnerable");
const safe = path.join(root, "fixtures/safe");

describe("scanner end to end", () => {
  it("finds every rule category in the vulnerable fixtures", () => {
    const ids = new Set(scan(vuln, { base: root }).map((f) => f.ruleId));
    for (const id of ["RNSEC001", "RNSEC002", "RNSEC003", "RNSEC004", "RNSEC005", "RNSEC101", "RNSEC102", "RNSEC103", "RNSEC110"]) {
      expect(ids.has(id), `${id} missing`).toBe(true);
    }
  });

  it("reports nothing in the safe fixtures (including __DEV__ guard and ignore comment)", () => {
    expect(scan(safe, { base: root })).toEqual([]);
  });

  it("uses forward-slash paths relative to base", () => {
    const f = scan(vuln, { base: root })[0];
    expect(f.file.startsWith("fixtures/vulnerable/")).toBe(true);
    expect(f.file).not.toContain("\\");
  });
});

describe("SARIF reporter", () => {
  const findings = scan(vuln, { base: root });
  const sarif = toSarif(findings, allRules, "0.1.0");

  it("has the required top-level structure", () => {
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].results).toHaveLength(findings.length);
  });

  it("maps every rule to a MASVS tag and every result to a declared rule", () => {
    const rules = sarif.runs[0].tool.driver.rules;
    for (const r of rules) expect(r.properties.tags.some((t) => t.startsWith("MASVS-"))).toBe(true);
    const declared = new Set(rules.map((r) => r.id));
    for (const res of sarif.runs[0].results) expect(declared.has(res.ruleId)).toBe(true);
  });
});
