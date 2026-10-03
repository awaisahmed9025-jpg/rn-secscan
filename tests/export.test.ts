import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { appendLabelSheet, exportFindings, SHEET_HEADER } from "../src/export";
import { parseCsv } from "../src/csv";

const vuln = path.resolve(__dirname, "../fixtures/vulnerable");

describe("exportFindings", () => {
  const records = exportFindings(vuln, { set: "dev", repoName: "repo-A", contextLines: 3 });

  it("produces unique ids that use the pseudonymous repo name", () => {
    expect(records.length).toBeGreaterThan(0);
    expect(new Set(records.map((r) => r.id)).size).toBe(records.length);
    expect(records.every((r) => r.id.startsWith("repo-A:"))).toBe(true);
    expect(records.every((r) => r.set === "dev")).toBe(true);
  });

  it("includes a numbered context window with the finding line marked", () => {
    const r = records.find((x) => x.ruleId === "RNSEC001")!;
    expect(r.context).toContain("AsyncStorage.setItem");
    expect(r.context.split("\n").some((l) => l.startsWith(">"))).toBe(true);
  });

  it("includes the enclosing function for JS/TS findings", () => {
    const r = records.find((x) => x.ruleId === "RNSEC001")!;
    expect(r.enclosing?.name).toBe("saveSession");
    expect(r.enclosing?.code).toContain("AsyncStorage.setItem");
  });

  it("leaves native findings without an enclosing function", () => {
    const r = records.find((x) => x.ruleId === "RNSEC101")!;
    expect(r.enclosing).toBeUndefined();
  });
});

describe("appendLabelSheet", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "rnsec-"));
  const records = exportFindings(vuln, { set: "dev", repoName: "repo-A" });

  it("creates the sheet, then never touches existing rows on a second export", () => {
    const file = path.join(dir, "labels.csv");
    const first = appendLabelSheet(file, records);
    expect(first.added).toBe(records.length);

    // simulate the user labeling the first row, saved by Excel with CRLF
    const text = fs.readFileSync(file, "utf8").split("\n");
    text[1] = text[1].replace(/,,$/, ",TP,real token in storage");
    fs.writeFileSync(file, text.join("\r\n"));

    const second = appendLabelSheet(file, records);
    expect(second.added).toBe(0);
    expect(second.skipped).toBe(records.length);
    expect(fs.readFileSync(file, "utf8")).toContain("TP,real token in storage");
  });

  it("refuses to append to a file with a different header", () => {
    const file = path.join(dir, "old.csv");
    fs.writeFileSync(file, "repo,rule,verdict\nx,y,TP\n");
    expect(() => appendLabelSheet(file, records)).toThrow(/header/);
  });

  it("writes the expected header", () => {
    const file = path.join(dir, "fresh.csv");
    appendLabelSheet(file, records);
    expect(parseCsv(fs.readFileSync(file, "utf8"))[0]).toEqual(SHEET_HEADER);
  });
});
