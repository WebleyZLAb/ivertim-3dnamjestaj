import { XMLParser } from "fast-xml-parser";

/** Generičko stablo FastReport (.fr3) šablona: oznaka, atributi i djeca u izvornom redoslijedu. */
export type Fr3Node = { tag: string; attrs: Record<string, string>; children: Fr3Node[] };

const parser = new XMLParser({
  preserveOrder: true,
  ignoreAttributes: false,
  attributeNamePrefix: "",
  parseAttributeValue: false,
  parseTagValue: false,
  processEntities: true,
  htmlEntities: true,
  trimValues: false,
});

type RawNode = Record<string, unknown>;

function convert(raw: RawNode): Fr3Node | null {
  const tag = Object.keys(raw).find((key) => key !== ":@" && !key.startsWith("#") && !key.startsWith("?"));
  if (!tag) return null;
  const attrs = (raw[":@"] ?? {}) as Record<string, string>;
  const children = (Array.isArray(raw[tag]) ? raw[tag] as RawNode[] : []).map(convert).filter((node): node is Fr3Node => node !== null);
  return { tag, attrs: { ...attrs }, children };
}

export function parseFr3(xml: string): Fr3Node {
  const roots = (parser.parse(xml) as RawNode[]).map(convert).filter((node): node is Fr3Node => node !== null);
  const root = roots.find((node) => node.tag === "TfrxReport");
  if (!root) throw new Error("Datoteka nije FastReport šablon (nedostaje TfrxReport).");
  return root;
}

/** Pretvara heksadecimalni zapis (PropData) u bajtove. */
export function hexBytes(hex: string): Uint8Array {
  const clean = hex.replace(/[^0-9a-fA-F]/g, "");
  const out = new Uint8Array(Math.floor(clean.length / 2));
  for (let index = 0; index < out.length; index++) out[index] = parseInt(clean.slice(index * 2, index * 2 + 2), 16);
  return out;
}
