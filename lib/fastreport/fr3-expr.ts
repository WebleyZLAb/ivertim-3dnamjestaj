/**
 * Mali evaluator FastReport izraza. Podržava ono što koriste Corpus šabloni:
 * [DS."POLJE"], <DS."POLJE"> u izrazima, varijable, brojeve, tekst, + - * / div mod,
 * poređenja, and/or/not, SUM, COUNT, IIF, Round, kao i sistemske vrijednosti
 * [DATE], [TIME], [Page#], [TOTALPAGES#], [Line#].
 * Pascal skripte (OnBeforePrint i sl.) se ne izvršavaju.
 */

export type Row = Readonly<Record<string, string | number | null>>;
export type Value = string | number | boolean | null;

export type ExprContext = {
  /** Trenutni red skupa podataka (ime je veliko slovo) ili undefined. */
  row(dataset: string): Row | undefined;
  /** Izraz varijable izvještaja ili undefined. */
  variable(name: string): string | undefined;
  /** Sistemska vrijednost: DATE, TIME, PAGE#, TOTALPAGES#, LINE#. */
  system(name: string): Value | undefined;
  /** Imena varijabli izvještaja (velikim slovima), za <ime> u izrazima. */
  variableNames: ReadonlySet<string>;
  /** Za svaki red skupa podataka trake poziva visit s kontekstom u kojem je taj red trenutni (SUM/COUNT). */
  forEachBandRow(band: string, visit: (rowContext: ExprContext) => void): void;
};

export type Node =
  | { kind: "num"; value: number }
  | { kind: "str"; value: string }
  | { kind: "field"; dataset: string; field: string }
  | { kind: "name"; name: string }
  | { kind: "call"; name: string; args: Node[]; source: string[] }
  | { kind: "unary"; op: string; arg: Node }
  | { kind: "binary"; op: string; left: Node; right: Node };

type Token = { type: "num" | "str" | "field" | "name" | "op" | "end"; text: string; dataset?: string };

function tokenize(source: string, knownVariables: ReadonlySet<string>): Token[] {
  const tokens: Token[] = [];
  let index = 0;
  while (index < source.length) {
    const rest = source.slice(index);
    const space = /^\s+/.exec(rest);
    if (space) { index += space[0].length; continue; }
    const angled = /^<([A-Za-z_]\w*)\."([^"]+)">/.exec(rest);
    if (angled) { tokens.push({ type: "field", text: angled[2]!, dataset: angled[1]!.toUpperCase() }); index += angled[0].length; continue; }
    const angledVar = /^<([A-Za-z_]\w*)>/.exec(rest);
    if (angledVar && knownVariables.has(angledVar[1]!.toUpperCase())) { tokens.push({ type: "name", text: angledVar[1]! }); index += angledVar[0].length; continue; }
    const field = /^([A-Za-z_]\w*)\."([^"]+)"/.exec(rest);
    if (field) { tokens.push({ type: "field", text: field[2]!, dataset: field[1]!.toUpperCase() }); index += field[0].length; continue; }
    const number = /^\d+(?:\.\d+)?/.exec(rest);
    if (number) { tokens.push({ type: "num", text: number[0] }); index += number[0].length; continue; }
    const quote = rest[0];
    if (quote === "'" || quote === '"') {
      let end = 1, text = "";
      while (end < rest.length) {
        if (rest[end] === quote) { if (rest[end + 1] === quote) { text += quote; end += 2; continue; } break; }
        text += rest[end]; end++;
      }
      tokens.push({ type: "str", text }); index += end + 1; continue;
    }
    const name = /^[A-Za-z_][\w#]*/.exec(rest);
    if (name) { tokens.push({ type: "name", text: name[0] }); index += name[0].length; continue; }
    const op = /^(<>|<=|>=|[-+*\/=<>(),])/.exec(rest);
    if (op) { tokens.push({ type: "op", text: op[0] }); index += op[0].length; continue; }
    throw new Error(`Nepoznat znak u izrazu: ${rest[0]}`);
  }
  tokens.push({ type: "end", text: "" });
  return tokens;
}

export function parseExpression(source: string, knownVariables: ReadonlySet<string> = new Set()): Node {
  const tokens = tokenize(source, knownVariables);
  let position = 0;
  const peek = () => tokens[position]!;
  const next = () => tokens[position++]!;
  const isWord = (token: Token, word: string) => token.type === "name" && token.text.toLowerCase() === word;
  const isOp = (token: Token, text: string) => token.type === "op" && token.text === text;

  const parseOr = (): Node => { let left = parseAnd(); while (isWord(peek(), "or")) { next(); left = { kind: "binary", op: "or", left, right: parseAnd() }; } return left; };
  const parseAnd = (): Node => { let left = parseNot(); while (isWord(peek(), "and")) { next(); left = { kind: "binary", op: "and", left, right: parseNot() }; } return left; };
  const parseNot = (): Node => { if (isWord(peek(), "not")) { next(); return { kind: "unary", op: "not", arg: parseNot() }; } return parseCompare(); };
  const parseCompare = (): Node => {
    const left = parseAdd();
    const token = peek();
    if (token.type === "op" && ["=", "<>", "<", ">", "<=", ">="].includes(token.text)) { next(); return { kind: "binary", op: token.text, left, right: parseAdd() }; }
    return left;
  };
  const parseAdd = (): Node => {
    let left = parseMul();
    while (isOp(peek(), "+") || isOp(peek(), "-")) { const op = next().text; left = { kind: "binary", op, left, right: parseMul() }; }
    return left;
  };
  const parseMul = (): Node => {
    let left = parseUnary();
    while (isOp(peek(), "*") || isOp(peek(), "/") || isWord(peek(), "div") || isWord(peek(), "mod")) {
      const op = next().text.toLowerCase(); left = { kind: "binary", op, left, right: parseUnary() };
    }
    return left;
  };
  const parseUnary = (): Node => { if (isOp(peek(), "-")) { next(); return { kind: "unary", op: "-", arg: parseUnary() }; } return parsePrimary(); };
  const parsePrimary = (): Node => {
    const token = next();
    if (token.type === "num") return { kind: "num", value: Number(token.text) };
    if (token.type === "str") return { kind: "str", value: token.text };
    if (token.type === "field") return { kind: "field", dataset: token.dataset!, field: token.text.toUpperCase() };
    if (isOp(token, "(")) { const inner = parseOr(); if (!isOp(next(), ")")) throw new Error("Nedostaje )"); return inner; }
    if (token.type === "name") {
      if (isOp(peek(), "(")) {
        next();
        const args: Node[] = []; const source: string[] = [];
        if (!isOp(peek(), ")")) {
          for (;;) {
            // Sirovo ime trake (npr. DetailData1) ostaje tekst; ostalo se parsira kao izraz.
            const start = position;
            const arg = parseOr();
            args.push(arg); source.push(tokens.slice(start, position).map((t) => t.text).join(""));
            if (isOp(peek(), ",")) { next(); continue; }
            break;
          }
        }
        if (!isOp(next(), ")")) throw new Error("Nedostaje )");
        return { kind: "call", name: token.text, args, source };
      }
      return { kind: "name", name: token.text };
    }
    throw new Error("Neočekivan kraj izraza");
  };
  const result = parseOr();
  if (peek().type !== "end") throw new Error(`Neočekivano: ${peek().text}`);
  return result;
}

const toNumber = (value: Value): number => {
  if (typeof value === "number") return value;
  if (typeof value === "boolean") return value ? 1 : 0;
  if (value === null || value === "") return 0;
  const parsed = Number(String(value).replace(",", "."));
  return Number.isFinite(parsed) ? parsed : 0;
};
const isTrue = (value: Value) => value === true || (typeof value === "number" && value !== 0) || (typeof value === "string" && value !== "" && value.toLowerCase() !== "false");

function compare(left: Value, right: Value): number {
  const numeric = (value: Value) => typeof value === "number" || (typeof value === "string" && value.trim() !== "" && Number.isFinite(Number(value.replace(",", "."))));
  if (numeric(left) && numeric(right)) return toNumber(left) - toNumber(right);
  return String(left ?? "").localeCompare(String(right ?? ""), "hr");
}

export function evaluateNode(node: Node, context: ExprContext, depth = 0): Value {
  if (depth > 20) throw new Error("Previše ugniježdenih varijabli.");
  switch (node.kind) {
    case "num": return node.value;
    case "str": return node.value;
    case "field": return context.row(node.dataset)?.[node.field] ?? null;
    case "name": {
      const system = context.system(node.name.toUpperCase());
      if (system !== undefined) return system;
      const variable = context.variable(node.name.toUpperCase());
      if (variable !== undefined) return evaluateNode(parseExpression(variable.trim(), context.variableNames), context, depth + 1);
      return null;
    }
    case "unary": {
      const value = evaluateNode(node.arg, context, depth);
      return node.op === "not" ? !isTrue(value) : -toNumber(value);
    }
    case "binary": {
      const left = evaluateNode(node.left, context, depth);
      const right = evaluateNode(node.right, context, depth);
      switch (node.op) {
        case "+": return typeof left === "string" && !Number.isFinite(Number(left)) || typeof right === "string" && !Number.isFinite(Number(right)) ? `${left ?? ""}${right ?? ""}` : toNumber(left) + toNumber(right);
        case "-": return toNumber(left) - toNumber(right);
        case "*": return toNumber(left) * toNumber(right);
        case "/": return toNumber(right) === 0 ? 0 : toNumber(left) / toNumber(right);
        case "div": return toNumber(right) === 0 ? 0 : Math.trunc(toNumber(left) / toNumber(right));
        case "mod": return toNumber(right) === 0 ? 0 : toNumber(left) % toNumber(right);
        case "=": return compare(left, right) === 0;
        case "<>": return compare(left, right) !== 0;
        case "<": return compare(left, right) < 0;
        case ">": return compare(left, right) > 0;
        case "<=": return compare(left, right) <= 0;
        case ">=": return compare(left, right) >= 0;
        case "and": return isTrue(left) && isTrue(right);
        case "or": return isTrue(left) || isTrue(right);
      }
      return null;
    }
    case "call": {
      const name = node.name.toUpperCase();
      if (name === "IIF") return isTrue(evaluateNode(node.args[0]!, context, depth)) ? evaluateNode(node.args[1]!, context, depth) : evaluateNode(node.args[2] ?? { kind: "str", value: "" }, context, depth);
      if (name === "ROUND") return Math.round(toNumber(evaluateNode(node.args[0]!, context, depth)) * 100) / 100;
      if (name === "SUM" || name === "COUNT") {
        const band = name === "SUM" ? node.source[1] : node.source[0];
        if (!band) return 0;
        let total = 0;
        context.forEachBandRow(band, (rowContext) => { total += name === "COUNT" ? 1 : toNumber(evaluateNode(node.args[0]!, rowContext, depth + 1)); });
        return total;
      }
      if (name === "UPPERCASE") return String(evaluateNode(node.args[0]!, context, depth) ?? "").toLocaleUpperCase("hr");
      if (name === "LOWERCASE") return String(evaluateNode(node.args[0]!, context, depth) ?? "").toLocaleLowerCase("hr");
      if (name === "COPY") return String(evaluateNode(node.args[0]!, context, depth) ?? "").substr(toNumber(evaluateNode(node.args[1]!, context, depth)) - 1, toNumber(evaluateNode(node.args[2]!, context, depth)));
      if (name === "FLOOR") return Math.floor(toNumber(evaluateNode(node.args[0]!, context, depth)));
      if (name === "CEIL") return Math.ceil(toNumber(evaluateNode(node.args[0]!, context, depth)));
      if (name === "ABS") return Math.abs(toNumber(evaluateNode(node.args[0]!, context, depth)));
      return null;
    }
  }
}

export function formatValue(value: Value): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "boolean") return value ? "True" : "False";
  if (typeof value === "number") return Number.isInteger(value) ? String(value) : String(Math.round(value * 100) / 100).replace(".", ",");
  return value;
}

/** Zamjenjuje svaki [izraz] u tekstu njegovom vrijednošću. Nepoznati ili neispravni izrazi ostaju prazni. */
export function evaluateText(text: string, context: ExprContext, depth = 0): string {
  let result = "";
  let index = 0;
  while (index < text.length) {
    const open = text.indexOf("[", index);
    if (open === -1) { result += text.slice(index); break; }
    result += text.slice(index, open);
    let close = -1, quote = "";
    for (let cursor = open + 1; cursor < text.length; cursor++) {
      const char = text[cursor]!;
      if (quote) { if (char === quote) quote = ""; continue; }
      if (char === '"' || char === "'") { quote = char; continue; }
      if (char === "]") { close = cursor; break; }
    }
    if (close === -1) { result += text.slice(open); break; }
    const source = text.slice(open + 1, close);
    try {
      result += formatValue(evaluateNode(parseExpression(source, context.variableNames), context, depth));
    } catch {
      result += "";
    }
    index = close + 1;
  }
  return result;
}
