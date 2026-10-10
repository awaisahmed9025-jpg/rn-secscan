import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

export const DEFAULT_SEMGREP_PACKS = ["p/default", "p/secrets"];

export function getSemgrepPacks(value = process.env.RNSECAN_SEMGREP_RULE_PACKS) {
  const packs = (value ?? DEFAULT_SEMGREP_PACKS.join(","))
    .split(",")
    .map((pack) => pack.trim())
    .filter(Boolean);
  if (packs.length === 0) {
    throw new Error("RNSECAN_SEMGREP_RULE_PACKS must contain at least one rule pack");
  }
  return packs;
}

export function buildSemgrepArgs(target, packs = DEFAULT_SEMGREP_PACKS) {
  return [
    "scan",
    ...packs.flatMap((pack) => ["--config", pack]),
    "--json",
    "--quiet",
    target,
  ];
}

function writeReport(outputDir, outputName, report) {
  const outputPath = path.join(outputDir, outputName);
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2) + "\n");
  return outputPath;
}

export function runSemgrepTarget({ command = "semgrep", target, packs = getSemgrepPacks(), outputDir, outputName }) {
  let version;
  try {
    version = execFileSync(command, ["--version"], {
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    }).trim();
  } catch (error) {
    const report = {
      tool: "semgrep",
      available: false,
      error: `tool unavailable: could not run semgrep --version (${error.message})`,
      rulePacks: packs,
    };
    const outputPath = writeReport(outputDir, outputName, report);
    return { ok: false, outputPath, report };
  }

  const args = buildSemgrepArgs(target, packs);
  try {
    const stdout = execFileSync(command, args, {
      encoding: "utf8",
      maxBuffer: 128 * 1024 * 1024,
      shell: process.platform === "win32",
      stdio: ["ignore", "pipe", "pipe"],
    });
    const report = {
      tool: "semgrep",
      available: true,
      version,
      rulePacks: packs,
      ...JSON.parse(stdout),
    };
    const outputPath = writeReport(outputDir, outputName, report);
    return { ok: true, outputPath, report };
  } catch (error) {
    const stderr = error.stderr?.toString().trim() || error.message;
    const report = {
      tool: "semgrep",
      available: true,
      version,
      rulePacks: packs,
      error: `Semgrep scan failed (rule pack rejected or scan error): ${stderr}`,
    };
    const outputPath = writeReport(outputDir, outputName, report);
    return { ok: false, outputPath, report };
  }
}
