import { describe, expect, it } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fixFindings } from "../src/fix";
import type { Finding } from "../src/types";

const finding = (ruleId: Finding["ruleId"], file: string, line: number): Finding => ({
  ruleId,
  masvs: "MASVS-NETWORK-1",
  severity: "medium",
  message: "test",
  file,
  line,
  snippet: "test",
});

describe("fixFindings", () => {
  it("previews without changing files and fixes supported findings when requested", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rn-secscan-fix-"));
    const file = path.join(dir, "AndroidManifest.xml");
    fs.writeFileSync(file, '<application android:allowBackup="true">\n</application>\n');
    try {
      const preview = fixFindings(dir, [finding("RNSEC101", "AndroidManifest.xml", 1)], false);
      expect(preview.changes).toHaveLength(1);
      expect(fs.readFileSync(file, "utf8")).toContain('android:allowBackup="true"');

      const applied = fixFindings(dir, [finding("RNSEC101", "AndroidManifest.xml", 1)], true);
      expect(applied.changes).toHaveLength(1);
      expect(fs.readFileSync(file, "utf8")).toContain('android:allowBackup="false"');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });

  it("converts only the reported HTTP line and skips non-fixable rules", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rn-secscan-fix-"));
    const file = path.join(dir, "source.ts");
    fs.writeFileSync(file, 'const url = "http://example.com";\nconst value = "http://other.example";\n');
    try {
      const result = fixFindings(
        dir,
        [finding("RNSEC002", "source.ts", 1), finding("RNSEC004", "source.ts", 2)],
        true
      );
      expect(result.changes).toHaveLength(1);
      expect(result.skipped).toHaveLength(1);
      expect(fs.readFileSync(file, "utf8")).toContain('const url = "https://example.com";');
      expect(fs.readFileSync(file, "utf8")).toContain('const value = "http://other.example";');
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
