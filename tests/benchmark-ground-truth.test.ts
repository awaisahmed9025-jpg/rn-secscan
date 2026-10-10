import path from "node:path";
import { describe, expect, it } from "vitest";
import { loadGroundTruth, scoreGroundTruth } from "../src/benchmark-ground-truth";
import { scan } from "../src/scanner";

const root = path.resolve(__dirname, "../testbed/rn-vuln-app");

describe("rn-vuln-app ground truth", () => {
  it("scores rn-secscan findings against the planted cases", () => {
    const truth = loadGroundTruth(path.join(root, "ground-truth.json"));
    const metrics = scoreGroundTruth(root, scan(root, { base: root }), truth);
    expect(metrics.truePositives).toBe(9);
    expect(metrics.falsePositives).toBe(0);
    expect(metrics.falseNegatives).toBe(3);
    expect(metrics.precision.value).toBe(1);
    expect(metrics.recall.value).toBeCloseTo(0.75);
    expect(metrics.f1).toBeCloseTo(0.857142857);
  });

  it("counts a finding on a safe ground-truth row as a false positive", () => {
    const truth = loadGroundTruth(path.join(root, "ground-truth.json"));
    const metrics = scoreGroundTruth(root, [{ file: "App.tsx", line: 10 } as never], truth);
    expect(metrics.falsePositives).toBe(1);
    expect(metrics.trueNegatives).toBe(8);
  });
});
