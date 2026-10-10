import type { Finding, RuleMeta, Severity } from "../types";

const LEVEL: Record<Severity, "error" | "warning" | "note"> = { high: "error", medium: "warning", low: "note" };
// GitHub uses this numeric score to label alerts Critical/High/Medium/Low in the Security tab.
const SECURITY_SEVERITY: Record<Severity, string> = { high: "8.0", medium: "5.0", low: "3.0" };

export function toSarif(findings: Finding[], rules: RuleMeta[], toolVersion: string) {
  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "rn-secscan",
            version: toolVersion,
            informationUri: "https://github.com/awais4486/rn-secscan",
            rules: rules.map((r) => ({
              id: r.id,
              name: r.title.replace(/[^A-Za-z0-9]+(.)?/g, (_, ch) => (ch ? ch.toUpperCase() : "")),
              shortDescription: { text: r.title },
              fullDescription: { text: r.description },
              defaultConfiguration: { level: LEVEL[r.severity] },
              properties: {
                tags: ["security", r.masvs],
                "security-severity": SECURITY_SEVERITY[r.severity],
              },
            })),
          },
        },
        results: findings.map((f) => ({
          ruleId: f.ruleId,
          level: LEVEL[f.severity],
          message: { text: `${f.message} [${f.masvs}]` },
          locations: [
            {
              physicalLocation: {
                artifactLocation: { uri: f.file, uriBaseId: "%SRCROOT%" },
                region: { startLine: f.line },
              },
            },
          ],
          properties: { masvs: f.masvs, severity: f.severity },
        })),
      },
    ],
  };
}
