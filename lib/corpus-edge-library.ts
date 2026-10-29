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
