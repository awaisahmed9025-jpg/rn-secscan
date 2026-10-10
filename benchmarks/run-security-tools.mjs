import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { runEslintTarget } from "./eslint-runner.mjs";
import { getSemgrepPacks, runSemgrepTarget } from "./semgrep-runner.mjs";

const root = path.resolve(import.meta.dirname, "..");
const outputDir = process.env.RNSECAN_BENCHMARK_OUTPUT ?? path.resolve(root, "..", "rn-secscan-benchmark");
const targets = {
  repoR: path.resolve(root, "..", "rn-secscan-benchmark-targets", "repo-R"),
  repoS: path.resolve(root, "..", "rn-secscan-benchmark-targets", "repo-S"),
  repoT: path.resolve(root, "..", "rn-secscan-benchmark-targets", "repo-T"),
  repoU: path.resolve(root, "..", "rn-secscan-benchmark-targets", "repo-U"),
};
const eslintCommand = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "eslint.cmd" : "eslint");

fs.mkdirSync(outputDir, { recursive: true });

function run(label, command, args, outputFile, cwd = root) {
  try {
    const stdout = execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    fs.writeFileSync(path.join(outputDir, outputFile), stdout);
    console.log(`${label}: wrote ${path.join(outputDir, outputFile)}`);
  } catch (error) {
    const stdout = error.stdout?.toString() ?? "";
    const stderr = error.stderr?.toString() ?? error.message;
    if (stdout.trim()) {
      fs.writeFileSync(path.join(outputDir, outputFile), stdout);
      console.warn(`${label}: wrote report with exit code ${error.status ?? "unknown"}`);
    } else {
      fs.writeFileSync(path.join(outputDir, outputFile), JSON.stringify({ error: stderr }, null, 2) + "\n");
    }
    console.error(`${label}: failed: ${(stderr || `exit code ${error.status ?? "unknown"}`).trim()}`);
  }
}

for (const [name, target] of Object.entries(targets)) {
  const semgrep = runSemgrepTarget({
    target,
    packs: getSemgrepPacks(),
    outputDir,
    outputName: `semgrep-${name}.json`,
  });
  console.log(`semgrep/${name}: wrote ${semgrep.outputPath}`);
  if (!semgrep.ok) {
    console.error(`semgrep/${name}: ${semgrep.report.error}`);
    process.exitCode = 1;
  }
  try {
    const result = runEslintTarget({
      command: eslintCommand,
      config: path.join(root, "benchmarks", "eslint.config.mjs"),
      target: name,
      outputDir,
      outputName: `eslint-${name}.json`,
      cwd: target,
    });
    console.log(`eslint/${name}: wrote ${result.rawPath} and ${result.tallyPath}`);
  } catch (error) {
    console.error(`eslint/${name}: failed: ${error.message}`);
    process.exitCode = 1;
  }
}
