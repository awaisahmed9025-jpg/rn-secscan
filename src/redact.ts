import { shannonEntropy } from "./utils";

const KNOWN = [
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z_-]{35}\b/g,
  /\bsk_live_[0-9a-zA-Z]{20,}\b/g,
  /\bxox[baprs]-[0-9A-Za-z-]{10,}\b/g,
  /\bgh[pousr]_[A-Za-z0-9]{36,}\b/g,
];

/**
 * Best-effort masking of credential-looking values in a line of source code.
 * Applied to everything `export` writes, so context sent to an AI judge or kept
 * in a dataset does not carry real secret values. Not a guarantee: review
 * exported files before sharing them.
 */
export function redactLine(line: string): string {
  let out = line;
  for (const re of KNOWN) out = out.replace(re, (m) => m.slice(0, 4) + "****");
  out = out.replace(/(["'`])([^"'`\s]{16,})\1/g, (m, q: string, v: string) => {
    // Leave URLs and file paths alone.
    if (/^(https?:|[./@~])/i.test(v) || (v.match(/\//g) ?? []).length >= 2) return m;
    const h = shannonEntropy(v);
    if (h >= 3.5 && (/\d/.test(v) || h >= 4.2)) return `${q}${v.slice(0, 4)}****${q}`;
    return m;
  });
  return out;
}
