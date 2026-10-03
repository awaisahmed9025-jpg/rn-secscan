import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { redactLine } from "../src/redact";
import { exportFindings } from "../src/export";

describe("redactLine", () => {
  it("masks high-entropy literals and known key formats", () => {
    expect(redactLine('const apiKey = "k8Vd2xQp9LmZr4TbW7YnQQ";')).toContain("k8Vd****");
    const aws = "AKIA" + "IOSFODNN7EXAMPLE"; // built at runtime: no key-shaped text in the repo
    expect(redactLine(`x("${aws}")`)).not.toContain(aws);
  });
  it("leaves URLs, paths and ordinary identifiers alone", () => {
    for (const s of [
      'fetch("https://api.example.com/v1/some/long/path/here")',
      'import x from "../../components/SomeLongComponentName"',
      'const m = "authentication_failed_error";',
    ]) expect(redactLine(s)).toBe(s);
  });
});

describe("export never writes secret values", () => {
  it("masks the fixture secret in context, snippet and enclosing code", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rnsec-"));
    fs.mkdirSync(path.join(dir, "src"));
    fs.writeFileSync(
      path.join(dir, "src/api.ts"),
      'export function call() {\n  const apiKey = "k8Vd2xQp9LmZr4TbW7Yn";\n  return fetch("https://x.example/y", { headers: { k: apiKey } });\n}\n'
    );
    const recs = exportFindings(dir, { repoName: "tmp" });
    expect(recs.length).toBeGreaterThan(0);
    expect(JSON.stringify(recs)).not.toContain("k8Vd2xQp9LmZr4TbW7Yn");
    expect(JSON.stringify(recs)).toContain("k8Vd****");
  });
});
