import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";

const root = path.resolve(process.argv[2] ?? ".");
const files = await findS3dFiles(root);
const machiningRoots = new Set(["MAK", "MAKLINK", "MILTOOL", "CONMIL", "RAS", "ANG", "LAMSD", "LAMELLO", "PRO", "SVK", "BRR"]);
const tags = new Map<string, { count: number; files: Set<string>; attributes: Map<string, Set<string>>; example: string }>();

for (const file of files) {
  const xml = await readFile(file, "utf8");
  const stack: string[] = [];
  for (const token of scanXmlTags(xml)) {
    if (token.closing) {
      const index = stack.lastIndexOf(token.name);
      if (index >= 0) stack.length = index;
      continue;
    }
    const inMachining = machiningRoots.has(token.name) || stack.some((name) => machiningRoots.has(name));
    if (inMachining) {
      const entry = tags.get(token.name) ?? { count: 0, files: new Set<string>(), attributes: new Map<string, Set<string>>(), example: token.raw };
      entry.count += 1;
      entry.files.add(path.relative(root, file));
      for (const [, name, , value] of token.raw.matchAll(/\s([A-Za-z_][\w:.-]*)\s*=\s*(["'])(.*?)\2/g)) {
        const values = entry.attributes.get(name!.toUpperCase()) ?? new Set<string>();
        if (values.size < 12) values.add(value!);
        entry.attributes.set(name!.toUpperCase(), values);
      }
      tags.set(token.name, entry);
    }
    if (!token.selfClosing) stack.push(token.name);
  }
}

console.log(JSON.stringify({
  root,
  files: files.length,
  tags: Object.fromEntries([...tags.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([name, entry]) => [name, {
    count: entry.count,
    fileCount: entry.files.size,
    files: [...entry.files].slice(0, 8),
    attributes: Object.fromEntries([...entry.attributes.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([key, values]) => [key, [...values].map(summarizeValue)])),
    example: summarizeTag(entry.example),
  }])),
}, null, 2));

function summarizeValue(value: string): string {
  if (value.length <= 120) return value;
  const digest = createHash("sha256").update(value).digest("hex").slice(0, 12);
  return `[duga vrijednost: ${value.length} znakova, sha256:${digest}]`;
}

function summarizeTag(tag: string): string {
  return tag.replace(/(["'])([^"']{121,})\1/g, (_match, quote: string, value: string) => `${quote}${summarizeValue(value)}${quote}`).slice(0, 500);
}

function scanXmlTags(xml: string): Array<{ raw: string; name: string; closing: boolean; selfClosing: boolean }> {
  const result: Array<{ raw: string; name: string; closing: boolean; selfClosing: boolean }> = [];
  for (const match of xml.matchAll(/<\s*(\/?)\s*([A-Za-z_][\w:.-]*)(?:\s+(?:"[^"]*"|'[^']*'|[^>"'])*)?\s*(\/?)>/g)) {
    const raw = match[0];
    if (raw.startsWith("<?") || raw.startsWith("<!")) continue;
    result.push({ raw, name: match[2]!.toUpperCase(), closing: match[1] === "/", selfClosing: match[3] === "/" });
  }
  return result;
}

async function findS3dFiles(directory: string): Promise<string[]> {
  const result: string[] = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) result.push(...await findS3dFiles(fullPath));
    else if (entry.isFile() && entry.name.toLowerCase().endsWith(".s3d")) result.push(fullPath);
  }
  return result.sort((left, right) => left.localeCompare(right));
}
