/**
 * Veza kataloga okova (`Potrosni/*.cxm`) s 3D modelom i njegovim bušenjem. Stavka `PotItem` nosi u polju `DPKSEXTRA`
 * (heksadecimalni Delphi tok) putanju modela (npr. `Blum\320H3500C15_L.wrl`), a bušenje modela je u `.mdrl` fajlu istog
 * imena (`Modeli/Blum/320H3500C15_L.mdrl`, vidi `corpus-mdrl.ts`). Vlastite stavke bez modela (npr. "BAGLAMA RAVNA BLUM" u
 * `IVERTIM_OKOV.cxm`) nemaju putanju: njihovo bušenje dolazi iz makroa.
 */
export type FittingCatalogItem = {
  name: string;
  code: string;
  uid: string;
  /** Putanja modela u odnosu na folder `Modeli` (kosa crta), ili null kad stavka nema model. */
  modelPath: string | null;
};

const MODEL_EXTENSION = /\.(wrl|dae|obj|3ds|step|stp)$/i;

function hexToLatin1(hex: string): string {
  let out = "";
  for (let index = 0; index + 1 < hex.length; index += 2) out += String.fromCharCode(parseInt(hex.slice(index, index + 2), 16));
  return out;
}

/** Putanja modela iz DPKSEXTRA: prvi tekst koji završava poznatim nastavkom modela; obrnute kose crte postaju kose. */
export function fittingModelPath(dpksextraHex: string): string | null {
  if (!dpksextraHex || !/^[0-9a-fA-F]+$/.test(dpksextraHex)) return null;
  const raw = hexToLatin1(dpksextraHex);
  for (const match of raw.matchAll(/[\x20-\x7e]{4,}/g)) {
    const text = match[0];
    if (MODEL_EXTENSION.test(text)) return text.replace(/^[^A-Za-z0-9_]+/, "").replace(/\\/g, "/");
  }
  return null;
}

/** Putanja `.mdrl` uz model (isti naziv, nastavak `.mdrl`). */
export const mdrlPathForModel = (modelPath: string): string => modelPath.replace(/\.[A-Za-z0-9]+$/, ".mdrl");

const decodeXml = (value: string) => value.replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");

/** Stavke kataloga okova iz teksta `.cxm`: naziv, oznaka, UID (`OznId`) i putanja modela. */
export function parseFittingCatalog(xml: string): FittingCatalogItem[] {
  const items: FittingCatalogItem[] = [];
  for (const match of xml.matchAll(/<PotItem ([^>]*)>[\s\S]*?<\/PotItem>/g)) {
    const attributes = match[1]!;
    const attribute = (name: string) => new RegExp(`${name}="([^"]*)"`).exec(attributes)?.[1] ?? "";
    const uid = /OznId="([^"]*)"/.exec(match[0])?.[1] ?? "";
    items.push({ name: decodeXml(attribute("Naziv")), code: decodeXml(attribute("oznakaP")), uid, modelPath: fittingModelPath(attribute("DPKSEXTRA")) });
  }
  return items;
}
