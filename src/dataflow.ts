import { Node, SyntaxKind, type SourceFile } from "ts-morph";
import { SENSITIVE_NAME } from "./utils";

export type StoredValueSink = "network" | "log" | "state";

export interface StoredValueFlow {
  key: string;
  sourceLine: number;
  sink: StoredValueSink;
  sinkLine: number;
}

function sensitiveAsyncStorageRead(node: Node): { key: string; line: number } | undefined {
  if (!Node.isCallExpression(node)) return undefined;
  const expression = node.getExpression();
  if (!Node.isPropertyAccessExpression(expression)) return undefined;
  if (expression.getExpression().getText() !== "AsyncStorage" || expression.getName() !== "getItem") return undefined;
  const key = node.getArguments()[0]?.getText();
  if (!key || !SENSITIVE_NAME.test(key)) return undefined;
  return { key, line: node.getStartLineNumber() };
}

function valueIdentifiers(node: Node): string[] {
  const identifiers = [ ...(Node.isIdentifier(node) ? [node] : []), ...node.getDescendantsOfKind(SyntaxKind.Identifier) ];
  return identifiers
    .filter((identifier) => {
      const parent = identifier.getParent();
      if (Node.isPropertyAccessExpression(parent) && parent.getNameNode() === identifier) return false;
      if (Node.isPropertyAssignment(parent) && parent.getNameNode() === identifier) return false;
      return true;
    })
    .map((identifier) => identifier.getText());
}

function sinkKind(call: Node): StoredValueSink | undefined {
  if (!Node.isCallExpression(call)) return undefined;
  const expression = call.getExpression().getText();
  if (/^console\.(log|info|warn|error|debug|trace)$/.test(expression)) return "log";
  if (expression === "fetch" || /^(axios|api|client|request)\.(get|post|put|patch|delete|request)$/.test(expression)) {
    return "network";
  }
  if (expression === "AsyncStorage.setItem" || expression === "dispatch" || expression.endsWith(".dispatch") || /^set[A-Z]/.test(expression)) {
    return "state";
  }
  return undefined;
}

/** Track sensitive AsyncStorage reads through simple local aliases to common sinks in the same file. */
export function traceStoredValueFlows(sourceFile: SourceFile): StoredValueFlow[] {
  const origins = new Map<string, { key: string; line: number }[]>();
  const addOrigin = (name: string, origin: { key: string; line: number }): boolean => {
    const existing = origins.get(name) ?? [];
    if (existing.some((item) => item.key === origin.key && item.line === origin.line)) return false;
    origins.set(name, [...existing, origin]);
    return true;
  };

  for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const origin = sensitiveAsyncStorageRead(call);
    if (!origin) continue;
    const declaration = call.getFirstAncestorByKind(SyntaxKind.VariableDeclaration);
    if (declaration?.getInitializer()?.getDescendants().some((node) => node === call)) {
      addOrigin(declaration.getName(), origin);
    }
    const assignment = call.getFirstAncestorByKind(SyntaxKind.BinaryExpression);
    if (assignment && assignment.getOperatorToken().getKind() === SyntaxKind.EqualsToken && Node.isIdentifier(assignment.getLeft())) {
      addOrigin(assignment.getLeft().getText(), origin);
    }
  }

  // Propagate through simple variable declarations and assignments until the aliases stop changing.
  let changed = true;
  while (changed) {
    changed = false;
    for (const declaration of sourceFile.getDescendantsOfKind(SyntaxKind.VariableDeclaration)) {
      const initializer = declaration.getInitializer();
      if (!initializer) continue;
      for (const name of valueIdentifiers(initializer)) {
        for (const origin of origins.get(name) ?? []) changed = addOrigin(declaration.getName(), origin) || changed;
      }
    }
    for (const assignment of sourceFile.getDescendantsOfKind(SyntaxKind.BinaryExpression)) {
      if (assignment.getOperatorToken().getKind() !== SyntaxKind.EqualsToken || !Node.isIdentifier(assignment.getLeft())) continue;
      for (const name of valueIdentifiers(assignment.getRight())) {
        for (const origin of origins.get(name) ?? []) changed = addOrigin(assignment.getLeft().getText(), origin) || changed;
      }
    }
  }

  const flows = new Map<string, StoredValueFlow>();
  for (const call of sourceFile.getDescendantsOfKind(SyntaxKind.CallExpression)) {
    const sink = sinkKind(call);
    if (!sink) continue;
    for (const argument of call.getArguments()) {
      for (const name of valueIdentifiers(argument)) {
        for (const origin of origins.get(name) ?? []) {
          const flow = { key: origin.key, sourceLine: origin.line, sink, sinkLine: call.getStartLineNumber() };
          flows.set(`${flow.key}:${flow.sourceLine}:${flow.sink}:${flow.sinkLine}`, flow);
        }
      }
    }
  }
  return [...flows.values()].sort((a, b) => a.sourceLine - b.sourceLine || a.sinkLine - b.sinkLine);
}

export function flowContext(flow: StoredValueFlow): string {
  const sink = flow.sink === "network" ? "a network call" : flow.sink === "log" ? "a console log" : "state or storage";
  return ` A value read from AsyncStorage key ${flow.key} on line ${flow.sourceLine} reaches ${sink} on line ${flow.sinkLine}.`;
}
