import { Node, SyntaxKind } from "ts-morph";
import type { Finding, JsRule } from "../../types";
import { makeFinding, SENSITIVE_NAME } from "../../utils";

const WRITE_METHODS = new Set(["setItem", "multiSet", "mergeItem", "multiMerge"]);

export const asyncStorageSensitive: JsRule = {
  kind: "js",
  id: "RNSEC001",
  title: "Sensitive data stored in AsyncStorage",
  description:
    "AsyncStorage is unencrypted plain storage. Tokens, passwords and sessions should live in Keychain/Keystore-backed storage.",
  masvs: "MASVS-STORAGE-1",
  severity: "high",
  check(sf) {
    const findings: Finding[] = [];
    for (const call of sf.getDescendantsOfKind(SyntaxKind.CallExpression)) {
      const expr = call.getExpression();
      if (!Node.isPropertyAccessExpression(expr)) continue;
      if (expr.getExpression().getText() !== "AsyncStorage") continue;
      if (!WRITE_METHODS.has(expr.getName())) continue;

      const firstArg = call.getArguments()[0];
      if (!firstArg || !SENSITIVE_NAME.test(firstArg.getText())) continue;

      findings.push(
        makeFinding(
          asyncStorageSensitive,
          sf.getFilePath(),
          call.getStartLineNumber(),
          "Sensitive value written to AsyncStorage, which is unencrypted. Use Keychain/Keystore-backed storage (e.g. react-native-keychain).",
          call.getText()
        )
      );
    }
    return findings;
  },
};
