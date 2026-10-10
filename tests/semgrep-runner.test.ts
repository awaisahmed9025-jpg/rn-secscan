import { afterEach, describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const { buildSemgrepArgs, runSemgrepTarget } = await import("../benchmarks/semgrep-runner.mjs");
const temporaryDirectories: string[] = [];

afterEach(() => {
  for (const directory of temporaryDirectories.splice(0)) {
    fs.rmSync(directory, { recursive: true, force: true });
  }
});

describe("Semgrep benchmark runner", () => {
  it("builds explicit rule-pack arguments without auto configuration", () => {
    expect(buildSemgrepArgs("target", ["p/default", "p/secrets"])).toEqual([
      "scan",
      "--config", "p/default",
      "--config", "p/secrets",
      "--json",
      "--quiet",
      "target",
    ]);
  });

  it("writes an unavailable-tool result and reports failure", () => {
    const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "rnsec-semgrep-"));
    temporaryDirectories.push(outputDir);
    const result = runSemgrepTarget({
      command: "rn-secscan-semgrep-that-does-not-exist",
      target: "target",
      outputDir,
      outputName: "report.json",
    });
    expect(result.ok).toBe(false);
    expect(result.report.error).toMatch(/tool unavailable/);
    expect(JSON.parse(fs.readFileSync(result.outputPath, "utf8"))).toMatchObject({
      available: false,
      rulePacks: ["p/default", "p/secrets"],
    });
  });
});
