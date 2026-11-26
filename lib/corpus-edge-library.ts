import { XMLParser, XMLValidator } from 'fast-xml-parser';
export interface CorpusEdgeRecord {
  source: string; group: string; groupUid: string; thickness: number;
  code: string; name: string; width: number | null; materialUid: string;
  available: boolean; fields: Record<string, string>; groupFields: Record<string, string>;
}
export function parseCorpusEdges(xml: string, source: string): CorpusEdgeRecord[] {
  if (XMLValidator.validate(xml) !== true) throw new Error(`Neispravan XML: ${source}`);
  const root = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '', parseAttributeValue: false }).parse(xml);
  const list = (value: any): any[] => value == null ? [] : Array.isArray(value) ? value : [value];
  const records: CorpusEdgeRecord[] = [];
  for (const item of list(root.Trake?.PotItem)) {
    const thickness = Number(String(item.debljina).replace(',', '.')) / 1000;
    if (![0.5, 1, 2].includes(thickness)) throw new Error(`Nepoznata debljina: ${source}`);
    const groupFields = Object.fromEntries(Object.entries(item).filter(([, v]) => typeof v === 'string')) as Record<string,string>;
    for (const data of list(item.Data)) {
      const width = Number(String(data.Sirina ?? '').replace(',', '.'));
      records.push({ source, group: item.Naziv ?? '', groupUid: item.Dodatno?.OznId ?? '', thickness,
        code: data.Sifra ?? '', name: data.Dobavljac ?? data.Sifra ?? '', width: data.Sirina && Number.isFinite(width) ? width : null,
        materialUid: data.MatName ?? '', available: data.Ima === 'true', fields: { ...data }, groupFields });
    }
  }
  return records;
}

export type CorpusEdgeIndex = ReadonlyMap<string, readonly CorpusEdgeRecord[]>;

/** Indeks zapisa traka po dekoru i debljini trake (u mm), za brzo traženje. */
export function indexCorpusEdges(records: readonly CorpusEdgeRecord[]): CorpusEdgeIndex {
  const index = new Map<string, CorpusEdgeRecord[]>();
  for (const record of records) {
    const key = `${record.materialUid}|${record.thickness}`;
    index.set(key, [...(index.get(key) ?? []), record]);
  }
  return index;
}

/**
 * Zapis trake za dekor i debljinu trake ("1mm"). Ako postoji više širina (22 i 42 mm), bira se najuža koja pokriva
 * dasku (debljina ploče + 2 mm): 18 mm ploča dobija 22 mm traku (`1_K003`), a 38 mm radna ploha 42 mm (`1S_K003`);
 * bez debljine ploče bira se 22 mm. Provjereno na Corpus CSV-ovima.
 */
export function edgeRecordFor(index: CorpusEdgeIndex, decorUid: string, edgeName: string, boardThickness?: number): CorpusEdgeRecord | null {
  const thickness = Number(/^(\d+(?:[.,]\d+)?)/.exec(edgeName)?.[1]?.replace(",", "."));
  const candidates = (index.get(`${decorUid}|${thickness}`) ?? []).filter((record) => record.width !== null);
  if (candidates.length === 0) return index.get(`${decorUid}|${thickness}`)?.[0] ?? null;
  const sorted = [...candidates].sort((a, b) => a.width! - b.width!);
  if (boardThickness === undefined) return sorted.find((record) => record.width === 22) ?? sorted[0]!;
  return sorted.find((record) => record.width! >= boardThickness + 2) ?? sorted.at(-1)!;
}
