import type { SourceFile } from "ts-morph";

export type Severity = "high" | "medium" | "low";

export const SEVERITY_ORDER: Record<Severity, number> = { low: 1, medium: 2, high: 3 };

export interface Finding {
  ruleId: string;
  masvs: string;
  severity: Severity;
  message: string;
  file: string;
  line: number;
  snippet: string;
}

export interface RuleMeta {
  id: string;
  title: string;
  description: string;
  masvs: string;
  severity: Severity;
}

/** Rule that inspects a parsed JS/TS source file. */
export interface JsRule extends RuleMeta {
  kind: "js";
  check(sf: SourceFile): Finding[];
}

export interface NativeFile {
  path: string;
  content: string;
}

/** Rule that inspects a native config file (AndroidManifest.xml, Info.plist). */
export interface NativeRule extends RuleMeta {
  kind: "native";
  appliesTo(path: string): boolean;
  check(file: NativeFile): Finding[];
}

export type Rule = JsRule | NativeRule;
