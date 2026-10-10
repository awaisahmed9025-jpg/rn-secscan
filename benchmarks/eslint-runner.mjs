import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export function tallyEslintReport(report) {
  if (!Array.isArray(report)) {
    throw new Error("ESLint JSON report must be an array");
  }

  const findingsByRuleId = {};
  let parseErrors = 0;
  for (const file of report) {
    for (const message of file.messages ?? []) {
      if (message.ruleId === null) {
        parseErrors++;
      } else {
        findingsByRuleId[message.ruleId] = (findingsByRuleId[message.ruleId] ?? 0) + 1;
      }
    }
  }
  return {
    filesLinted: report.length,
    findingsByRuleId,
    parseErrors,
  };
}

export function assertFilesLinted(report, target) {
  if (!Array.isArray(report) || report.length === 0) {
    throw new Error(`ESLint linted zero files for target "${target}"`);
  }
}

export function runEslintTarget({ command, config, target, outputDir, outputName, cwd }) {
  const args = [
    "--config", config,
    "--format", "json",
    "--no-error-on-unmatched-pattern",
    "**/*.{ts,tsx,js,jsx}",
  ];
  let stdout = "";
  let status = 0;
  try {
    stdout = execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    stdout = error.stdout?.toString() ?? "";
    status = error.status ?? 1;
    if (!stdout.trim()) {
      throw new Error(`ESLint failed for "${target}" with no JSON report (exit ${status})`, { cause: error });
    }
  }

  let report;
  try {
    report = JSON.parse(stdout);
  } catch (error) {
    throw new Error(`ESLint produced invalid JSON for "${target}"`, { cause: error });
  }
  assertFilesLinted(report, target);

  const rawPath = path.join(outputDir, outputName);
  const tallyPath = rawPath.replace(/\.json$/, ".tally.json");
  fs.writeFileSync(rawPath, JSON.stringify(report, null, 2) + "\n");
  fs.writeFileSync(tallyPath, JSON.stringify(tallyEslintReport(report), null, 2) + "\n");
  return { report, status, rawPath, tallyPath };
}
