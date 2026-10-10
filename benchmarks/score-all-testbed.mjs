import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadGroundTruth, scoreGroundTruth } from "../dist/benchmark-ground-truth.js";
import { scan } from "../dist/scanner.js";
import { runEslintTarget } from "./eslint-runner.mjs";
import { runSemgrepTarget } from "./semgrep-runner.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const testbed = path.join(root, "testbed", "rn-vuln-app");
const truth = loadGroundTruth(path.join(testbed, "ground-truth.json"));
const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "rn-secscan-testbed-"));
const eslintCommand = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "eslint.cmd" : "eslint");
const eslintConfig = path.join(root, "benchmarks", "eslint.config.mjs");
const semgrepConfig = path.join(root, "benchmarks", "semgrep", "rn-security.yml");

function summarize(tool, version, findings) {
  const metrics = scoreGroundTruth(testbed, findings, truth);
  return {
    tool,
    version,
    testbed: "rn-vuln-app",
    truePositives: metrics.truePositives,
    falsePositives: metrics.falsePositives,
    falseNegatives: metrics.falseNegatives,
    precision: metrics.precision,
    recall: metrics.recall,
    f1: metrics.f1,
  };
}

try {
  const results = [];

  const rnFindings = scan(testbed, { base: testbed });
  results.push(summarize("rn-secscan", JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")).version, rnFindings));

  const eslintVersion = execFileSync(eslintCommand, ["--version"], {
    cwd: root,
    encoding: "utf8",
    shell: process.platform === "win32",
  }).trim();
  const eslintResult = runEslintTarget({
    command: eslintCommand,
    config: eslintConfig,
    target: "rn-vuln-app",
    outputDir,
    outputName: "eslint.json",
    cwd: testbed,
  });
  const eslintFindings = eslintResult.report.flatMap((file) =>
    (file.messages ?? []).filter((message) => message.line).map((message) => ({ file: file.filePath, line: message.line })),
  );
  results.push(summarize("eslint", eslintVersion, eslintFindings));

  const semgrep = runSemgrepTarget({
    target: testbed,
    packs: [semgrepConfig, "p/secrets"],
    outputDir,
    outputName: "semgrep.json",
  });
  if (!semgrep.ok) {
    results.push({ tool: "semgrep", available: false, error: semgrep.report.error });
  } else {
    const semgrepFindings = (semgrep.report.results ?? []).map((result) => ({
      file: result.path,
      line: result.start?.line,
    }));
    results.push(summarize("semgrep", semgrep.version, semgrepFindings));
  }

  console.log(JSON.stringify({
    testbed: "rn-vuln-app",
    groundTruthCases: truth.length,
    semgrepRules: ["benchmarks/semgrep/rn-security.yml", "p/secrets"],
    results,
  }, null, 2));
} finally {
  fs.rmSync(outputDir, { recursive: true, force: true });
}
