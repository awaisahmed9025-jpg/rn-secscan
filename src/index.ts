export { scan } from "./scanner";
export type { ScanOptions } from "./scanner";
export { allRules, jsRules, nativeRules } from "./rules";
export { toSarif } from "./reporters/sarif";
export { formatConsole } from "./reporters/console";
export * from "./types";
export {
  compareBenchmarkFindings,
  normalizeFindings,
  type BenchmarkComparison,
  type BenchmarkFinding,
  type NormalizedFinding,
  type PooledFinding,
  type PooledSource,
  type ToolMetrics,
} from "./benchmark";
export { loadGroundTruth, scoreGroundTruth, type GroundTruthItem, type GroundTruthMetrics } from "./benchmark-ground-truth";
