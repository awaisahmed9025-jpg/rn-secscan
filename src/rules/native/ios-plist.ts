import plist from "plist";
import type { Finding, NativeRule } from "../../types";
import { lineOf, makeFinding } from "../../utils";

export const iosAppTransportSecurity: NativeRule = {
  kind: "native",
  id: "RNSEC110",
  title: "iOS App Transport Security weakened",
  description: "ATS enforces HTTPS. Exceptions let the app talk plain HTTP and should be as narrow as possible.",
  masvs: "MASVS-NETWORK-1",
  severity: "high",
  appliesTo: (p) => /Info\.plist$/.test(p),
  check({ path, content }) {
    let data: any;
    try {
      data = plist.parse(content);
    } catch {
      return [];
    }
    const ats = data?.NSAppTransportSecurity;
    if (!ats || typeof ats !== "object") return [];

    const findings: Finding[] = [];
    if (ats.NSAllowsArbitraryLoads === true) {
      findings.push(makeFinding(iosAppTransportSecurity, path, lineOf(content, /<key>NSAllowsArbitraryLoads<\/key>/), "NSAllowsArbitraryLoads is true, which disables ATS for the whole app. Remove it and add narrow per-domain exceptions if needed.", "NSAllowsArbitraryLoads = true", "high"));
    }
    if (ats.NSAllowsArbitraryLoadsInWebContent === true) {
      findings.push(makeFinding(iosAppTransportSecurity, path, lineOf(content, /<key>NSAllowsArbitraryLoadsInWebContent<\/key>/), "NSAllowsArbitraryLoadsInWebContent disables ATS for web views.", "NSAllowsArbitraryLoadsInWebContent = true", "medium"));
    }
    const domains = ats.NSExceptionDomains ?? {};
    for (const [domain, cfg] of Object.entries<any>(domains)) {
      if (["localhost", "127.0.0.1"].includes(domain)) continue;
      if (cfg?.NSExceptionAllowsInsecureHTTPLoads === true) {
        findings.push(makeFinding(iosAppTransportSecurity, path, lineOf(content, `<key>${domain}</key>`), `Domain "${domain}" is allowed to use insecure HTTP. Move it to HTTPS.`, `NSExceptionDomains.${domain}.NSExceptionAllowsInsecureHTTPLoads = true`, "medium"));
      }
    }
    return findings;
  },
};
