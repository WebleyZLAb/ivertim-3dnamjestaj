import type { Fr3Node } from "./fr3-parse.ts";

/** Putanja do čvora: indeksi djece počevši od korijena (TfrxReport). Prazna putanja je korijen. */
export type Fr3Path = readonly number[];

export function getNode(root: Fr3Node, path: Fr3Path): Fr3Node | null {
  let node: Fr3Node | undefined = root;
  for (const index of path) { node = node?.children[index]; if (!node) return null; }
  return node ?? null;
}

function replaceAt(root: Fr3Node, path: Fr3Path, change: (node: Fr3Node) => Fr3Node | null): Fr3Node {
  if (path.length === 0) { const next = change(root); if (!next) throw new Error("Korijen se ne može obrisati."); return next; }
  const [head, ...rest] = path as [number, ...number[]];
  const child = root.children[head];
  if (!child) throw new Error("Čvor ne postoji.");
  const next = replaceAt(child, rest, change);
  const children = [...root.children];
  children[head] = next;
  return { ...root, children };
}

/** Postavlja atribute čvora; vrijednost undefined briše atribut. */
export function updateAttrs(root: Fr3Node, path: Fr3Path, patch: Readonly<Record<string, string | undefined>>): Fr3Node {
  return replaceAt(root, path, (node) => {
    const attrs = { ...node.attrs };
    for (const [key, value] of Object.entries(patch)) { if (value === undefined) delete attrs[key]; else attrs[key] = value; }
    return { ...node, attrs };
  });
}

export function addChild(root: Fr3Node, parent: Fr3Path, child: Fr3Node): { root: Fr3Node; path: Fr3Path } {
  const parentNode = getNode(root, parent);
  if (!parentNode) throw new Error("Roditelj ne postoji.");
  const next = replaceAt(root, parent, (node) => ({ ...node, children: [...node.children, child] }));
  return { root: next, path: [...parent, parentNode.children.length] };
}

export function removeNode(root: Fr3Node, path: Fr3Path): Fr3Node {
  if (path.length === 0) throw new Error("Korijen se ne može obrisati.");
  return replaceAt(root, path.slice(0, -1), (node) => ({ ...node, children: node.children.filter((_, index) => index !== path.at(-1)) }));
}

/** Jedinstveno ime objekta u šablonu (FastReport traži jedinstvena imena). */
export function uniqueName(root: Fr3Node, base: string): string {
  const used = new Set<string>();
  const visit = (node: Fr3Node) => { if (node.attrs["Name"]) used.add(node.attrs["Name"]); node.children.forEach(visit); };
  visit(root);
  for (let index = 1; ; index++) if (!used.has(`${base}${index}`)) return `${base}${index}`;
}

const escapeAttribute = (value: string) => value
  .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")
  .replace(/\r/g, "&#13;").replace(/\n/g, "&#10;").replace(/\t/g, "&#9;");

/** Vraća šablon kao .fr3 XML (isti oblik koji čita Corpus: sve vrijednosti su atributi). */
export function serializeFr3(root: Fr3Node): string {
  const write = (node: Fr3Node, depth: number): string => {
    const indent = "  ".repeat(depth);
    const attrs = Object.entries(node.attrs).map(([key, value]) => ` ${key}="${escapeAttribute(value)}"`).join("");
    if (node.children.length === 0) return `${indent}<${node.tag}${attrs}/>\n`;
    return `${indent}<${node.tag}${attrs}>\n${node.children.map((child) => write(child, depth + 1)).join("")}${indent}</${node.tag}>\n`;
  };
  return `<?xml version="1.0" encoding="utf-8" standalone="no"?>\n${write(root, 0)}`;
}

/** CSS #rrggbb u Delphi TColor (BGR) kao tekst. */
export function cssToDelphiColor(css: string): string {
  const match = /^#([0-9a-f]{6})$/i.exec(css.trim());
  if (!match) return "0";
  const value = parseInt(match[1]!, 16);
  const r = (value >> 16) & 255, g = (value >> 8) & 255, b = value & 255;
  return String((b << 16) | (g << 8) | r);
}

/** Delphi TColor u #rrggbb; sistemske boje daju crnu, clNone/nepoznato daje fallback. */
export function delphiToCssHex(value: string | undefined, fallback = "#000000"): string {
  if (value === undefined || value === "") return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed === 536870911 || parsed === 536870912) return fallback;
  if (parsed < 0) return (parsed & 0xff) === 5 ? "#ffffff" : fallback;
  const r = parsed & 255, g = (parsed >> 8) & 255, b = (parsed >> 16) & 255;
  return `#${[r, g, b].map((part) => part.toString(16).padStart(2, "0")).join("")}`;
}

export function newMemo(root: Fr3Node, left: number, top: number): Fr3Node {
  return { tag: "TfrxMemoView", children: [], attrs: { Name: uniqueName(root, "Memo"), Left: String(left), Top: String(top), Width: "120", Height: "20", "Font.Charset": "1", "Font.Color": "0", "Font.Height": "-13", "Font.Name": "Arial", "Font.Style": "0", ParentFont: "False", Text: "Tekst" } };
}

export function newLine(root: Fr3Node, left: number, top: number): Fr3Node {
  return { tag: "TfrxLineView", children: [], attrs: { Name: uniqueName(root, "Line"), Left: String(left), Top: String(top), Width: "120", Height: "0", Color: "0", Diagonal: "True" } };
}
