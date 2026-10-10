# Model Card: Optional Claude Finding Triage

## Summary

The optional `judge` command asks an Anthropic Claude model to review exported rn-secscan findings. It is a triage aid layered over deterministic rules; it does not scan source independently, establish ground truth, trace full data flow, or apply fixes.

## Model and version

The model identifier is supplied at runtime through `ANTHROPIC_MODEL`; this repository does not pin a single model. The prompt protocol is `rn-secscan-judge-v1`. Record the exact model ID, prompt version, date, and token usage for every evaluation.

## Intended use and scope

The judge may recommend suppressing contextual JavaScript heuristic findings for `RNSEC001`, medium-severity `RNSEC003`, and `RNSEC004`. It cannot suppress native configuration findings or high-severity known-format `RNSEC003` findings. A human should review decisions before relying on them.

## Data handling

The command sends rule metadata, best-effort-redacted source context, and an optional enclosing function to Anthropic only when explicitly invoked with `--confirm-code-transfer`. Repository names and file paths are omitted. Redaction is not a guarantee; inspect each export and do not send private, employer, or otherwise confidential code.

## Evaluation status

No Claude API smoke test or judge evaluation has been run. API spend and source transfer were declined for this evaluation cycle, so there are no model performance results. Do not present the judge as evaluated or validated.

## Limitations and risks

The model may miss real issues, retain false positives, or be influenced by hostile text embedded in source. The prompt treats source as untrusted input, but this does not eliminate model error. Model behavior may change when the runtime model identifier changes.
