import Anthropic from "@anthropic-ai/sdk";
import type { ExportRecord } from "./export";

export interface JudgePrediction {
  id: string;
  keep: boolean;
  confidence: "high" | "medium" | "low";
  reason: string;
}

export type JudgeClient = Pick<Anthropic, "messages">;

const TOOL_NAME = "classify_finding";

export async function judgeRecords(
  records: ExportRecord[],
  client: JudgeClient,
  model: string
): Promise<JudgePrediction[]> {
  const predictions: JudgePrediction[] = [];

  for (const record of records) {
    const response = await client.messages.create({
      model,
      max_tokens: 256,
      system:
        "You triage static security findings in React Native apps. Decide whether the finding is a real security issue in the supplied code. The scanner's concern may be a false positive. Do not assume runtime behavior or configuration that is not shown. If context is insufficient, keep the finding and use low confidence. Return only the requested structured tool result.",
      tools: [
        {
          name: TOOL_NAME,
          description: "Classify this finding and explain the decision briefly.",
          input_schema: {
            type: "object",
            properties: {
              keep: { type: "boolean", description: "True when the finding should remain visible." },
              confidence: { type: "string", enum: ["high", "medium", "low"] },
              reason: { type: "string", description: "A concise explanation based only on supplied code." },
            },
            required: ["keep", "confidence", "reason"],
            additionalProperties: false,
          },
        },
      ],
      tool_choice: { type: "tool", name: TOOL_NAME },
      messages: [
        {
          role: "user",
          content: [
            `Rule: ${record.ruleId}`,
            `MASVS control: ${record.masvs}`,
            `Severity: ${record.severity}`,
            "Redacted source context:",
            record.context,
            record.enclosing ? `Enclosing function code:\n${record.enclosing.code}` : "",
          ]
            .filter(Boolean)
            .join("\n\n"),
        },
      ],
    });

    const result = response.content.find((block) => block.type === "tool_use" && block.name === TOOL_NAME);
    if (!result || result.type !== "tool_use") {
      throw new Error(`Claude did not return a ${TOOL_NAME} result for finding ${record.ruleId}`);
    }

    const input = result.input as Record<string, unknown>;
    if (
      typeof input.keep !== "boolean" ||
      !["high", "medium", "low"].includes(String(input.confidence)) ||
      typeof input.reason !== "string" ||
      input.reason.trim().length === 0
    ) {
      throw new Error(`Claude returned an invalid ${TOOL_NAME} result for finding ${record.ruleId}`);
    }

    predictions.push({
      id: record.id,
      keep: input.keep,
      confidence: input.confidence as JudgePrediction["confidence"],
      reason: input.reason.trim(),
    });
  }

  return predictions;
}

export function parseExportJsonl(text: string): ExportRecord[] {
  return text
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0)
    .map((line, index) => {
      let record: unknown;
      try {
        record = JSON.parse(line);
      } catch {
        throw new Error(`export JSONL line ${index + 1} is not valid JSON`);
      }
      if (
        !record ||
        typeof record !== "object" ||
        typeof (record as ExportRecord).id !== "string" ||
        typeof (record as ExportRecord).ruleId !== "string" ||
        typeof (record as ExportRecord).masvs !== "string" ||
        typeof (record as ExportRecord).severity !== "string" ||
        typeof (record as ExportRecord).context !== "string"
      ) {
        throw new Error(`export JSONL line ${index + 1} is missing required finding fields`);
      }
      return record as ExportRecord;
    });
}

export function predictionsJsonl(predictions: JudgePrediction[]): string {
  return predictions.map((prediction) => JSON.stringify(prediction)).join("\n") + (predictions.length ? "\n" : "");
}