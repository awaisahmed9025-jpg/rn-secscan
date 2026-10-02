import type { Finding, RuleMeta, Severity } from "./types";

export function makeFinding(
  rule: RuleMeta,
  file: string,
  line: number,
  message: string,
  snippet: string,
  severity?: Severity
): Finding {
  return {
    ruleId: rule.id,
    masvs: rule.masvs,
    severity: severity ?? rule.severity,
    message,
    file,
    line,
    snippet: snippet.replace(/\s+/g, " ").trim().slice(0, 160),
  };
}

/** 1-based line number of the first match, or 1 if not found. */
export function lineOf(content: string, needle: string | RegExp): number {
  const idx = typeof needle === "string" ? content.indexOf(needle) : content.search(needle);
  if (idx < 0) return 1;
  return content.slice(0, idx).split("\n").length;
}

export function shannonEntropy(s: string): number {
  if (!s.length) return 0;
  const counts = new Map<string, number>();
  for (const ch of s) counts.set(ch, (counts.get(ch) ?? 0) + 1);
  let h = 0;
  for (const c of counts.values()) {
    const p = c / s.length;
    h -= p * Math.log2(p);
  }
  return h;
}

/** Never print full secrets in reports. */
export function redact(value: string): string {
  return value.length <= 4 ? "****" : value.slice(0, 4) + "****";
}

/** Names that suggest a value is sensitive (tokens, passwords, sessions, ...). */
export const SENSITIVE_NAME =
  /(token|jwt|secret|passw(or)?d|pwd|session|refresh|api[_-]?key|credential|auth(?!or))/i;
