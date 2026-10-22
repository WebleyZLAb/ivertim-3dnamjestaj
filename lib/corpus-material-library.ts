export interface CorpusMaterialRecord {
  readonly name: string;
  readonly uid: string;
  readonly pictureFile: string;
  readonly textureSize: readonly [number | null, number | null, number | null];
  readonly materialType: number | null;
  readonly fields: Readonly<Record<string, readonly string[]>>;
  readonly sourceCatalog: string;
  readonly recordIndex: number;
}

export interface CorpusMaterialCatalog {
  readonly sourceCatalog: string;
  readonly version: string;
  readonly declaredCount: number | null;
  readonly order: number | null;
  readonly records: readonly CorpusMaterialRecord[];
  readonly warnings: readonly string[];
}

export interface CorpusMaterialIndex {
  readonly byUid: ReadonlyMap<string, readonly CorpusMaterialRecord[]>;
  readonly byName: ReadonlyMap<string, readonly CorpusMaterialRecord[]>;
}

export type CorpusMaterialMatch =
  | { readonly kind: "uid"; readonly record: CorpusMaterialRecord }
  | { readonly kind: "uid-ambiguous"; readonly candidates: readonly CorpusMaterialRecord[] }
  | { readonly kind: "name"; readonly record: CorpusMaterialRecord }
  | { readonly kind: "name-ambiguous"; readonly candidates: readonly CorpusMaterialRecord[] }
  | { readonly kind: "missing" };

export type CorpusMaterialPicturePath =
  | { readonly ok: true; readonly relativePath: string }
  | { readonly ok: false; readonly reason: string };

export function parseCorpusMaterialCatalog(text: string, sourceCatalog = "MatDat.MXC"): CorpusMaterialCatalog {
  const normalized = text.replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");
  const lines = normalized.split("\n");
  const header = new Map<string, string>();
  const records: CorpusMaterialRecord[] = [];
  const warnings: string[] = [];
  let current: Record<string, string[]> | null = null;

  const finish = () => {
    if (!current) return;
    const recordIndex = records.length;
    const first = (key: string) => current?.[key]?.[0]?.trim() ?? "";
    records.push({
      name: first("NAZIV"), uid: first("MUID"), pictureFile: first("PICFILE"),
      textureSize: [finite(first("TEXX")), finite(first("TEXY")), finite(first("TEXZ"))],
      materialType: finite(first("TIPMAT")), fields: freezeFields(current), sourceCatalog, recordIndex,
    });
    current = null;
  };

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line === "<MAT>") { finish(); current = {}; continue; }
    if (line === "<ENDMAT>") { finish(); continue; }
    if (line.startsWith("<") && line.endsWith(">")) continue;
    const separator = line.indexOf("=");
    if (separator < 1) continue;
    const key = line.slice(0, separator).trim().toUpperCase();
    const value = line.slice(separator + 1);
    if (current) (current[key] ??= []).push(value);
    else if (!header.has(key)) header.set(key, value.trim());
  }
  finish();

  const declaredCount = integer(header.get("MATCOUNT"));
  if (declaredCount !== null && declaredCount !== records.length) {
    warnings.push(`MATCOUNT=${declaredCount}, pronađeno zapisa=${records.length}`);
  }
  for (const record of records) {
    if (!record.uid) warnings.push(`Zapis ${record.recordIndex + 1} nema MUID`);
    if (!record.name) warnings.push(`Zapis ${record.recordIndex + 1} nema NAZIV`);
  }
  return {
    sourceCatalog, version: header.get("VER") ?? "", declaredCount,
    order: integer(header.get("ORDER")), records, warnings,
  };
}

export function createCorpusMaterialIndex(catalogs: readonly CorpusMaterialCatalog[]): CorpusMaterialIndex {
  const byUid = new Map<string, CorpusMaterialRecord[]>();
  const byName = new Map<string, CorpusMaterialRecord[]>();
  for (const catalog of catalogs) for (const record of catalog.records) {
    append(byUid, normalizeIdentity(record.uid), record);
    append(byName, normalizeIdentity(record.name), record);
  }
  return { byUid, byName };
}

export function matchCorpusMaterial(index: CorpusMaterialIndex, uid: string, name: string): CorpusMaterialMatch {
  const uidCandidates = index.byUid.get(normalizeIdentity(uid)) ?? [];
  if (uidCandidates.length === 1) return { kind: "uid", record: uidCandidates[0]! };
  if (uidCandidates.length > 1) return { kind: "uid-ambiguous", candidates: uidCandidates };
  const nameCandidates = index.byName.get(normalizeIdentity(name)) ?? [];
  if (nameCandidates.length === 1) return { kind: "name", record: nameCandidates[0]! };
  if (nameCandidates.length > 1) return { kind: "name-ambiguous", candidates: nameCandidates };
  return { kind: "missing" };
}

export function resolveCorpusMaterialPicturePath(sourceCatalog: string, pictureFile: string): CorpusMaterialPicturePath {
  const source = sourceCatalog.replace(/\\/g, "/");
  const picture = pictureFile.trim().replace(/\\/g, "/");
  if (!picture) return { ok: false, reason: "PICFILE nije naveden" };
  if (/^(?:[a-z]:|\/)/i.test(picture)) return { ok: false, reason: "PICFILE mora biti relativan" };
  if (!/\.(?:jpe?g|png|bmp|gif|webp)$/i.test(picture)) return { ok: false, reason: "Nepodržan format slike" };
  const parts = [...source.split("/").slice(0, -1), ...picture.split("/")];
  const safe: string[] = [];
  for (const part of parts) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (!safe.length) return { ok: false, reason: "PICFILE izlazi iz izabranog korijena" };
      safe.pop();
    } else safe.push(part);
  }
  return safe.length ? { ok: true, relativePath: safe.join("/") } : { ok: false, reason: "Prazna putanja slike" };
}

function append(map: Map<string, CorpusMaterialRecord[]>, key: string, record: CorpusMaterialRecord) {
  if (!key) return;
  const values = map.get(key);
  if (values) values.push(record);
  else map.set(key, [record]);
}

function normalizeIdentity(value: string) { return value.trim().toLocaleUpperCase("en-US"); }
function integer(value: string | undefined): number | null {
  if (value === undefined || !/^-?\d+$/.test(value.trim())) return null;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : null;
}
function finite(value: string): number | null {
  if (!value) return null;
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? parsed : null;
}
function freezeFields(fields: Record<string, string[]>): Readonly<Record<string, readonly string[]>> {
  return Object.fromEntries(Object.entries(fields).map(([key, values]) => [key, [...values]]));
}
