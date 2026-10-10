import { Node, SyntaxKind } from "ts-morph";
import type { Finding, JsRule } from "../../types";
import { makeFinding, redact, shannonEntropy } from "../../utils";

const KNOWN: { name: string; re: RegExp }[] = [
  { name: "AWS access key ID", re: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: "Google API key", re: /\bAIza[0-9A-Za-z_-]{35}\b/ },
  { name: "Stripe live secret key", re: /\bsk_live_[0-9a-zA-Z]{20,}\b/ },
  { name: "Slack token", re: /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/ },
  { name: "GitHub token", re: /\bgh[pousr]_[A-Za-z0-9]{36,}\b/ },
  { name: "Private key block", re: /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/ },
];

const SECRET_NAME =
  /(api[_-]?key|secret|passw(or)?d|private[_-]?key|access[_-]?token|auth[_-]?token|client[_-]?secret|bearer)/i;
const PLACEHOLDER = /(your|example|placeholder|changeme|change_me|xxx|\*\*\*|todo|dummy|sample|test|<.*>|\$\{)/i;
const ROUTE_PATH = /^\/[A-Za-z0-9/_-]+$/;

function stringValue(node: Node | undefined): string | undefined {
  if (!node) return undefined;
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) return node.getLiteralValue();
  return undefined;
}

function isNameDerivedValue(name: string, value: string): boolean {
  if (!/^[A-Za-z0-9]+(?:[_-][A-Za-z0-9]+)+$/.test(value)) return false;
  const tokens = (text: string) =>
    text
      .replace(/([a-z])([A-Z])/g, "$1 $2")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter(Boolean);
  const valueTokens = new Set(tokens(value));
  const nameTokens = tokens(name);
  return (
    valueTokens.size >= 2 &&
    (nameTokens.every((token) => valueTokens.has(token)) || [...valueTokens].every((token) => nameTokens.includes(token)))
  );
}

export const hardcodedSecrets: JsRule = {
  kind: "js",
  id: "RNSEC003",
  title: "Hardcoded secret or API key",
  description:
    "Anything bundled into a React Native app can be extracted from the JS bundle. Keep secrets on a backend or fetch them at runtime.",
  masvs: "MASVS-CRYPTO-2",
  severity: "high",
  check(sf) {
    const findings: Finding[] = [];
    const flagged = new Set<Node>();
    const file = sf.getFilePath();

    // 1) Known secret formats anywhere in a string literal
    for (const kind of [SyntaxKind.StringLiteral, SyntaxKind.NoSubstitutionTemplateLiteral]) {
      for (const node of sf.getDescendantsOfKind(kind)) {
        const value = stringValue(node);
        if (!value) continue;
        const hit = KNOWN.find((k) => k.re.test(value));
        if (!hit) continue;
        flagged.add(node);
        findings.push(
          makeFinding(
            hardcodedSecrets,
            file,
            node.getStartLineNumber(),
            `Possible ${hit.name} hardcoded in source. Rotate it and move it out of the app bundle.`,
            `"${redact(value)}"`,
            "high"
          )
        );
      }
    }

    // 2) Secret-looking names assigned a high-entropy literal
    const named: { name: string; init: Node | undefined; at: Node }[] = [];
    for (const d of sf.getDescendantsOfKind(SyntaxKind.VariableDeclaration))
      named.push({ name: d.getName(), init: d.getInitializer(), at: d });
    for (const p of sf.getDescendantsOfKind(SyntaxKind.PropertyAssignment))
      named.push({ name: p.getName(), init: p.getInitializer(), at: p });
    for (const p of sf.getDescendantsOfKind(SyntaxKind.PropertyDeclaration))
      named.push({ name: p.getName(), init: p.getInitializer(), at: p });

    for (const { name, init, at } of named) {
      if (!init || flagged.has(init)) continue;
      if (!SECRET_NAME.test(name)) continue;
      const value = stringValue(init);
      if (!value || value.length < 8) continue;
      if (/\s/.test(value) || /^https?:\/\//i.test(value) || ROUTE_PATH.test(value)) continue;
      if (PLACEHOLDER.test(value)) continue;
      if (isNameDerivedValue(name, value)) continue;
      if (shannonEntropy(value) < 3.0) continue;
      flagged.add(init);
      findings.push(
        makeFinding(
          hardcodedSecrets,
          file,
          at.getStartLineNumber(),
          `"${name}" looks like a hardcoded secret. Move it to a backend or secure runtime config.`,
          `${name} = "${redact(value)}"`,
          "medium"
        )
      );
    }
    return findings;
  },
};
