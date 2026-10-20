import { isCorpusExpressionSyntaxSupported, type CorpusExpressionAssignment } from "./corpus-expression.ts";

export interface CorpusMacroAssignment extends CorpusExpressionAssignment {
  syntaxSupported: boolean;
  dependencies: readonly string[];
}

export interface CorpusMacroAnalysis {
  assignments: readonly CorpusMacroAssignment[];
  externalVariables: readonly string[];
}

const reservedWords = new Set(["AND", "OR", "NOT", "TRUE", "FALSE", "IF", "MIN", "MAX", "ABS", "ROUND"]);

/** Corpus C6DAT je u praksi mješavina UTF-8 i starijeg Windows-1250 teksta. */
export function decodeCorpusText(bytes: Uint8Array): string {
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    return new TextDecoder("windows-1250").decode(bytes);
  }
}

/**
 * Rastavlja dekodirani C6DAT tekst bez izvršavanja sadržaja. Corpus koristi
 * zarez između dodjela, dok su zarezi unutar navodnika i zagrada dio vrijednosti.
 */
export function analyzeCorpusMacroPayload(payload: string): CorpusMacroAnalysis {
  const assignments = splitTopLevel(payload).flatMap<CorpusMacroAssignment>((part) => {
    const normalized = stripOuterQuotes(part.trim());
    const equals = normalized.indexOf("=");
    if (equals <= 0) return [];
    const name = normalized.slice(0, equals).trim();
    if (!isIdentifier(name)) return [];
    const expression = stripOuterQuotes(normalized.slice(equals + 1).trim());
    if (!expression) return [];
    return [{
      name: name.toUpperCase(),
      expression,
      syntaxSupported: isCorpusExpressionSyntaxSupported(expression),
      dependencies: expressionDependencies(expression),
    }];
  });
  const assigned = new Set(assignments.map(({ name }) => name));
  const externalVariables = [...new Set(assignments.filter(({ syntaxSupported }) => syntaxSupported).flatMap(({ dependencies }) => dependencies))]
    .filter((name) => !assigned.has(name))
    .sort();
  return { assignments, externalVariables };
}

function expressionDependencies(expression: string): string[] {
  const matches = expression.match(/[A-Za-zČĆŽŠĐčćžšđ_][A-Za-zČĆŽŠĐčćžšđ0-9_.]*/g) ?? [];
  return [...new Set(matches.map((name) => name.toUpperCase()).filter((name) => !reservedWords.has(name)))];
}

function splitTopLevel(payload: string): string[] {
  const parts: string[] = [];
  let start = 0;
  let depth = 0;
  let quoted = false;
  for (let index = 0; index < payload.length; index += 1) {
    const character = payload[index]!;
    if (character === '"') quoted = !quoted;
    else if (!quoted && character === "(") depth += 1;
    else if (!quoted && character === ")") depth = Math.max(0, depth - 1);
    else if (!quoted && depth === 0 && character === ",") {
      parts.push(payload.slice(start, index));
      start = index + 1;
    }
  }
  parts.push(payload.slice(start));
  return parts;
}

function stripOuterQuotes(value: string): string {
  return value.startsWith('"') && value.endsWith('"') ? value.slice(1, -1).trim() : value;
}

function isIdentifier(value: string): boolean {
  return /^[A-Za-zČĆŽŠĐčćžšđ_][A-Za-zČĆŽŠĐčćžšđ0-9_.]*$/.test(value);
}
