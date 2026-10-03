import { describe, it, expect } from "vitest";
import { parseCsv } from "../src/csv";
import { evaluate, parseLabels, parsePredictions, wilson } from "../src/eval";

describe("parseCsv", () => {
  it("handles quotes, embedded commas/newlines, CRLF and BOM", () => {
    const rows = parseCsv('\uFEFFa,b\r\n"x, y","line1\nline2"\r\n');
    expect(rows).toEqual([["a", "b"], ["x, y", "line1\nline2"]]);
  });
});

describe("wilson interval", () => {
  it("is null for n = 0 and wide for tiny samples", () => {
    expect(wilson(0, 0)).toBeNull();
    const ci = wilson(2, 2)!;
    expect(ci.lo).toBeLessThan(0.5); // 2/2 must not look like certainty
    expect(ci.hi).toBe(1);
  });
});

const csv = [
  "id,set,rule_id,verdict",
  "a,dev,RNSEC001,TP",
  "b,dev,RNSEC001,FP",
  "c,dev,RNSEC004,FP",
  "d,heldout,RNSEC004,FP",
  "e,heldout,RNSEC002,UNSURE",
  "f,heldout,RNSEC002,",
].join("\n");

describe("parseLabels / evaluate", () => {
  const { rows, unlabeled } = parseLabels(csv);

  it("skips blank verdicts and counts them", () => {
    expect(rows).toHaveLength(5);
    expect(unlabeled).toBe(1);
  });

  it("excludes UNSURE from precision and reports per set", () => {
    const res = evaluate(rows, unlabeled);
    const all = res.groups.find((g) => g.name === "ALL")!;
    expect([all.tp, all.fp, all.unsure]).toEqual([1, 3, 1]);
    expect(all.rulesOnlyPrecision.value).toBeCloseTo(0.25);
    expect(res.groups.map((g) => g.name)).toEqual(["ALL", "dev", "heldout"]);
  });

  it("compares rules-only with rules + AI on the same rows", () => {
    // AI keeps a (TP) and wrongly keeps c (FP); drops b and d
    const preds = parsePredictions(
      ['{"id":"a","keep":true}', '{"id":"b","keep":false}', '{"id":"c","keep":true}', '{"id":"d","keep":false}', '{"id":"e","keep":true}'].join("\n")
    );
    const ai = evaluate(rows, unlabeled, preds).groups[0].ai!;
    expect(ai.kept).toBe(2);
    expect(ai.precision.num).toBe(1); // 1 of 2 kept is a real issue
    expect(ai.precision.den).toBe(2);
    expect(ai.tpRetention.value).toBe(1);
    expect(ai.fpReduction.num).toBe(2); // b and d removed, out of 3 FPs
    expect(ai.fpReduction.den).toBe(3);
  });

  it("errors when a labeled finding has no prediction", () => {
    const preds = parsePredictions('{"id":"a","keep":true}');
    expect(() => evaluate(rows, unlabeled, preds)).toThrow(/no prediction/);
  });

  it("rejects unknown verdicts and sheets without an id column", () => {
    expect(() => parseLabels("id,verdict\nx,maybe")).toThrow(/unknown verdict/);
    expect(() => parseLabels("repo,verdict\nx,TP")).toThrow(/"id"/);
  });
});
