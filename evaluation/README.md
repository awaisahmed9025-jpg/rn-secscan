# Real-Project Evaluation

These scans are an exploratory check of rn-secscan against public React Native projects. They are not a benchmark and the labels are not independently reviewed ground truth.

## Current Scan Results

The repositories were shallow-cloned beside the scanner. Full source commit hashes and finding labels are recorded in [real-repo-labels.csv](real-repo-labels.csv). JSON reports are saved outside the clones and this repository.

| Project | Findings | Approx. scan time | JSON report |
|---|---:|---:|---|
| Rocket.Chat.ReactNative | 2 | 14 sec | `D:\findings-rocketchat.json` |
| mattermost-mobile | 6 | 26 sec | `D:\findings-mattermost.json` |
| social-app (Bluesky) | 0 | 26 sec | `D:\findings-bluesky.json` |
| TaskFlow | 1 | 5 sec | `D:\findings-taskflow.json` |

The current totals are not equivalent to confirmed vulnerabilities. Review each finding in its source context; in particular, library manifests and exported share activities need app-level context.

## Label Notes

The CSV contains 48 reviewed findings: 8 true positives and 40 false positives. No source snippets or literal credential values are stored in the CSV.

The first 47 labels (Rocket.Chat, Mattermost, and one Bluesky route false positive) came from earlier scanner passes before default test/e2e exclusions and identifier-name false-positive fixes. TaskFlow was scanned after those changes. Treat the file as a record of early triage cases, not as one consistent benchmark run. To calculate meaningful precision or recall, freeze a scanner revision, rescan all projects, and label that complete output consistently.

Bluesky produced no findings in the current scan. That is a coverage observation, not evidence that the app has no security issues.

## Held-Out Scan

The rules were frozen at scanner commit `f4a7d42c3f12396dba0d89633d9e5c0c8cda10c8` before these scans. To keep the initial runs focused and avoid incomplete full-monorepo checkouts, scans targeted each app's mobile source subtree.

| Project | Source commit | JS/TS files in app subtree | Findings | Scan time | JSON report |
|---|---|---:|---:|---:|---|
| Beancount mobile | `6710d2de2988d7f8fb6fa5e7bcb5d3132e6b35d3` | 1,340 | 0 | 6.94 sec | `D:\findings-holdout-beancount.json` |
| Nautilo mobile | `67e0ea0a5ca8e9d86cb6ec5c602f6c861e9342dd` | 778 | 2 | 10.85 sec | `D:\findings-holdout-nautilo.json` |
| Ever Teams mobile | `a6ccd71ce3ca54f77b3af50cf723c49da8f1d4a1` | 711 | 0 | 6.46 sec | `D:\findings-holdout-ever-teams.json` |
| `let` habit tracker | `fb5668910b32a34b971dca3e9a4a98221c03b55d` | 88 | 0 | 2.53 sec | `D:\findings-holdout-let.json` |
| FSD Todo app | `a621ecd010bcea02817bc41a37e4649254570ce5` | 60 | 0 | 1.08 sec | `D:\findings-holdout-fs-todo.json` |
| Saturn Chat mobile | `a56f986a6a3a2859efdb0ce913e2413f45ab96e2` | 300 | 6 | 3.59 sec | `D:\findings-holdout-saturn-chat.json` |

The first scans accidentally ran against empty partial worktrees and are discarded. The results above are the valid scans after checking that the app source files were present. Of eight held-out findings, six were labeled false positive and two true positive; these counts are a small exploratory set, not a reliable performance metric. Labels are in [heldout-labels.csv](heldout-labels.csv). No rules were changed after these held-out scans.

## Data Handling

This evaluation directory is local and untracked. Do not publish it as-is: the development labels include repository/file/line pointers, and the development set combines scanner revisions. Raw JSON reports remain outside the repository. Review any confirmed vulnerability through the upstream project's security process before sharing details.

## Storage Recall Spot-Check

- Bluesky uses MMKV without an `encryptionKey` in its storage wrapper. The inspected device/account schemas contain a stable analytics device ID, analytics session metadata, geolocation metadata, and preferences; no authentication token was found in those schemas during this spot-check. Whether these identifiers and location records warrant a separate privacy rule needs a clearly defined policy.
- Rocket.Chat's MMKV wrapper requests an encryption key from native secure storage and applies it when available. It also uses Keychain-backed handling for relevant secrets.
- Mattermost uses WatermelonDB for local application data and includes Keychain integration. This scan did not trace every persisted field or prove database encryption.

This was a targeted source search, not a complete recall audit. MMKV/Realm/WatermelonDB use alone is not enough to call data sensitive or exposed; review the data and encryption configuration before adding a finding.