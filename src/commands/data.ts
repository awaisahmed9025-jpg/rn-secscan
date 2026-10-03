import fs from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import type { Command } from "commander";
import { appendLabelSheet, exportFindings, writeJsonl } from "../export";
import { evaluate, formatEval, parseLabels, parsePredictions } from "../eval";
import { judgeRecords, parseExportJsonl, predictionsJsonl } from "../judge";

/** Registers the `export` and `eval` commands used for building and measuring the AI triage layer. */
export function registerDataCommands(program: Command): void {
  program
    .command("judge")
    .description("send redacted finding context to Claude for optional triage")
    .requiredOption("-i, --input <file>", "export JSONL file to judge")
    .requiredOption("-o, --output <file>", "write JSONL predictions for the eval command")
    .requiredOption("--model <model>", "Claude model ID to use")
    .requiredOption("--confirm-code-transfer", "confirm redacted source context may be sent to Anthropic")
    .action(async (opts) => {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        process.stderr.write("rn-secscan: set ANTHROPIC_API_KEY in the environment before running judge\n");
        process.exitCode = 2;
        return;
      }
      if (!fs.existsSync(opts.input)) {
        process.stderr.write(`rn-secscan: input file not found: ${opts.input}\n`);
        process.exitCode = 2;
        return;
      }

      try {
        const records = parseExportJsonl(fs.readFileSync(opts.input, "utf8"));
        process.stderr.write(
          `rn-secscan: sending redacted context for ${records.length} finding(s) to Anthropic model ${opts.model}\n`
        );
        const predictions = await judgeRecords(records, new Anthropic({ apiKey }), opts.model);
        fs.writeFileSync(opts.output, predictionsJsonl(predictions));
        process.stderr.write(`rn-secscan: wrote ${predictions.length} prediction(s) to ${opts.output}\n`);
      } catch (error) {
        process.stderr.write(`rn-secscan: judge failed: ${(error as Error).message}\n`);
        process.exitCode = 1;
      }
    });

  program
    .command("export")
    .description("scan a repo and export findings with code context for labeling or the AI judge")
    .argument("<path>", "repo directory to scan")
    .requiredOption("-o, --output <file>", "JSONL file with findings + context (contains third-party code: keep local)")
    .option("--csv <file>", "also append new findings to a labeling sheet (existing rows are never changed)")
    .option("--set <name>", "dev | heldout | rich (used to report metrics per set)", "unspecified")
    .option("--repo-name <name>", "name stored in ids (defaults to the folder name)")
    .option("--context <n>", "lines of context before and after each finding", "20")
    .option("--include-tests", "also scan test files", false)
    .action((target: string, opts) => {
      if (!fs.existsSync(target)) {
        process.stderr.write(`rn-secscan: path not found: ${target}\n`);
        process.exit(2);
      }
      const records = exportFindings(target, {
        set: opts.set,
        repoName: opts.repoName,
        contextLines: Number(opts.context),
        includeTests: opts.includeTests,
      });
      writeJsonl(opts.output, records);
      process.stderr.write(`rn-secscan: exported ${records.length} finding(s) to ${opts.output}\n`);
      if (opts.csv) {
        const { added, skipped } = appendLabelSheet(opts.csv, records);
        process.stderr.write(`rn-secscan: ${opts.csv}: ${added} new row(s) added, ${skipped} already present\n`);
      }
    });

  program
    .command("eval")
    .description("compute precision from a labeled sheet, optionally comparing rules-only with rules + AI")
    .requiredOption("--labels <file>", "labeling sheet CSV (id, verdict, set, rule_id columns)")
    .option("--predictions <files...>", "JSONL file(s) of {id, keep} from the AI judge")
    .option("--json", "print machine-readable JSON", false)
    .action((opts) => {
      const { rows, unlabeled } = parseLabels(fs.readFileSync(opts.labels, "utf8"));
      let preds: Map<string, boolean> | undefined;
      if (opts.predictions) {
        preds = new Map();
        for (const f of opts.predictions as string[]) {
          for (const [k, v] of parsePredictions(fs.readFileSync(f, "utf8"))) preds.set(k, v);
        }
      }
      const result = evaluate(rows, unlabeled, preds);
      process.stdout.write(opts.json ? JSON.stringify(result, null, 2) + "\n" : formatEval(result));
    });
}
