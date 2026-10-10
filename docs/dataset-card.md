# Dataset Card: rn-secscan Authored Testbed

## Summary

`testbed/rn-vuln-app` is a small, intentionally vulnerable React Native-shaped fixture used to check scanner behavior. It is authored for this project and is a regression testbed, not a sample of real-world applications.

## Contents

- 21 line-level cases across the nine categories listed in `testbed/rn-vuln-app/ground-truth.json`.
- 9 vulnerable examples expected to be detected.
- 9 safe counterparts expected to produce no finding.
- 3 intentional known misses that document current coverage limits.
- Synthetic credentials and reserved `.test` endpoints; no production credentials or private application source.

## Intended use

Use it to reproduce the scanner's targeted behavior, compare rule changes against known cases, and demonstrate tool integration. Do not use it to estimate vulnerability prevalence, real-app precision, or true recall.

## Collection and labeling

The fixtures and expected outcomes were written by the scanner author. The same authorship creates bias toward the cases the rules were designed to detect. Labels describe expected behavior at specific lines; they are not independent vulnerability findings.

## Limitations

The dataset is small, synthetic, and static. It does not model project diversity, runtime behavior, cross-file flows, or vulnerabilities outside the nine categories. Any results should be reported with the case counts and the authorship limitation.

## Privacy and licensing

The authored fixtures contain no third-party application source or known real credentials. They are distributed with the repository under its MIT license.
