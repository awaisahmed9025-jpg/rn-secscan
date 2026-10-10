import { Node, SyntaxKind } from "ts-morph";
import type { Finding, JsRule } from "../../types";
import { makeFinding, SENSITIVE_NAME } from "../../utils";

const LOG_METHODS = new Set(["log", "info", "warn", "error", "debug", "trace"]);
const NOT_A_VALUE = /^(is|has|should)[A-Z]|(Count|Length|Expired|Valid|Type|Label)$/;

function inDevGuard(node: Node): boolean {
  return !!node.getFirstAncestor((a) => {
    if (Node.isIfStatement(a)) {
      const cond = a.getExpression().getText().trim();
      return cond.includes("__DEV__") && !cond.startsWith("!");
    }
    if (Node.isBinaryExpression(a)) return a.getLeft().getText().trim() === "__DEV__";
    return false;
  });
}

export const sensitiveLogging: JsRule = {
  kind: "js",
  id: "RNSEC004",
  title: "Sensitive data written to logs",
  description: "Logs can be read from device storage, crash reports and attached debuggers. Never log tokens or credentials.",
  masvs: "MASVS-STORAGE-2",
  severity: "medium",
  check(sf) {
    const findings: Finding[] = [];
    for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const expr = call.getExpression();
      if (!Node.isPropertyAccessExpression(expr)) continue;
      if (expr.getExpression().getText() !== "console" || !LOG_METHODS.has(expr.getName())) continue;
      if (inDevGuard(call)) continue;

      let hit: string | undefined;
      for (const arg of call.getArguments()) {
        const ids = Node.isIdentifier(arg) ? [arg] : arg.getDescendantsOfKind(SyntaxKind.Identifier);
        const match = ids.find((i) => SENSITIVE_NAME.test(i.getText()) && !NOT_A_VALUE.test(i.getText()));
        if (match) {
          hit = match.getText();
          break;
        }
      }
      if (!hit) continue;

      findings.push(
        makeFinding(
          sensitiveLogging,
          sf.getFilePath(),
          call.getStartLineNumber(),
          `"${hit}" is passed to console.${expr.getName()}. Remove it or guard the log with __DEV__.`,
          call.getText()
        )
      );
    }
    return findings;
  },
};
