import { describe, expect, it, vi } from "vitest";
import type { ExportRecord } from "../src/export";
import { judgeRecords, parseExportJsonl, predictionsJsonl, type JudgeClient } from "../src/judge";

const record = {
  id: "private-repo:RNSEC001:src/auth.ts:12",
  set: "dev",
  repo: "private-repo",
  commit: "commit-sha",
  ruleId: "RNSEC001",
  masvs: "MASVS-STORAGE-1",
  severity: "high",
  message: "Sensitive value stored insecurely",
  file: "src/auth.ts",
  line: 12,
  snippet: "AsyncStorage.setItem(<redacted>)",
  context: ">    12 | AsyncStorage.setItem(<redacted>)",
  enclosing: { name: "saveToken", startLine: 10, code: "function saveToken() { /* redacted */ }" },
  verdict: null,
  reason: "",
} as ExportRecord;

function mockClient(input: unknown): { client: JudgeClient; create: ReturnType<typeof vi.fn> } {
  const create = vi.fn().mockResolvedValue({
    content: [{ type: "tool_use", name: "classify_finding", input }],
  });
  return { client: { messages: { create } } as unknown as JudgeClient, create };
}

describe("judgeRecords", () => {
  it("requests structured output without sending repo identifiers or source paths", async () => {
    const { client, create } = mockClient({ keep: true, confidence: "high", reason: "The token is persisted." });
    const result = await judgeRecords([record], client, "claude-test-model");

    expect(result).toEqual([{ id: record.id, keep: true, confidence: "high", reason: "The token is persisted." }]);
    const request = create.mock.calls[0][0];
    const serialized = JSON.stringify(request);
    expect(serialized).toContain(record.context);
    expect(serialized).toContain(record.enclosing!.code);
    expect(serialized).not.toContain(record.id);
    expect(serialized).not.toContain(record.repo);
    expect(serialized).not.toContain(record.file);
    expect(serialized).not.toContain(record.commit);
  });

  it("rejects invalid structured decisions", async () => {
    const { client } = mockClient({ keep: "maybe", confidence: "certain", reason: "" });
    await expect(judgeRecords([record], client, "claude-test-model")).rejects.toThrow(/invalid classify_finding/);
  });

  it("rejects responses without the forced tool block", async () => {
    const client = {
      messages: { create: vi.fn().mockResolvedValue({ content: [{ type: "text", text: "no tool" }] }) },
    } as unknown as JudgeClient;
    await expect(judgeRecords([record], client, "claude-test-model")).rejects.toThrow(/did not return/);
  });
});

describe("judge JSONL helpers", () => {
  it("parses exported records and ignores blank lines", () => {
    expect(parseExportJsonl(`${JSON.stringify(record)}\n\n`)).toHaveLength(1);
  });

  it("reports invalid JSONL lines clearly", () => {
    expect(() => parseExportJsonl("not-json")).toThrow(/line 1 is not valid JSON/);
  });

  it("writes prediction JSONL compatible with eval", () => {
    expect(predictionsJsonl([{ id: "finding-1", keep: false, confidence: "medium", reason: "Test finding." }])).toBe(
      '{"id":"finding-1","keep":false,"confidence":"medium","reason":"Test finding."}\n'
    );
  });
});