import { describe, expect, it } from "vitest";

const { assertFilesLinted, tallyEslintReport } = await import("../benchmarks/eslint-runner.mjs");

describe("ESLint benchmark report", () => {
  it("tallies rule findings separately from parse errors", () => {
    expect(
      tallyEslintReport([
        {
          filePath: "a.ts",
          messages: [
            { ruleId: "security/detect-eval-with-expression" },
            { ruleId: "security/detect-eval-with-expression" },
            { ruleId: null },
          ],
        },
        { filePath: "b.ts", messages: [{ ruleId: "security/detect-object-injection" }] },
      ]),
    ).toEqual({
      filesLinted: 2,
      findingsByRuleId: {
        "security/detect-eval-with-expression": 2,
        "security/detect-object-injection": 1,
      },
      parseErrors: 1,
    });
  });

  it("fails loudly when ESLint linted zero files", () => {
    expect(() => assertFilesLinted([], "empty-target")).toThrow(/linted zero files/);
  });
});
