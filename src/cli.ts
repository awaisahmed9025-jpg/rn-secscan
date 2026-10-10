#!/usr/bin/env node
import fs from "node:fs";
import { registerDataCommands } from "./commands/data";
import { Command } from "commander";
import { scan } from "./scanner";
import { allRules } from "./rules";
import { formatConsole } from "./reporters/console";
import { toSarif } from "./reporters/sarif";
import { SEVERITY_ORDER, type Severity } from "./types";
import { fixFindings, FIXABLE_RULES } from "./fix";

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { version } = require("../package.json");

const program = new Command();
program.name("rn-secscan").description("Security scanner for React Native apps").version(version);

program
  .command("scan")
  .argument("[path]", "project directory to scan", ".")
  .option("-f, --format <format>", "console | sarif | json", "console")
  .option("-o, --output <file>", "write the report to a file instead of stdout")
  .option("--fail-on <level>", "exit with code 1 if findings at or above this level exist: high | medium | low | none", "none")
  .option("--base <dir>", "directory that reported paths are relative to (default: current directory)")
  .option("--include-tests", "also scan test and mock files", false)
  .action((target: string, opts) => {
    if (!fs.existsSync(target)) {
      process.stderr.write(`rn-secscan: path not found: ${target}\n`);
      process.exit(2);
    }
    const findings = scan(target, { base: opts.base, includeTests: opts.includeTests });

    let report: string;
    if (opts.format === "sarif") report = JSON.stringify(toSarif(findings, allRules, version), null, 2) + "\n";
    else if (opts.format === "json") report = JSON.stringify(findings, null, 2) + "\n";
    else report = formatConsole(findings, !opts.output && process.stdout.isTTY === true && !process.env.NO_COLOR);

    if (opts.output) {
      fs.writeFileSync(opts.output, report);
      process.stderr.write(`rn-secscan: ${findings.length} finding(s), report written to ${opts.output}\n`);
    } else {
      process.stdout.write(report);
    }

    if (opts.failOn !== "none") {
      const threshold = SEVERITY_ORDER[opts.failOn as Severity];
      if (!threshold) {
        process.stderr.write(`rn-secscan: invalid --fail-on value "${opts.failOn}"\n`);
        process.exit(2);
      }
      if (findings.some((f) => SEVERITY_ORDER[f.severity] >= threshold)) process.exit(1);
    }
  });

program
  .command("rules")
  .description("list all rules and their OWASP MASVS mapping")
  .action(() => {
    for (const r of allRules) {
      process.stdout.write(`${r.id}  ${r.severity.padEnd(6)} ${r.masvs.padEnd(18)} ${r.title}\n`);
    }
  });

program
  .command("fix")
  .description("preview or apply safe fixes for selected findings")
  .argument("[path]", "project directory to fix", ".")
  .option("--rule <ids>", "comma-separated rules to fix", "RNSEC101,RNSEC002")
  .option("--write", "apply changes; without this flag, only preview them", false)
  .action((target: string, opts) => {
    if (!fs.existsSync(target)) {
      process.stderr.write(`rn-secscan: path not found: ${target}\n`);
      process.exit(2);
    }
    const requested = String(opts.rule)
      .split(",")
      .map((id: string) => id.trim())
      .filter(Boolean);
    const unsupported = requested.filter((id: string) => !FIXABLE_RULES.has(id));
    if (unsupported.length > 0) {
      process.stderr.write(`rn-secscan: unsupported fix rule(s): ${unsupported.join(", ")}\n`);
      process.exit(2);
    }

    const findings = scan(target, { base: target }).filter((finding) => requested.includes(finding.ruleId));
    const result = fixFindings(target, findings, opts.write);
    for (const change of result.changes) {
      process.stdout.write(`${opts.write ? "fixed" : "would fix"} ${change.ruleId} ${change.file}:${change.line}\n`);
      if (!opts.write) {
        process.stdout.write(`- ${change.before}\n+ ${change.after}\n`);
      }
    }
    process.stderr.write(
      `rn-secscan: ${result.changes.length} change(s) ${opts.write ? "applied" : "previewed"}; ${result.skipped.length} finding(s) skipped\n`
    );
  });

registerDataCommands(program);

program.parse();
