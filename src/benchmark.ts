import { ratio, type Ratio } from "./eval";
import {
  BENCHMARK_CATEGORIES,
  BENCHMARK_RULE_MAP,
  type BenchmarkCategory,
  type FindingCategory,
} from "./benchmark-category-map";

export interface BenchmarkFinding {
  tool: string;
  target: string;
  file: string;
  line: number;
  ruleId: string;
}

export interface NormalizedFinding extends BenchmarkFinding {
  category: FindingCategory;
  pooledId?: string;
}

export interface PooledFinding {
  id: string;
  target: string;
  file: string;
  line: number;
  categories: FindingCategory[];
}

export interface PooledSource {
  tools: string[];
  findings: Array<{ ruleId: string; category: FindingCategory }>;
}

export interface ToolMetrics {
  precision: Ratio;
  relativeRecall: Ratio;
}

export interface BenchmarkComparison {
  coverage: Record<string, Record<BenchmarkCategory, boolean>>;
  counts: Record<string, Record<string, Record<FindingCategory, number>>>;
  pooled: PooledFinding[];
  pooledSources: Record<string, PooledSource>;
  metrics: Record<string, ToolMetrics>;
}

export type PooledVerdict = "TP" | "FP";

function emptyCategoryCounts(): Record<FindingCategory, number> {
  return Object.fromEntries([...BENCHMARK_CATEGORIES, "other"].map((category) => [category, 0])) as Record<
    FindingCategory,
    number
  >;
}

export function normalizeFindings(
  findings: BenchmarkFinding[],
  ruleMap: Record<string, Record<string, BenchmarkCategory>> = BENCHMARK_RULE_MAP,
): NormalizedFinding[] {
  return findings.map((finding) => ({
    ...finding,
    category: ruleMap[finding.tool]?.[finding.ruleId] ?? "other",
  }));
}

export function compareBenchmarkFindings(
  findings: BenchmarkFinding[],
  verdicts: Map<string, PooledVerdict>,
  ruleMap: Record<string, Record<string, BenchmarkCategory>> = BENCHMARK_RULE_MAP,
): BenchmarkComparison {
  const normalized = normalizeFindings(findings, ruleMap);
  const categoryFindings = normalized.filter((finding) => finding.category !== "other");
  const pooledByLocation = new Map<string, PooledFinding>();
  const sourceByLocation = new Map<string, PooledSource>();
  const counts: BenchmarkComparison["counts"] = {};

  for (const finding of normalized) {
    counts[finding.tool] ??= {};
    counts[finding.tool][finding.target] ??= emptyCategoryCounts();
    counts[finding.tool][finding.target][finding.category]++;
  }

  for (const finding of categoryFindings) {
    const id = `${finding.target}:${finding.file}:${finding.line}`;
    finding.pooledId = id;
    const pooled = pooledByLocation.get(id) ?? {
      id,
      target: finding.target,
      file: finding.file,
      line: finding.line,
      categories: [],
    };
    if (!pooled.categories.includes(finding.category)) pooled.categories.push(finding.category);
    pooledByLocation.set(id, pooled);

    const source = sourceByLocation.get(id) ?? { tools: [], findings: [] };
    if (!source.tools.includes(finding.tool)) source.tools.push(finding.tool);
    source.findings.push({ ruleId: finding.ruleId, category: finding.category });
    sourceByLocation.set(id, source);
  }

  const pooled = [...pooledByLocation.values()].map((finding) => ({
    ...finding,
    categories: [...finding.categories].sort(),
  }));
  const pooledSources = Object.fromEntries(
    [...sourceByLocation.entries()].map(([id, source]) => [
      id,
      { tools: [...source.tools].sort(), findings: source.findings },
    ]),
  );
  const pooledTruePositives = pooled.filter((finding) => verdicts.get(finding.id) === "TP").length;
  const metrics: Record<string, ToolMetrics> = {};
  for (const tool of new Set(categoryFindings.map((finding) => finding.tool))) {
    const toolFindings = categoryFindings.filter((finding) => finding.tool === tool);
    const toolTruePositives = new Set(
      toolFindings
        .filter((finding) => finding.pooledId && verdicts.get(finding.pooledId) === "TP")
        .map((finding) => finding.pooledId),
    ).size;
    const toolPooledLocations = new Set(toolFindings.map((finding) => finding.pooledId)).size;
    metrics[tool] = {
      precision: ratio(toolTruePositives, toolPooledLocations),
      relativeRecall: ratio(
        new Set(
          toolFindings
            .filter((finding) => finding.pooledId && verdicts.get(finding.pooledId) === "TP")
            .map((finding) => finding.pooledId),
        ).size,
        pooledTruePositives,
      ),
    };
  }

  const coverage: BenchmarkComparison["coverage"] = {};
  for (const [tool, mappings] of Object.entries(ruleMap)) {
    coverage[tool] = Object.fromEntries(
      BENCHMARK_CATEGORIES.map((category) => [category, Object.values(mappings).includes(category)]),
    ) as Record<BenchmarkCategory, boolean>;
  }

  return { coverage, counts, pooled, pooledSources, metrics };
}
