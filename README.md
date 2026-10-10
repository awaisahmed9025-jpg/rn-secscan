# rn-secscan

Static security scanner for **React Native** apps. It checks your JS/TS code *and* the native config files (`AndroidManifest.xml`, `Info.plist`), and reports findings as **SARIF** with every rule mapped to an **OWASP MASVS** control, so results show up directly in GitHub pull requests and the Security tab.

> Status: **v0.1 (Phase 1)**. Rule-based engine only. AI triage, data-flow context, auto-fix patches and benchmarks are on the roadmap below.

## Quick start

```bash
npm install
npm run build

# scan a project
node dist/cli.js scan /path/to/your-rn-app

# try it on the bundled intentionally-vulnerable fixtures
npm run scan:fixtures
```

Once published to npm: `npx rn-secscan scan .`

## CLI

```
rn-secscan scan [path]
  -f, --format <console|sarif|json>   output format (default: console)
  -o, --output <file>                 write report to a file
  --fail-on <high|medium|low|none>    exit code 1 at/above this severity (default: none)
  --base <dir>                        paths in the report are relative to this dir (default: cwd)
  --include-tests                     also scan *.test.* / __tests__ / __mocks__

rn-secscan rules                      list rules and their MASVS mapping
```

## Rules

| ID | What it detects | MASVS | Severity |
|---|---|---|---|
| RNSEC001 | Sensitive keys (token, password, session...) written to `AsyncStorage` | MASVS-STORAGE-1 | high |
| RNSEC002 | Cleartext `http://` URLs in network calls / URL config (localhost ignored) | MASVS-NETWORK-1 | medium |
| RNSEC003 | Hardcoded secrets: known key formats + high-entropy values in secret-named variables | MASVS-CRYPTO-2 | high / medium |
| RNSEC004 | Tokens/credentials passed to `console.*` (`__DEV__`-guarded logs ignored) | MASVS-STORAGE-2 | medium |
| RNSEC005 | Permissive `WebView` props (`originWhitelist=["*"]`, file URL access, mixed content) | MASVS-PLATFORM-2 | medium / high |
| RNSEC101 | Android `allowBackup` true (or unset) | MASVS-STORAGE-2 | medium / low |
| RNSEC102 | Android `usesCleartextTraffic="true"` | MASVS-NETWORK-1 | high |
| RNSEC103 | Exported Android components without a permission | MASVS-PLATFORM-1 | high / low |
| RNSEC110 | iOS ATS disabled or HTTP exceptions in `Info.plist` | MASVS-NETWORK-1 | high / medium |

**Please verify the MASVS IDs** against the [official MASVS controls](https://mas.owasp.org/MASVS/) before you publish. The mapping reflects my best reading of MASVS v2 and is the part of this project where accuracy matters most for credibility.

## Use in GitHub Actions

```yaml
permissions:
  contents: read
  security-events: write
steps:
  - uses: actions/checkout@v4
  - uses: actions/setup-node@v4
    with: { node-version: 20 }
  - run: npx rn-secscan scan . --format sarif --output results.sarif
  - uses: github/codeql-action/upload-sarif@v3
    with:
      sarif_file: results.sarif
      category: rn-secscan
```

SARIF upload to the Security tab is free on public repos; private repos need GitHub Advanced Security. See `.github/workflows/sarif-demo.yml` for a working example.

## Suppressing a finding

Put a comment on the same line or the line above:

# rn-secscan

`rn-secscan` is a static security scanner for React Native projects. It checks JavaScript and TypeScript source files plus Android and iOS configuration, then reports findings in the terminal, JSON, or SARIF.

The scanner's findings come from deterministic rules. An optional Claude judge can triage exported findings; it does not replace the scanner, trace data flow, or apply code fixes.

## Quick Start

You need Node.js 18 or newer.

```bash
git clone https://github.com/awaisahmed9025-jpg/rn-secscan.git
cd rn-secscan
npm install
npm run build
```

Scan a React Native project:

```bash
node dist/cli.js scan /path/to/your/react-native-app
```

Try the scanner on the included intentionally vulnerable examples:

```bash
npm run scan:fixtures
```

The `fixtures/safe` directory contains matching safe examples; scanning it should produce no findings.

## What It Checks

| Rule | Detection | Severity |
|---|---|---|
| RNSEC001 | Sensitive values, such as tokens or passwords, written to AsyncStorage | High |
| RNSEC002 | Remote cleartext HTTP URLs; localhost URLs are ignored | Medium |
| RNSEC003 | Known secret formats and high-entropy values in secret-named variables | High or medium |
| RNSEC004 | Tokens or credentials passed to `console.*`; `__DEV__`-guarded logs are ignored | Medium |
| RNSEC005 | Risky WebView settings, such as wildcard origins or unsafe file access | Medium or high |
| RNSEC101 | Android backup enabled, or `allowBackup` not set | Medium or low |
| RNSEC102 | Android cleartext traffic enabled | High |
| RNSEC103 | Exported Android components without a permission | High or low |
| RNSEC110 | iOS App Transport Security disabled or configured with HTTP exceptions | High or medium |

Each rule includes an OWASP MASVS control mapping. To list rule IDs, severities, and mappings:

```bash
node dist/cli.js rules
```

## Command Options

```text
rn-secscan scan [path]
  -f, --format <console|sarif|json>  Report format (default: console)
  -o, --output <file>                Write the report to a file
  --fail-on <high|medium|low|none>   Exit with code 1 at or above this severity
  --base <dir>                       Make reported paths relative to this directory
  --include-tests                    Include test and mock files

rn-secscan fix [path]
  --rule <ids>                       Rules to fix (default: RNSEC101,RNSEC002)
  --write                            Apply changes (otherwise preview only)

rn-secscan rules                     List rules and their MASVS mappings
rn-secscan export <path> -o <file>   Export findings and redacted source context as JSONL
rn-secscan judge [options]            Ask Claude to triage exported findings
rn-secscan eval --labels <file>       Measure rules-only or rules-plus-judge precision
```

When running from this source checkout, prefix commands with `node dist/cli.js`. For example:

```bash
node dist/cli.js scan /path/to/app --format sarif --output results.sarif
node dist/cli.js scan /path/to/app --fail-on high
```

The default scan target is the current directory. Findings do not fail the command unless `--fail-on` is set. A finding at or above the selected severity returns exit code 1, which is useful for CI.

## Safe Auto-Fixes

Preview fixes before applying them:

```powershell
node dist/cli.js fix . --rule RNSEC101,RNSEC002
```

The command currently supports:

- `RNSEC101`: changes `android:allowBackup="true"` to `false`, or adds an explicit `false` attribute when it is missing.
- `RNSEC002`: changes the reported remote `http://` URL to `https://` on the finding's line.

Add `--write` only after reviewing the preview. Fixes are intentionally limited to these two rules; URLs that do not support HTTPS may require a manual change instead.

## Related-tool benchmark setup

The repository includes a comparison scaffold for Semgrep and `eslint-plugin-security`. Install Semgrep separately, then run:

```powershell
npm install
$env:RNSECAN_BENCHMARK_OUTPUT = "$env:TEMP\rn-secscan-benchmark"
npm run benchmark:security
```

The runner scans the rich-test checkouts recorded in the evaluation protocol and writes raw JSON reports outside this repository. Tool findings are not treated as equivalent to rn-secscan findings until they are mapped and reviewed; the current setup is for coverage and overlap exploration only.

## Optional Claude Triage

Export findings from an app you are allowed to share, then label them before evaluating triage:

```powershell
node dist/cli.js export ..\repo-A -o data\dev-repoA.jsonl --csv data\labels.csv --set dev --repo-name repo-A
$env:ANTHROPIC_API_KEY = "<your key>"
$env:ANTHROPIC_MODEL = "MODEL_ID_FROM_ANTHROPIC_CONSOLE"
node dist/cli.js judge --input data\dev-repoA.jsonl --output data\predictions-dev.jsonl --model $env:ANTHROPIC_MODEL --confirm-code-transfer
node dist/cli.js eval --labels data\labels.csv --predictions data\predictions-dev.jsonl
```

The `judge` command sends each finding's rule metadata, redacted context window, and optional enclosing function to Anthropic. It does not send the repository name, path, or commit. Redaction is best-effort, not a guarantee: inspect exports before sharing them, and never send employer, private, or otherwise confidential code. The `--confirm-code-transfer` flag is required to make the transfer explicit. Keep the API key in the environment; do not put it in a command committed to a script or in a repository file.

Judge output is JSONL with `id`, `keep`, `confidence`, and `reason`. `keep: true` means retain the finding. The eval command accepts the `keep` decisions and compares them with labeled `TP`/`FP` rows; `UNSURE` rows are excluded. Use the same set of findings for the rules-only and AI-assisted comparison.

## GitHub Actions

The [SARIF demo workflow](.github/workflows/sarif-demo.yml) builds the project, scans the vulnerable fixtures, and uploads the SARIF report to GitHub code scanning. It demonstrates the upload setup; change the scan target when adapting it to a real app. GitHub code scanning availability depends on your repository plan and visibility.

The scanner is not currently published as an npm package, so the `npx rn-secscan` command is not available yet. After publication, the workflow can install the package and scan your repository directly.

## Suppress a Finding

Put `rn-secscan-ignore` on the finding's line or the line immediately above it. Add a rule ID to suppress only that rule:

```ts
// rn-secscan-ignore RNSEC001
await AsyncStorage.setItem("authToken", legacyValue);
```

Omit the rule ID to suppress all rn-secscan findings on that line.

## What Is Scanned

- JavaScript and TypeScript files: `.js`, `.jsx`, `.ts`, and `.tsx`
- Android `AndroidManifest.xml` files, except manifests under `src/debug`
- iOS `Info.plist` files

By default, the scanner skips dependencies, build outputs, generated bundles, and test or mock files. Use `--include-tests` to include test and mock files.

## Limitations

- This is static, pattern-based analysis. It does not run the app or follow values through the codebase.
- Some rules use name and syntax heuristics, so findings may need manual review.
- Aliased imports and dynamically constructed values may not be recognized.
- `npm audit` currently reports a high-severity `braces` advisory in the dependency chain `fast-glob` → `micromatch` → `braces`; npm reports no fix available. Review the advisory before using the scanner on untrusted input.
- A clean scan does not prove that an app is secure.

## Development

```bash
npm install
npm test
npm run build
```

Tests use Vitest and include safe/vulnerable fixtures. When adding a rule, add a vulnerable example, a safe example, and tests. Avoid putting realistic credentials in fixtures; construct secret-like values at runtime in tests.

## Roadmap

- Improve rule accuracy and evaluate the scanner on real React Native projects.
- Build a labeled dataset and measure whether AI-assisted triage reduces false positives.
- Explore limited data-flow tracking and reviewable fixes for selected rules.
- Publish reproducible benchmarks against related security tools.

## License

MIT. See [LICENSE](LICENSE).