# Evaluation Protocol

**Protocol date:** 2026-10-04
**Scanner `HEAD` when drafted:** `3ba664d4d20163350c5e7a765dd4ad40746bd4c7`
**Ruleset commit used for the recorded held-out scans:** `f4a7d42c3f12396dba0d89633d9e5c0c8cda10c8`
**Judge prompt version:** `rn-secscan-judge-v1`

This protocol separates rule/prompt development from held-out evaluation. The recorded held-out scans used the ruleset commit above; the later `HEAD` is recorded separately and must not be presented as the revision that produced those historical results. Any subsequent scanner or prompt changes must be recorded as a new development revision; do not silently replace either baseline.

## Evaluation sets

### Development set

These four apps have already informed rule development. Use them for further rule and prompt iteration only; do not report their results as held-out performance.

| App | Repository | Source commit |
|---|---|---|
| repo-A | `repo-A` | `[commit]` |
| repo-B | `repo-B` | `[commit]` |
| repo-C | `repo-C` | `[commit]` |
| repo-D | `repo-D` | `[commit]` |

### Held-out set

These six apps were scanned after the rules were frozen. Do not tune rules or the judge against their findings. The current held-out labels are exploratory and too few to support a reliable performance claim.

| App | Repository | Source commit |
|---|---|---|
| repo-E | repo-E | `[commit]` |
| repo-F | `repo-F` | `[commit]` |
| repo-G | repo-G | `[commit]` |
| repo-H | repo-H | `[commit]` |
| repo-I | repo-I | `[commit]` |
| repo-J | `repo-J` | `[commit]` |

The historical scan log is in [`../evaluation/README.md`](../evaluation/README.md); finding labels are in the evaluation CSV files. Those CSVs are tracked in Git and contain repository/file/line pointers, so do not treat them as private local data or add further source pointers to a public commit without disclosure review. The development labels combine scanner revisions and must not be treated as a consistent benchmark.

## Candidate discovery

The earlier exploratory searches did not preserve literal query strings. The following new GitHub repository searches were run on **2026-10-04** after the initial protocol commit. They are recorded verbatim; these were discovery searches only, and none of the candidates below have been cloned or scanned in this pass:

1. `react-native habit tracker pushed:>2025-10-04 stars:5..300`
2. `react-native todo app pushed:>2025-10-04 stars:5..300`
3. `react-native expo app pushed:>2025-10-04 stars:5..300`

### Candidate shortlist for review

These are search-result candidates, not accepted evaluation repos. Search metadata showed them as public, unarchived, non-fork TypeScript repositories. Review whether each has a real, relevant React Native app source tree before approving any scan.

| Candidate | Description | Stars | Repository last updated (UTC) | URL |
|---|---|---:|---|---|
| `repo-K` | Open-source habit tracker | 38 | 2026-09-11 | <https://github.com/repo-K> |
| `repo-L` | React Native and Expo todo app | 7 | 2026-08-29 | <https://github.com/repo-L> |
| `Adedoyin-Emmanuel/tada` | React Native todo app with an ASP.NET backend | 11 | 2026-09-15 | <https://github.com/Adedoyin-Emmanuel/tada> |
| `skepjandi/gitnotes` | Expo/React Native notes, todos, and canvas app | 26 | 2026-10-04 | <https://github.com/skepjandi/gitnotes> |
| `repo-M` | React Native plant-care app | 125 | 2026-08-01 | <https://github.com/repo-M> |

New candidates must be public, actively maintained React Native apps with a real application source tree. Prefer a mix of small hobby/tutorial apps and larger apps. Ask for candidate review before scanning them. Keep new candidates separate from the six-app held-out set until their inclusion and evaluation role are explicitly recorded.

### Approved development-set expansion

On 2026-10-04, the user approved these three candidates for source-layout/activity verification. They are intended as a development-set expansion, not as held-out evaluation data. The pinned revisions below are the latest commits returned by GitHub during screening; no scanner runs have been performed on them.

| App | Repository | Pinned source commit | Latest commit date (UTC) |
|---|---|---|---|
| Open-source habit tracker | `repo-K` | `[commit]` | 2026-01-05 |
| Todo app | `repo-L` | `[commit]` | 2025-12-29 |
| My Plants | `repo-M` | `[commit]` | 2026-08-01 |

The initially approved `Adedoyin-Emmanuel/tada` candidate was not selected because its latest source commit found during screening was dated 2025-04-25.

The three approved repositories were shallow-cloned outside this project on 2026-10-04 and checked out at the pinned commits. Their source trees are present:

| Repository | JS/TS files | Checkout |
|---|---:|---|
| `repo-K` | 50 | `local checkout or report outside this repository` |
| `repo-L` | 26 | `local checkout or report outside this repository` |
| `repo-M` | 90 | `local checkout or report outside this repository` |

Each repository was scanned once on 2026-10-04 using the scanner at execution commit `c05d4db78fd45d6a68840b2d62d8d39d5d9e109a` (TypeScript build passed). These are development-set results only; they have not been labeled and are not benchmark metrics.

| Repository | Findings | Scan time | Local JSON report |
|---|---:|---:|---|
| `repo-K` | 0 | 1.50 sec | `local checkout or report outside this repository` |
| `repo-L` | 0 | 1.16 sec | `local checkout or report outside this repository` |
| `repo-M` | 1 (`RNSEC004`, medium) | 1.54 sec | `local checkout or report outside this repository` |

The JSON reports remain outside the project repository. A zero-finding result is not evidence that an app is secure.

## Manual spot checks and positive-biased discovery

On 2026-10-04, the two zero-finding development apps were checked at their pinned revisions with these exact `git grep` patterns:

1. `AsyncStorage|MMKV|SecureStore|Keychain` over `*.ts`, `*.tsx`, `*.js`, and `*.jsx`
2. `console\.(log|info|warn|error|debug)\(.*(token|password|secret|session)` over the same extensions
3. `http://` over the same extensions

The habit-tracker app had three storage-related matches, all in `hooks/useTheme.tsx`; the todo app had four storage-related matches, all in `services/authStorage.ts`. Neither app had matches for the sensitive-console or HTTP patterns. These are limited string searches, not a complete manual audit.

The one My Plants finding is labeled **TP** in the development labels because it logs the value returned by `Notifications.getExpoPushTokenAsync`, exposing a device push token to logs. Its source pointer is recorded only in the working-copy label CSV and is not repeated here.

Positive-biased discovery was selected to find candidate apps that contain relevant patterns. On 2026-10-04, these exact GitHub code-search queries were run:

1. `"AsyncStorage.setItem" token language:typescript`
2. `"AsyncStorage.setItem" password language:typescript`
3. `"console.log(token)" "react-native"`
4. `react-native AsyncStorage pushed:>2026-04-04 language:TypeScript stars:>5`
5. `repo:repo-N "AsyncStorage.setItem" token`
6. `repo:repo-O "AsyncStorage.setItem" token`
7. `repo:sweetspotsapp/sweetspots "AsyncStorage.setItem" token`
8. `repo:tonyaellie/homebox-mobile "AsyncStorage.setItem" token`
9. `repo:repo-P AsyncStorage`
10. `repo:repo-Q AsyncStorage`
11. `repo:DevmanushRaky/tagdafun AsyncStorage`
12. `repo:TheLunatic1/IV_Fluid_Calculator_V2 AsyncStorage`

Search results included repositories such as `easy-im/react-native-app`, `repo-N`, `tonyaellie/homebox-mobile`, `thanhtungdp/react-native-gift-app`, `repo-O`, and `sweetspotsapp/sweetspots`. Several are stale; search hits alone are not evidence of an active app or a vulnerability.

### Positive-biased candidates for approval

These candidates had recent commits and an actual React Native/Expo app manifest or sub-app, plus relevant storage dependencies or code-search hits. At initial discovery they had not been cloned or scanned. The `repo-N` code search was verified in source: it stores an auth token in AsyncStorage; that is a targeted positive example, not a confirmed vulnerability label.

| Candidate | Last commit found (UTC) | Positive-pattern evidence |
|---|---|---|
| `repo-N` | 2026-07-18 | Expo/React Native app; code-search hit in sync storage code for AsyncStorage and token handling |
| `repo-O` | 2026-07-02 | Active Expo React Native app under `app/`; code-search results include notification/logging services |
| `repo-P` | 2026-09-04 | Expo/React Native app with AsyncStorage dependency |
| `repo-Q` | 2026-09-22 | Expo/React Native wellness app with AsyncStorage and SecureStore dependencies |

The last two are dependency-based leads; their relevant source pattern still needs verification. These are candidates only and require user approval before checkout or scanning. Any resulting set is positive-biased and must not be described as a representative prevalence sample.

### Approved positive-biased development expansion

On 2026-10-04, the user approved all four candidates for one scan each. They are development data and must not be treated as held-out results. The repos were cloned outside the project and pinned as follows; source trees were verified before scanning:

| Repository | Source commit | App subdirectory | JS/TS files |
|---|---|---|---:|
| `repo-N` | `[commit]` | repository root | 29 |
| `repo-O` | `[commit]` | `app/` | 500 |
| `repo-P` | `[commit]` | repository root | 21 |
| `repo-Q` | `[commit]` | repository root | 224 |

Before scanning, the same three pattern searches from the manual spot-check section were run over JS/TS files. Match counts (`storage APIs`, `sensitive console`, `http://`) were: repo-N `79, 9, 1`; repo-O app `347, 12, 30`; expense tracker `5, 0, 0`; repo-Q `10, 9, 0`. Counts are line matches, not confirmed findings. All four were approved for one scanner run each; no scans had been performed at the time this pre-scan record was committed.

Each approved app was then scanned exactly once on 2026-10-04 using the scanner at execution commit `44621a4d448047593b074645b3810b974b959022`; the TypeScript build passed. These are positive-biased development results, not held-out performance or prevalence estimates. No findings from this batch have been labeled yet.

| Repository | Findings | By rule and severity | Scan time | Local JSON report |
|---|---:|---|---:|---|
| `repo-N` | 18 | `RNSEC001` high: 12; `RNSEC003` medium: 6 | 2.37 sec | `local checkout or report outside this repository` |
| `repo-O` app | 8 | `RNSEC001` high: 3; `RNSEC002` medium: 1; `RNSEC004` medium: 3; `RNSEC005` medium: 1 | 11.37 sec | `local checkout or report outside this repository` |
| `repo-P` | 0 | — | 1.67 sec | `local checkout or report outside this repository` |
| `repo-Q` | 4 | `RNSEC001` high: 2; `RNSEC004` medium: 2 | 4.35 sec | `local checkout or report outside this repository` |

Reports remain outside the project. Zero findings are not evidence of a clean or secure app.

### Blind development labels

After the scans, the positive-biased findings were reviewed from source context before any judge calls were made. The labels were recorded locally in `data\labels.csv`; raw reports and source pointers remain outside the repository.

| Positive-biased app | Decided TP | Decided FP | Unsure |
|---|---:|---:|---:|
| repo-N | 5 | 12 | 0 |
| repo-O | 5 | 3 | 0 |
| repo-Q mobile | 3 | 0 | 1 |
| **Total** | **13** | **15** | **1** |

The resulting `node dist/cli.js eval --labels data\labels.csv` output includes the earlier development labels and the current exploratory held-out labels:

- Development: 17/37 true positives among decided findings; rules-only precision **45.9%** (95% CI **31.0%–61.6%**), with one unsure excluded.
- Held-out exploratory rows currently in the local sheet: 2/8; these are too few for a reliable benchmark claim.
- By rule across all local decided rows: `RNSEC001` 9 TP / 9 FP, `RNSEC002` 1 / 0, `RNSEC003` 0 / 8, `RNSEC004` 4 / 0, `RNSEC005` 0 / 2, `RNSEC101` 0 / 4, `RNSEC102` 2 / 1, `RNSEC103` 0 / 2, and `RNSEC110` 3 / 0.

These figures measure triage precision only. They do not measure scanner recall, and the positive-biased development expansion must not be described as representative prevalence data.

### Current development-set rule breakdown

The current development sheet has 37 decided findings (17 TP, 20 FP) and one `UNSURE`. The breakdown below is for development findings only; it excludes rich-test and held-out rows.

| Rule | TP | FP | Unsure |
|---|---:|---:|---:|
| RNSEC001 | 8 | 9 | 0 |
| RNSEC002 | 1 | 0 | 0 |
| RNSEC003 | 0 | 6 | 0 |
| RNSEC004 | 4 | 0 | 1 |
| RNSEC005 | 0 | 1 | 0 |
| RNSEC101 | 0 | 2 | 0 |
| RNSEC102 | 1 | 0 | 0 |
| RNSEC103 | 0 | 2 | 0 |
| RNSEC110 | 3 | 0 | 0 |

All six labeled development-set RNSEC003 false positives were name-derived storage-key strings assigned to `KEY`-suffixed identifiers, rather than credential values. The rule change and development-only rescans are recorded in the change log. This diagnosis applies to those six labeled findings only; the rule still requires review on future development findings.

The local label sheet now contains additional labeled findings compared with the earlier 49-row sheet: 20 additional TP labels and one `UNSURE`, with the FP count unchanged at 40. This is a change in labeled records and set coverage, not evidence of improved accuracy. Do not quote a pooled precision from these mixed sets.

## Rich-test candidate discovery

The Claude smoke test was deferred on 2026-10-04 because no API key was provided. A separate rich-test batch was therefore prepared without scanning or sending source code to a judge. The candidates below are disjoint from the seven repositories scanned in the development expansion and from the six repositories in the held-out set.

Discovery queries run on 2026-10-04:

1. `react native app language:TypeScript pushed:>2025-10-04 stars:10..500`
2. `expo app language:TypeScript pushed:>2025-10-04 stars:5..300`
3. `react native mobile app language:JavaScript pushed:>2025-10-04 stars:5..300`

### Rich-test shortlist

Each candidate was screened through GitHub metadata for a public, non-archived repository with a React Native/Expo application source tree. The pinned commits are the latest commits returned during screening; scanner runs are intentionally pending.

| Candidate | Repository | Evidence | Pinned commit | Latest commit date (UTC) |
|---|---|---|---|---|
| repo-R mobile | `repo-R` | React Native mobile app; `android/`, `ios/`, and `package.json` at repository root | `[commit]` | 2026-09-25 |
| arXiv Papers mobile | `repo-S` | React Native app; `android/`, `ios/`, `src/`, and `package.json` at repository root | `[commit]` | 2026-07-26 |
| Tsinghua Info | `repo-T` | React Native app; `android/`, `ios/`, `js/`, and `package.json` at repository root | `[commit]` | 2026-10-04 |
| repo-U | `repo-U` | Expo app; `app/`, `components/`, `services/`, and `package.json` at repository root | `[commit]` | 2026-10-04 |

These are candidate rich-test repositories, not yet approved or scanned. Before scanning, clone each at the pinned commit, verify its source tree and JS/TS file count, and record the checkout paths here. If the user does not approve the shortlist, replace it before any scan.

### Approved rich-test checkouts

The user approved all four candidates on 2026-10-04. They were shallow-cloned outside this project at the pinned commits and verified without scanning:

| Repository | Checkout | Scan target | JS/TS files in target | Verification |
|---|---|---|---:|---|
| `repo-R` | `local checkout or report outside this repository` | repository root | 329 | `package.json`, `android/`, and `ios/` present |
| `repo-S` | `local checkout or report outside this repository` | repository root | 162 | `package.json`, `android/`, and `ios/` present |
| `repo-T` | `local checkout or report outside this repository` | `apps/repo-T` | 263 | nested `package.json`, `android/`, and `ios/` present |
| `repo-U` | `local checkout or report outside this repository` | `app` | 86 | Expo app with root `package.json` and `app/` source tree |

No scanner run has been performed on this batch. Any scan command must use the target column and must be recorded once here with its exact result.

### Rich-test scan results

Each approved target was scanned exactly once on 2026-10-04 with the scanner at execution commit `f196cd9` (the TypeScript build was already passing). These are rich-test results for later blind labeling; no judge calls or labels have been produced for them.

| Repository | Findings | By rule and severity | Scan time | Local JSON report |
|---|---:|---|---:|---|
| `repo-R` | 16 | `RNSEC101` medium: 1; `RNSEC110` high: 1; `RNSEC001` high: 2; `RNSEC002` medium: 2; `RNSEC003` medium: 10 | 9.39 sec | `local checkout or report outside this repository` |
| `repo-S` | 1 | `RNSEC101` medium: 1 | 4.89 sec | `local checkout or report outside this repository` |
| `repo-T` | 7 | `RNSEC110` high: 1; `RNSEC003` medium: 3; `RNSEC002` medium: 2; `RNSEC005` medium: 1 | 9.51 sec | `local checkout or report outside this repository` |
| `repo-U` | 0 | — | 5.17 sec | `local checkout or report outside this repository` |

The rich-test reports remain outside the project. Their findings must be labeled blind from source context before any judge dry run, and the batch must remain separate from the development and held-out metrics.

### Blind rich-test labels

The rich-test findings were reviewed from source context before any judge call. Labels are local in `data\labels.csv`; the reports and source pointers remain outside the repository.

| Rich-test app | Decided TP | Decided FP | Unsure |
|---|---:|---:|---:|
| repo-R mobile | 5 | 11 | 0 |
| arXiv Papers mobile | 1 | 0 | 0 |
| Tsinghua Info | 4 | 3 | 0 |
| repo-U | 0 | 0 | 0 |
| **Total** | **10** | **14** | **0** |

The current local evaluation reports rich-test rules-only precision of **10/24 = 41.7%** (95% CI **24.5%–61.2%**). This is an exploratory rich-test result, not a held-out benchmark claim, and it must not be used to tune the scanner or judge prompt after the fact.

## Benchmark method

The tool comparison has three complementary parts:

1. **Coverage matrix.** `src/benchmark-category-map.ts` maps each tool's rule IDs to the nine rn-secscan categories: AsyncStorage secrets, cleartext HTTP, hardcoded secrets, sensitive logging, WebView, Android backup, Android cleartext, exported components, and iOS ATS. The benchmark reports whether each tool has any mapped rule for each category. Findings with no mapping remain visible in per-tool counts as `other` and are not silently discarded.
2. **Ground-truth testbed.** `testbed/rn-vuln-app` is a dependency-free React Native-shaped app with a vulnerable and safe counterpart for every category. `ground-truth.json` records each case's file, line, truth verdict, and intended detection result. It also contains explicit known misses for an aliased AsyncStorage import, a wrapper function, and missing certificate pinning. `npm run benchmark:testbed` scores each tool run with true positives, false positives, false negatives, precision, recall, and F1. The testbed was written by the rule author, so it is a targeted regression suite rather than an independent prevalence estimate.
3. **Pooled blind labeling.** For rich-test and held-out apps only, mapped findings from all tools are deduplicated by target, file, and line into a pooled sheet that contains no tool names. A separate local provenance map links each pooled ID to its contributing tool(s). Labels are assigned before looking at that provenance. Per-tool precision and **relative recall** are then calculated from the pooled true-positive labels with 95% Wilson intervals. Relative recall is the share of pooled true positives found by a tool; it is not scanner recall and must never be reported as true recall.

The pooled sheet must not include development-set or positive-biased apps. Raw tool reports, JSONL exports, pooled provenance, and labels remain outside the repository.

### Authored testbed run

On 2026-10-10, the authored `rn-vuln-app` ground truth was scored with rn-secscan 0.1.0, ESLint 9.39.5 using the repository security-plugin config, and Semgrep 1.180.0 using `p/secrets` plus the three testbed-specific rules in `benchmarks/semgrep/rn-security.yml`.

| Tool | TP | FP | FN | Precision | Recall | F1 |
|---|---:|---:|---:|---|---|---:|
| rn-secscan | 9 | 0 | 3 | 9/9 = 100.0% (95% CI 70.1%–100.0%) | 9/12 = 75.0% (95% CI 46.8%–91.1%) | 85.7% |
| ESLint | 0 | 0 | 12 | n/a (no findings) | 0/12 = 0.0% (95% CI 0.0%–24.3%) | n/a |
| Semgrep | 3 | 1 | 9 | 3/4 = 75.0% (95% CI 30.1%–95.4%) | 3/12 = 25.0% (95% CI 8.9%–53.2%) | 37.5% |

This is a targeted regression suite written by the scanner author, not an independent estimate. Semgrep's custom rules are fixture-specific and must not be presented as the performance of its general community rules.

## Scan and labeling procedure

1. Record the scanner commit, upstream repository, source commit, app subdirectory, scan command, and date for every run.
2. Verify that the app source tree is present and count its JS/TS files before scanning. Empty or incomplete checkouts invalidate a scan.
3. Export findings using stable pseudonymous repository names. Keep raw JSONL exports and labels local; do not commit source context or repository/file/line pointers without a disclosure review.
4. Label each current finding `TP`, `FP`, or `UNSURE`, with a short evidence-based reason. Exclude `UNSURE` from precision calculations. Carry old labels forward only when the source commit, rule, file, and line still match.
5. Tune scanner rules and judge prompts on the development set only. Freeze and record the scanner commit and prompt version before any held-out judge run. Run the held-out judge once after freezing; report the result even if it is poor.
6. Compare rules-only and rules-plus-judge on the same findings and labels. Report sample counts and uncertainty intervals. Do not present the current small exploratory sets as a reliable benchmark.

## Judge scope and output

The judge may set `keep: false` only for contextual JavaScript heuristic findings:

- `RNSEC001`
- `RNSEC003` at medium severity only
- `RNSEC004`

All other findings must be kept by the rule-only path. In particular, native-configuration findings and high-severity `RNSEC003` known-format secret findings are not eligible for AI suppression. The judge must treat source context as untrusted data and must not follow instructions embedded in code, comments, or strings.

Record the model name, prompt version, judgment timestamp, token usage, decision, confidence, and concise reason for each prediction. Never include the label verdict or label reason in the judge prompt.

## Metrics and limitations

Precision may be reported only for decided finding labels (`TP` and `FP`), with `UNSURE` excluded and denominators shown. Compare rules-only and judge-assisted precision on identical records.

**True scanner recall is excluded.** The current real-app process labels scanner findings, not independently discovered vulnerabilities and misses. Pooled relative recall is permitted only with the definition and limitations above; it is not a false-negative rate or completeness claim.

Claude judging is opt-in and sends exported, best-effort-redacted code context to Anthropic only after explicit confirmation. Inspect data before transfer; never send private, employer, or otherwise confidential source code.

## Change log

| Date | Change |
|---|---|
| 2026-10-06 | Added the coverage matrix, ground-truth testbed method, and pooled blind-labeling method with relative-recall and authorship limitations. |
| 2026-10-10 | Development-only RNSEC003 iteration: generic entropy findings are suppressed for identifier-like literals assigned to KEY-suffixed names when the sensitive name tokens are present in the literal. The six labeled development false positives were storage-key labels; three available development checkouts were rescanned and produced no RNSEC003 findings. This is a rule-development result, not a performance estimate. |
| 2026-10-10 | Recorded the development-only per-rule label breakdown and clarified that the increase from 49 to 70 labeled rows reflects 20 added TP labels and one `UNSURE`, not an accuracy improvement. |
