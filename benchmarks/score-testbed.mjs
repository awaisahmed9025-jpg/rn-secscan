import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadGroundTruth, scoreGroundTruth } from "../dist/benchmark-ground-truth.js";
import { scan } from "../dist/scanner.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testbed = path.join(root, "testbed", "rn-vuln-app");
const truth = loadGroundTruth(path.join(testbed, "ground-truth.json"));
const metrics = scoreGroundTruth(testbed, scan(testbed, { base: testbed }), truth);

console.log(JSON.stringify({
  tool: "rn-secscan",
  testbed: "rn-vuln-app",
  truePositives: metrics.truePositives,
  falsePositives: metrics.falsePositives,
  falseNegatives: metrics.falseNegatives,
  precision: metrics.precision,
  recall: metrics.recall,
  f1: metrics.f1,
}, null, 2));
