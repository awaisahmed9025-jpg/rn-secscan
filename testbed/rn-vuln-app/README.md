# rn-vuln-app benchmark testbed

This is a dependency-free React Native-shaped source tree used to check scanner
behavior. It intentionally contains one vulnerable and one safe counterpart for
each rn-secscan category. Secret-looking values are fake, non-provider-specific
placeholders chosen to exercise the entropy/name heuristic without matching
real credential formats.

The additional negative cases document known limits: an aliased AsyncStorage
import, a wrapper whose parameter name is not sensitive-looking, and an HTTPS
client with no certificate-pinning configuration. These are vulnerable truths
that rn-secscan is expected to miss, not safe examples.

`ground-truth.json` records the file and line for each case. The benchmark
scorer treats `vulnerable` cases as positives and `safe` cases as negatives;
the `expectedDetection` field documents the intended rn-secscan result.
