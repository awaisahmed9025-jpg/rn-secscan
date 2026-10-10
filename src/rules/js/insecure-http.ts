import { Node, SyntaxKind } from "ts-morph";
import type { Finding, JsRule } from "../../types";
import { makeFinding } from "../../utils";

const LOCAL = /^http:\/\/(localhost|127\.0\.0\.1|10\.0\.2\.2|0\.0\.0\.0|\[::1\])(?=[:/]|$)/i;
const XML_NS = /^http:\/\/(www\.w3\.org|schemas\.android\.com|schemas\.xmlsoap\.org|ns\.adobe\.com)/i;
const URL_NAME = /(url|uri|endpoint|host|base)/i;
const NETWORK_CALLEE = /^(fetch|axios(\.\w+)?|\w+\.open)$/;

function literalText(node: Node): string | undefined {
  if (Node.isStringLiteral(node) || Node.isNoSubstitutionTemplateLiteral(node)) return node.getLiteralValue();
  if (Node.isTemplateExpression(node)) return node.getHead().getLiteralText();
  return undefined;
}

function isNetworkContext(node: Node): boolean {
  const parent = node.getParent();
  if (!parent) return false;
  if (Node.isCallExpression(parent) && parent.getArguments().includes(node)) {
    return NETWORK_CALLEE.test(parent.getExpression().getText());
  }
  if (Node.isPropertyAssignment(parent)) return URL_NAME.test(parent.getName());
  if (Node.isVariableDeclaration(parent)) return URL_NAME.test(parent.getName());
  return false;
}

export const insecureHttp: JsRule = {
  kind: "js",
  id: "RNSEC002",
  title: "Cleartext HTTP URL",
  description: "Plain http:// endpoints expose traffic to interception. Use HTTPS (TLS) for all remote calls.",
  masvs: "MASVS-NETWORK-1",
  severity: "medium",
  check(sf) {
    const findings: Finding[] = [];
    const kinds = [
      SyntaxKind.StringLiteral,
      SyntaxKind.NoSubstitutionTemplateLiteral,
      SyntaxKind.TemplateExpression,
    ];
    for (const kind of kinds) {
      for (const node of sf.getDescendantsOfKind(kind)) {
        const text = literalText(node);
        if (!text || !/^http:\/\//i.test(text)) continue;
        if (LOCAL.test(text) || XML_NS.test(text)) continue;
        if (!isNetworkContext(node)) continue;
        findings.push(
          makeFinding(
            insecureHttp,
            sf.getFilePath(),
            node.getStartLineNumber(),
            "Cleartext HTTP URL. Use HTTPS so traffic is encrypted in transit.",
            node.getParent()?.getText() ?? node.getText()
          )
        );
      }
    }
    return findings;
  },
};
