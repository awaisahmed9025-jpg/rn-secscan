import { describe, expect, it, vi } from "vitest";
import type { ExportRecord } from "../src/export";
import { isTriageCandidate, judgeRecords, parseExportJsonl, predictionsJsonl, type JudgeClient } from "../src/judge";

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
    usage: { input_tokens: 0, output_tokens: 0 },
  });
  return { client: { messages: { create } } as unknown as JudgeClient, create };
}

describe("judgeRecords", () => {
  it("requests structured output without sending repo identifiers or source paths", async () => {
    const { client, create } = mockClient({ keep: true, confidence: "high", reason: "The token is persisted." });
    const result = await judgeRecords([record], client, "claude-test-model");

    expect(result[0]).toMatchObject({
      id: record.id,
      keep: true,
      confidence: "high",
      reason: "The token is persisted.",
      model: "claude-test-model",
      promptVersion: "rn-secscan-judge-v1",
      source: "claude",
      inputTokens: 0,
      outputTokens: 0,
    });
    expect(Number.isNaN(Date.parse(result[0].judgedAt))).toBe(false);
    const request = create.mock.calls[0][0];
    const serialized = JSON.stringify(request);
    expect(serialized).toContain(record.context);
    expect(serialized).toContain(record.enclosing!.code);
    expect(serialized).not.toContain(record.id);
    expect(serialized).not.toContain(record.repo);
    expect(serialized).not.toContain(record.file);
    expect(serialized).not.toContain(record.commit);
    expect(serialized).toContain("untrusted data");
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

  it("keeps native and known-format secret findings without calling the model", async () => {
    const { client, create } = mockClient({ keep: false, confidence: "high", reason: "ignored" });
    const deterministic = [
      { ...record, id: "native", ruleId: "RNSEC102", severity: "high" as const },
      { ...record, id: "known-secret", ruleId: "RNSEC003", severity: "high" as const },
    ];
    const result = await judgeRecords(deterministic, client, "claude-test-model");

    expect(create).not.toHaveBeenCalled();
    expect(result.map(({ id, keep, source }) => ({ id, keep, source }))).toEqual([
      { id: "native", keep: true, source: "rule-only" },
      { id: "known-secret", keep: true, source: "rule-only" },
    ]);
  });

  it("limits model triage to contextual JavaScript rules", () => {
    expect(isTriageCandidate({ ruleId: "RNSEC001", severity: "high" })).toBe(true);
    expect(isTriageCandidate({ ruleId: "RNSEC003", severity: "medium" })).toBe(true);
    expect(isTriageCandidate({ ruleId: "RNSEC003", severity: "high" })).toBe(false);
    expect(isTriageCandidate({ ruleId: "RNSEC102", severity: "high" })).toBe(false);
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
    expect(predictionsJsonl([{
      id: "finding-1",
      keep: false,
      confidence: "medium",
      reason: "Test finding.",
      model: "claude-test-model",
      promptVersion: "rn-secscan-judge-v1",
      judgedAt: "2026-10-04T00:00:00.000Z",
      inputTokens: 20,
      outputTokens: 10,
      source: "claude",
    }])).toBe(
      '{"id":"finding-1","keep":false,"confidence":"medium","reason":"Test finding.","model":"claude-test-model","promptVersion":"rn-secscan-judge-v1","judgedAt":"2026-10-04T00:00:00.000Z","inputTokens":20,"outputTokens":10,"source":"claude"}\n'
    );
  });
});