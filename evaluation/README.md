# Real-Project Evaluation

These scans are an exploratory check of rn-secscan against public React Native projects. They are not a benchmark and the labels are not independently reviewed ground truth.

## Current Scan Results

The repositories were shallow-cloned beside the scanner. Full source commit hashes and finding labels are recorded in [real-repo-labels.csv](real-repo-labels.csv). JSON reports are saved outside the clones and this repository.

| Project | Findings | Approx. scan time | JSON report |
|---|---:|---:|---|
| repo-A | 2 | 14 sec | `local artifact outside this repository` |
| repo-B | 6 | 26 sec | `local artifact outside this repository` |
| repo-C (repo-C) | 0 | 26 sec | `local artifact outside this repository` |
| repo-D | 1 | 5 sec | `local artifact outside this repository` |

The current totals are not equivalent to confirmed vulnerabilities. Review each finding in its source context; in particular, library manifests and exported share activities need app-level context.

## Label Notes

The CSV contains 48 reviewed findings: 8 true positives and 40 false positives. No source snippets or literal credential values are stored in the CSV.

The first 47 labels (repo-A, repo-B, and one repo-C route false positive) came from earlier scanner passes before default test/e2e exclusions and identifier-name false-positive fixes. repo-D was scanned after those changes. Treat the file as a record of early triage cases, not as one consistent benchmark run. To calculate meaningful precision or recall, freeze a scanner revision, rescan all projects, and label that complete output consistently.

repo-C produced no findings in the current scan. That is a coverage observation, not evidence that the app has no security issues.

## Held-Out Scan

The rules were frozen at scanner commit `f4a7d42c3f12396dba0d89633d9e5c0c8cda10c8` before these scans. To keep the initial runs focused and avoid incomplete full-monorepo checkouts, scans targeted each app's mobile source subtree.

| Project | Source commit | JS/TS files in app subtree | Findings | Scan time | JSON report |
|---|---|---:|---:|---:|---|
| repo-E | `[commit]` | 1,340 | 0 | 6.94 sec | `local artifact outside this repository` |
| repo-F mobile | `[commit]` | 778 | 2 | 10.85 sec | `local artifact outside this repository` |
| repo-G | `[commit]` | 711 | 0 | 6.46 sec | `local artifact outside this repository` |
| repo-H | `[commit]` | 88 | 0 | 2.53 sec | `local artifact outside this repository` |
| repo-I | `[commit]` | 60 | 0 | 1.08 sec | `local artifact outside this repository` |
| repo-J | `[commit]` | 300 | 6 | 3.59 sec | `local artifact outside this repository` |

The first scans accidentally ran against empty partial worktrees and are discarded. The results above are the valid scans after checking that the app source files were present. Of eight held-out findings, six were labeled false positive and two true positive; these counts are a small exploratory set, not a reliable performance metric. Labels are in [heldout-labels.csv](heldout-labels.csv). No rules were changed after these held-out scans.

## Data Handling

This evaluation directory is local and untracked. Do not publish it as-is: the development labels include repository/file/line pointers, and the development set combines scanner revisions. Raw JSON reports remain outside the repository. Review any confirmed vulnerability through the upstream project's security process before sharing details.

## Storage Recall Spot-Check

- repo-C uses MMKV without an `encryptionKey` in its storage wrapper. The inspected device/account schemas contain a stable analytics device ID, analytics session metadata, geolocation metadata, and preferences; no authentication token was found in those schemas during this spot-check. Whether these identifiers and location records warrant a separate privacy rule needs a clearly defined policy.
- repo-A's MMKV wrapper requests an encryption key from native secure storage and applies it when available. It also uses Keychain-backed handling for relevant secrets.
- repo-B uses WatermelonDB for local application data and includes Keychain integration. This scan did not trace every persisted field or prove database encryption.

This was a targeted source search, not a complete recall audit. MMKV/Realm/WatermelonDB use alone is not enough to call data sensitive or exposed; review the data and encryption configuration before adding a finding.