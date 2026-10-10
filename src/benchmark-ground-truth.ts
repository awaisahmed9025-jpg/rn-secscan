import fs from "node:fs";
import path from "node:path";
import { ratio, type Ratio } from "./eval";
import type { Finding } from "./types";

export type GroundTruthVerdict = "vulnerable" | "safe";
export type ExpectedDetection = "detect" | "miss" | "none";

export interface GroundTruthItem {
  file: string;
  line: number;
  category: string;
  expectedVerdict: GroundTruthVerdict;
  expectedDetection: ExpectedDetection;
}

export interface GroundTruthMetrics {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  trueNegatives: number;
  precision: Ratio;
  recall: Ratio;
  f1: number | null;
}

export function loadGroundTruth(file: string): GroundTruthItem[] {
  const parsed = JSON.parse(fs.readFileSync(file, "utf8")) as unknown;
  if (!Array.isArray(parsed)) throw new Error(`${file} must contain a JSON array`);
  return parsed as GroundTruthItem[];
}

export function scoreGroundTruth(root: string, findings: Finding[], groundTruth: GroundTruthItem[]): GroundTruthMetrics {
  const truth = new Map(groundTruth.map((item) => [`${item.file}:${item.line}`, item]));
  const detected = new Set(
    findings.map((finding) => {
      const file = path.isAbsolute(finding.file) ? path.relative(root, finding.file) : finding.file;
      return `${file.split(path.sep).join("/")}:${finding.line}`;
    }),
  );
  let truePositives = 0;
  let falseNegatives = 0;
  let trueNegatives = 0;
  for (const item of groundTruth) {
    const found = detected.has(`${item.file}:${item.line}`);
    if (item.expectedVerdict === "vulnerable") {
      if (found) truePositives++;
      else falseNegatives++;
    } else if (!found) {
      trueNegatives++;
    }
  }
  let falsePositives = 0;
  for (const key of detected) {
    const item = truth.get(key);
    if (!item || item.expectedVerdict === "safe") falsePositives++;
  }
  const precision = ratio(truePositives, truePositives + falsePositives);
  const recall = ratio(truePositives, truePositives + falseNegatives);
  const f1 = precision.value !== null && recall.value !== null && precision.value + recall.value > 0
    ? (2 * precision.value * recall.value) / (precision.value + recall.value)
    : null;
  return { truePositives, falsePositives, falseNegatives, trueNegatives, precision, recall, f1 };
}
