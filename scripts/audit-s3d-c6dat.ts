import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { inflateSync } from "node:zlib";
import { isCorpusExpressionSyntaxSupported } from "../lib/corpus-expression.ts";
import { decodeCorpusText } from "../lib/corpus-macro.ts";

const root = path.resolve(process.argv[2] ?? ".");
const files = await findS3dFiles(root);
const records = new Map<string, { count: number; decoded: boolean; bytes: number; printableRatio: number; preview: string; tags: Set<string> }>();
let occurrences = 0;
let failed = 0;
let formulaCandidates = 0;
let supportedFormulaCandidates = 0;
const unsupportedFormulaExamples = new Map<string, number>();

for (const file of files) {
  const xml = await readFile(file, "utf8");
  for (const match of xml.matchAll(/<([A-Za-z_][\w:.-]*)\b[^>]*\bC6DAT\s*=\s*(["'])(.*?)\2[^>]*>/gs)) {
    occurrences += 1;
    const tag = match[1]!.toUpperCase();
    const encoded = decodeXml(match[3]!);
    try {
      const decoded = inflateSync(Buffer.from(encoded.replaceAll(/\s/g, ""), "base64"));
      inspectFormulaCandidates(decodeCorpusText(decoded));
      const digest = createHash("sha256").update(decoded).digest("hex");
      const entry = records.get(digest) ?? describe(decoded, true);
      entry.count += 1;
      entry.tags.add(tag);
      records.set(digest, entry);
    } catch {
      failed += 1;
      const bytes = Buffer.from(encoded.replaceAll(/\s/g, ""), "base64");
      const digest = createHash("sha256").update(bytes).digest("hex");
      const entry = records.get(digest) ?? describe(bytes, false);
      entry.count += 1;
      entry.tags.add(tag);
      records.set(digest, entry);
    }
  }
}

const unique = [...records.entries()];
console.log(JSON.stringify({
  root,
  files: files.length,
  occurrences,
  uniquePayloads: unique.length,
  inflateFailures: failed,
  decodedTextLike: unique.filter(([, value]) => value.decoded && value.printableRatio >= 0.8).length,
  decodedBinaryLike: unique.filter(([, value]) => value.decoded && value.printableRatio < 0.8).length,
  formulaCandidates,
  supportedFormulaCandidates,
  formulaSyntaxCoverage: formulaCandidates ? Number((supportedFormulaCandidates / formulaCandidates).toFixed(4)) : null,
  unsupportedFormulaExamples: [...unsupportedFormulaExamples.entries()]
    .sort((left, right) => right[1] - left[1]).slice(0, 20)
    .map(([expression, count]) => ({ count, expression })),
  largest: unique.sort(([, left], [, right]) => right.bytes - left.bytes).slice(0, 20).map(([sha256, value]) => ({
    sha256, ...value, tags: [...value.tags].sort(),
  })),
}, null, 2));

function inspectFormulaCandidates(payload: string): void {
  for (const assignment of splitTopLevel(payload)) {
    const equals = assignment.indexOf("=");
    if (equals <= 0) continue;
    const name = assignment.slice(0, equals).trim().replace(/^"|"$/g, "");
    if (!/^[A-Za-zČĆŽŠĐčćžšđ_][A-Za-zČĆŽŠĐčćžšđ0-9_.]*$/.test(name)) continue;
    const expression = assignment.slice(equals + 1).trim().replace(/^"|"$/g, "");
    const supported = isCorpusExpressionSyntaxSupported(expression);
    if (!supported && !/\b[A-Za-zČĆŽŠĐčćžšđ_][A-Za-zČĆŽŠĐčćžšđ0-9_.]*\s*\(|[<>]|\b(?:AND|OR|NOT)\b/i.test(expression)) continue;
    formulaCandidates += 1;
    if (supported) supportedFormulaCandidates += 1;
    else unsupportedFormulaExamples.set(expression.slice(0, 240), (unsupportedFormulaExamples.get(expression.slice(0, 240)) ?? 0) + 1);
  }
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
      parts.push(payload.slice(start, index).trim().replace(/^"|"$/g, ""));
      start = index + 1;
    }
  }
  parts.push(payload.slice(start).trim().replace(/^"|"$/g, ""));
  return parts;
}

function describe(buffer: Buffer, decoded: boolean) {
  const printable = [...buffer].filter((byte) => byte === 9 || byte === 10 || byte === 13 || (byte >= 32 && byte <= 126)).length;
  const text = buffer.toString("utf8").replaceAll(/[\u0000-\u001f\u007f-\u009f]+/g, " ").replaceAll(/\s+/g, " ").trim();
  return {
    count: 0,
    decoded,
    bytes: buffer.length,
    printableRatio: buffer.length ? Number((printable / buffer.length).toFixed(3)) : 1,
    preview: text.slice(0, 180),
    tags: new Set<string>(),
  };
}

function decodeXml(value: string): string {
  return value
    .replaceAll(/&#x([0-9a-f]+);/gi, (_match, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replaceAll(/&#(\d+);/g, (_match, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replaceAll("&quot;", "\"").replaceAll("&apos;", "'").replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&amp;", "&");
}

async function findS3dFiles(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await findS3dFiles(fullPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".s3d")) result.push(fullPath);
  }
  return result;
}
