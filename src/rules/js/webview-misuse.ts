import { Node, SyntaxKind } from "ts-morph";
import type { Finding, JsRule, Severity } from "../../types";
import { makeFinding } from "../../utils";

export const webviewMisuse: JsRule = {
  kind: "js",
  id: "RNSEC005",
  title: "Insecure WebView configuration",
  description: "Permissive WebView settings let untrusted web content reach local files, mixed content or arbitrary origins.",
  masvs: "MASVS-PLATFORM-2",
  severity: "medium",
  check(sf) {
    const findings: Finding[] = [];
    const elements = [
      ...sf.getDescendantsOfKind(SyntaxKind.JsxOpeningElement),
      ...sf.getDescendantsOfKind(SyntaxKind.JsxSelfClosingElement),
    ];
    for (const el of elements) {
      const tag = el.getTagNameNode().getText();
      if (!tag.endsWith("WebView")) continue;

      for (const attr of el.getAttributes()) {
        if (!Node.isJsxAttribute(attr)) continue;
        const name = attr.getNameNode().getText();
        const init = attr.getInitializer()?.getText();
        const isTrue = init === undefined || (init !== "{false}" && init !== "{ false }");

        let msg: string | undefined;
        let sev: Severity = "medium";

        if (name === "originWhitelist" && init && /['"]\*['"]/.test(init)) {
          msg = "originWhitelist allows every origin. Restrict it to the domains you actually load.";
        } else if (name === "allowUniversalAccessFromFileURLs" && isTrue) {
          msg = "allowUniversalAccessFromFileURLs lets file:// content read any origin. Disable it.";
          sev = "high";
        } else if (name === "allowFileAccessFromFileURLs" && isTrue) {
          msg = "allowFileAccessFromFileURLs lets file:// content read other local files. Disable it.";
        } else if (name === "mixedContentMode" && init && /always/.test(init)) {
          msg = 'mixedContentMode="always" allows HTTP content inside HTTPS pages. Use "never".';
        }

        if (msg) {
          findings.push(makeFinding(webviewMisuse, sf.getFilePath(), attr.getStartLineNumber(), msg, attr.getText(), sev));
        }
      }
    }
    return findings;
  },
};
