export type CorpusExpressionValue = number | boolean;

export interface CorpusExpressionAssignment {
  name: string;
  expression: string;
}

export interface CorpusExpressionResult {
  values: Record<string, CorpusExpressionValue>;
  unresolved: CorpusExpressionAssignment[];
}

export type CorpusAssignmentStatus = "resolved" | "invalid" | "missing" | "cycle" | "unresolved";

export interface CorpusAssignmentAnalysis extends CorpusExpressionAssignment {
  normalizedName: string;
  dependencies: string[];
  missing: string[];
  status: CorpusAssignmentStatus;
  value: CorpusExpressionValue | null;
}

type Node =
  | { kind: "literal"; value: CorpusExpressionValue }
  | { kind: "variable"; name: string }
  | { kind: "unary"; operator: "+" | "-" | "NOT"; value: Node }
  | { kind: "binary"; operator: string; left: Node; right: Node }
  | { kind: "call"; name: string; arguments: Node[] };

/**
 * Ograničeni evaluator Corpus izraza. Parser nikada ne koristi eval niti
 * izvršava JavaScript; nepoznata sintaksa, funkcija ili varijabla vraća null.
 */
export function evaluateCorpusExpression(
  expression: string,
  variables: Readonly<Record<string, CorpusExpressionValue>>,
): CorpusExpressionValue | null {
  const root = parseCorpusExpression(expression);
  if (!root) return null;
  return evaluateNode(root, Object.fromEntries(Object.entries(variables).map(([key, value]) => [key.toUpperCase(), value])));
}

/** Provjerava samo podržanu gramatiku, bez traženja vrijednosti varijabli. */
export function isCorpusExpressionSyntaxSupported(expression: string): boolean {
  const root = parseCorpusExpression(expression);
  return root !== null && hasSupportedOperations(root);
}

/**
 * Računa lanac zavisnih Corpus dodjela bez izvršavanja proizvoljnog koda.
 * Više prolaza rješava reference na ranije ili kasnije navedene varijable;
 * ciklusi i nepoznate vrijednosti ostaju eksplicitno neriješeni.
 */
export function evaluateCorpusAssignments(
  assignments: readonly CorpusExpressionAssignment[],
  initialValues: Readonly<Record<string, CorpusExpressionValue>> = {},
): CorpusExpressionResult {
  const values: Record<string, CorpusExpressionValue> = Object.fromEntries(
    Object.entries(initialValues).map(([name, value]) => [name.toUpperCase(), value]),
  );
  let unresolved = assignments.map((assignment) => ({ ...assignment, name: assignment.name.toUpperCase() }));
  for (let pass = 0; pass < assignments.length && unresolved.length; pass += 1) {
    const next: CorpusExpressionAssignment[] = [];
    let progress = false;
    for (const assignment of unresolved) {
      const value = evaluateCorpusExpression(assignment.expression, values);
      if (value === null) next.push(assignment);
      else {
        values[assignment.name] = value;
        progress = true;
      }
    }
    unresolved = next;
    if (!progress) break;
  }
  return { values, unresolved };
}

/**
 * Daje objašnjiv read-only pregled svake dodjele. Analiza razlikuje nepodržanu
 * sintaksu, stvarno nedostajuća imena, ciklus i ostale nerješive izraze. Ne
 * izvršava proizvoljan kod i ne pretpostavlja značenje nepoznatih funkcija.
 */
export function analyzeCorpusAssignments(
  assignments: readonly CorpusExpressionAssignment[],
  initialValues: Readonly<Record<string, CorpusExpressionValue>> = {},
): CorpusAssignmentAnalysis[] {
  const evaluated = evaluateCorpusAssignments(assignments, initialValues);
  const initialNames = new Set(Object.keys(initialValues).map((name) => name.toUpperCase()));
  const assignmentNames = new Set(assignments.map(({ name }) => name.toUpperCase()));
  const unresolvedNames = new Set(evaluated.unresolved.map(({ name }) => name.toUpperCase()));
  const dependenciesByName = new Map<string, string[]>();
  for (const assignment of assignments) {
    dependenciesByName.set(assignment.name.toUpperCase(), corpusExpressionDependencies(assignment.expression) ?? []);
  }
  const reachesSelf = (start: string, current: string, visited: Set<string>): boolean => {
    if (visited.has(current)) return false;
    visited.add(current);
    for (const dependency of dependenciesByName.get(current) ?? []) {
      if (!unresolvedNames.has(dependency)) continue;
      if (dependency === start || reachesSelf(start, dependency, visited)) return true;
    }
    return false;
  };

  return assignments.map((assignment) => {
    const normalizedName = assignment.name.toUpperCase();
    const dependencies = corpusExpressionDependencies(assignment.expression);
    const value = evaluated.values[normalizedName];
    const missing = (dependencies ?? []).filter((name) => !assignmentNames.has(name) && !initialNames.has(name));
    let status: CorpusAssignmentStatus;
    if (dependencies === null) status = "invalid";
    else if (value !== undefined) status = "resolved";
    else if (missing.length) status = "missing";
    else if (reachesSelf(normalizedName, normalizedName, new Set())) status = "cycle";
    else status = "unresolved";
    return { ...assignment, normalizedName, dependencies: dependencies ?? [], missing, status, value: value ?? null };
  });
}

/** Vraća jedinstvene reference na varijable ili null za nepodržan izraz. */
export function corpusExpressionDependencies(expression: string): string[] | null {
  const root = parseCorpusExpression(expression);
  if (!root || !hasSupportedOperations(root)) return null;
  const dependencies: string[] = [];
  const seen = new Set<string>();
  const visit = (node: Node) => {
    if (node.kind === "variable") {
      if (!seen.has(node.name)) { seen.add(node.name); dependencies.push(node.name); }
      return;
    }
    if (node.kind === "unary") return visit(node.value);
    if (node.kind === "binary") { visit(node.left); visit(node.right); return; }
    if (node.kind === "call") node.arguments.forEach(visit);
  };
  visit(root);
  return dependencies;
}

function parseCorpusExpression(expression: string): Node | null {
  const tokenized = tokenize(expression);
  if (!tokenized) return null;
  const tokens = tokenized;
  let index = 0;

  const primary = (): Node | null => {
    const token = tokens[index++];
    if (!token) return null;
    if (token === "(") {
      const node = logicalOr();
      if (!node || tokens[index++] !== ")") return null;
      return node;
    }
    if (/^(?:\d+(?:\.\d*)?|\.\d+)$/.test(token)) return { kind: "literal", value: Number(token) };
    if (!isIdentifier(token)) return null;
    const name = token.toUpperCase();
    if (name === "TRUE" || name === "FALSE") return { kind: "literal", value: name === "TRUE" };
    if (tokens[index] !== "(") return { kind: "variable", name };
    index += 1;
    const arguments_: Node[] = [];
    if (tokens[index] !== ")") {
      while (true) {
        const argument = logicalOr();
        if (!argument) return null;
        arguments_.push(argument);
        if (tokens[index] !== ";" && tokens[index] !== ",") break;
        index += 1;
      }
    }
    if (tokens[index++] !== ")") return null;
    return { kind: "call", name, arguments: arguments_ };
  };
  const unary = (): Node | null => {
    const token = tokens[index]?.toUpperCase();
    if (token === "+" || token === "-" || token === "NOT") {
      index += 1;
      const value = unary();
      return value ? { kind: "unary", operator: token, value } : null;
    }
    return primary();
  };
  const product = (): Node | null => binaryLevel(unary, ["*", "/"]);
  const sum = (): Node | null => binaryLevel(product, ["+", "-"]);
  const comparison = (): Node | null => binaryLevel(sum, ["=", "!=", "<>", "<", "<=", ">", ">="]);
  const logicalAnd = (): Node | null => binaryLevel(comparison, ["AND"]);
  function logicalOr(): Node | null { return binaryLevel(logicalAnd, ["OR"]); }
  function binaryLevel(next: () => Node | null, operators: readonly string[]): Node | null {
    let node = next();
    while (node && operators.includes(tokens[index]?.toUpperCase() ?? "")) {
      const operator = tokens[index++]!.toUpperCase();
      const right = next();
      if (!right) return null;
      node = { kind: "binary", operator, left: node, right };
    }
    return node;
  }

  const root = logicalOr();
  if (!root || index !== tokens.length) return null;
  return root;
}

function evaluateNode(node: Node, variables: Readonly<Record<string, CorpusExpressionValue>>): CorpusExpressionValue | null {
  if (node.kind === "literal") return node.value;
  if (node.kind === "variable") return variables[node.name] ?? null;
  if (node.kind === "unary") {
    const value = evaluateNode(node.value, variables);
    if (node.operator === "NOT") return typeof value === "boolean" ? !value : null;
    return typeof value === "number" ? (node.operator === "-" ? -value : value) : null;
  }
  if (node.kind === "call") {
    if (node.name === "IF" && node.arguments.length === 3) {
      const condition = evaluateNode(node.arguments[0]!, variables);
      if (typeof condition !== "boolean") return null;
      return evaluateNode(node.arguments[condition ? 1 : 2]!, variables);
    }
    const values = node.arguments.map((argument) => evaluateNode(argument, variables));
    if (values.some((value) => typeof value !== "number")) return null;
    const numbers = values as number[];
    if (node.name === "MIN" && numbers.length) return Math.min(...numbers);
    if (node.name === "MAX" && numbers.length) return Math.max(...numbers);
    if (node.name === "ABS" && numbers.length === 1) return Math.abs(numbers[0]!);
    if (node.name === "ROUND" && numbers.length === 1) return Math.round(numbers[0]!);
    return null;
  }
  if (node.operator === "AND" || node.operator === "OR") {
    const left = evaluateNode(node.left, variables);
    if (typeof left !== "boolean") return null;
    if (node.operator === "AND" && !left) return false;
    if (node.operator === "OR" && left) return true;
    const right = evaluateNode(node.right, variables);
    return typeof right === "boolean" ? right : null;
  }
  const left = evaluateNode(node.left, variables);
  const right = evaluateNode(node.right, variables);
  if (left === null || right === null) return null;
  if (["=", "!=", "<>", "<", "<=", ">", ">="].includes(node.operator)) {
    if (typeof left !== typeof right) return null;
    if (node.operator === "=") return left === right;
    if (node.operator === "!=" || node.operator === "<>") return left !== right;
    if (typeof left !== "number" || typeof right !== "number") return null;
    if (node.operator === "<") return left < right;
    if (node.operator === "<=") return left <= right;
    if (node.operator === ">") return left > right;
    return left >= right;
  }
  if (typeof left !== "number" || typeof right !== "number") return null;
  if (node.operator === "+") return left + right;
  if (node.operator === "-") return left - right;
  if (node.operator === "*") return left * right;
  if (node.operator === "/") return right === 0 ? null : left / right;
  return null;
}

function hasSupportedOperations(node: Node): boolean {
  if (node.kind === "literal" || node.kind === "variable") return true;
  if (node.kind === "unary") return hasSupportedOperations(node.value);
  if (node.kind === "binary") return hasSupportedOperations(node.left) && hasSupportedOperations(node.right);
  const arityIsValid = node.name === "IF" ? node.arguments.length === 3
    : node.name === "MIN" || node.name === "MAX" ? node.arguments.length > 0
      : (node.name === "ABS" || node.name === "ROUND") && node.arguments.length === 1;
  return arityIsValid && node.arguments.every(hasSupportedOperations);
}

function tokenize(expression: string): string[] | null {
  const tokens: string[] = [];
  const pattern = /\s*(<=|>=|<>|!=|=|<|>|\+|-|\*|\/|\(|\)|;|,|(?:\d+(?:\.\d*)?|\.\d+)|[A-Za-zČĆŽŠĐčćžšđ_][A-Za-zČĆŽŠĐčćžšđ0-9_.]*)/y;
  let index = 0;
  while (index < expression.length) {
    pattern.lastIndex = index;
    const match = pattern.exec(expression);
    if (!match) return expression.slice(index).trim() ? null : tokens;
    tokens.push(match[1]!);
    index = pattern.lastIndex;
  }
  return tokens;
}

function isIdentifier(value: string): boolean {
  return /^[A-Za-zČĆŽŠĐčćžšđ_][A-Za-zČĆŽŠĐčćžšđ0-9_.]*$/.test(value);
}
