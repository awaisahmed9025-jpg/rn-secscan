export const BENCHMARK_CATEGORIES = [
  "asyncstorage-secrets",
  "cleartext-http",
  "hardcoded-secrets",
  "sensitive-logging",
  "webview",
  "android-backup",
  "android-cleartext",
  "exported-components",
  "ios-ats",
] as const;

export type BenchmarkCategory = (typeof BENCHMARK_CATEGORIES)[number];
export type FindingCategory = BenchmarkCategory | "other";

export const BENCHMARK_RULE_MAP: Record<string, Record<string, BenchmarkCategory>> = {
  "rn-secscan": {
    RNSEC001: "asyncstorage-secrets",
    RNSEC002: "cleartext-http",
    RNSEC003: "hardcoded-secrets",
    RNSEC004: "sensitive-logging",
    RNSEC005: "webview",
    RNSEC101: "android-backup",
    RNSEC102: "android-cleartext",
    RNSEC103: "exported-components",
    RNSEC110: "ios-ats",
  },
  eslint: {},
  semgrep: {
    "rnsec-benchmark-asyncstorage-sensitive": "asyncstorage-secrets",
    "rnsec-benchmark-cleartext-http": "cleartext-http",
    "rnsec-benchmark-sensitive-console": "sensitive-logging",
    "generic.secrets.security.detected-generic-secret": "hardcoded-secrets",
    "generic.secrets.security.detected-aws-access-key-id": "hardcoded-secrets",
    "generic.secrets.security.detected-private-key": "hardcoded-secrets",
  },
};
