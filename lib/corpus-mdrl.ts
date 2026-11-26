/**
 * Bušenje dodijeljeno 3D modelu okova (`Modeli/<proizvođač>/<model>.mdrl`, uz `.wrl`/`.dae`). Fajl je Delphi tok objekata
 * (`C3DMD` → `drll`/`DRLC` → `drlo` grupe → `SDrill` bušenja). Čita se samo ono što je provjereno na uzorcima: grupa ima
 * `nam` (naziv), `ddir` (smjer), `pos` (X, Y, Z kao tri float32), a svako bušenje `sru` (dva float32: prečnik i dubina) i `xyz`
 * (tri float32, položaj u metrima u odnosu na ishodište grupe) te logičke `kon` i `pro`.
 *
 * Jedinice u fajlu su metri; ovdje se vraćaju milimetri.
 */
export type MdrlDrill = { diameter: number; depth: number; x: number; y: number; z: number; kon: boolean; pro: boolean };
export type MdrlGroup = { name: string; direction: number | null; origin: readonly [number, number, number]; drills: MdrlDrill[] };
export type MdrlDocument = { groups: MdrlGroup[]; drillCount: number };

const text = new TextDecoder("latin1");
const ascii = (value: string) => Uint8Array.from(value, (char) => char.charCodeAt(0));

function indexOfBytes(data: Uint8Array, needle: Uint8Array, from: number): number {
  outer: for (let i = from; i <= data.length - needle.length; i += 1) {
    for (let j = 0; j < needle.length; j += 1) if (data[i + j] !== needle[j]) continue outer;
    return i;
  }
  return -1;
}

/** Svojstvo: 06, dužina, naziv. Vraća indeks iza naziva ili -1. */
function property(data: Uint8Array, name: string, from: number, limit: number): number {
  const needle = new Uint8Array([6, name.length, ...ascii(name)]);
  const at = indexOfBytes(data, needle, from);
  return at < 0 || at >= limit ? -1 : at + needle.length;
}

const XYZ_PROPERTY = (): Uint8Array => new Uint8Array([6, 3, ...ascii("xyz")]);

function readFloats(view: DataView, offset: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) => view.getFloat32(offset + index * 4, true));
}

/** Svojstvo `xyz` (06 03 "xyz") objekta XYZ ili TXYZObject: iza naziva slijede tri float32. */
function readXyz(data: Uint8Array, view: DataView, from: number, limit: number): { value: [number, number, number]; end: number } | null {
  const at = indexOfBytes(data, XYZ_PROPERTY(), from);
  if (at < 0 || at + 5 + 12 > limit) return null;
  const start = at + 5;
  const [x, y, z] = readFloats(view, start, 3) as [number, number, number];
  return { value: [x, y, z], end: start + 12 };
}

const mm = (value: number) => Math.round(value * 1000 * 1000) / 1000;

export function readCorpusMdrl(bytes: Uint8Array): MdrlDocument {
  if (bytes.length < 16 || text.decode(bytes.subarray(2, 7)) !== "C3DMD") throw new Error("Nije MDRL fajl (nema C3DMD zaglavlja).");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const groups: MdrlGroup[] = [];
  const groupMark = new Uint8Array([7, 4, ...ascii("drlo")]);
  const drillMark = new Uint8Array([7, 6, ...ascii("SDrill")]);
  const starts: number[] = [];
  for (let at = indexOfBytes(bytes, groupMark, 0); at >= 0; at = indexOfBytes(bytes, groupMark, at + groupMark.length)) starts.push(at);
  starts.forEach((start, index) => {
    const end = starts[index + 1] ?? bytes.length;
    let name = "";
    const nameAt = property(bytes, "nam", start, end);
    if (nameAt >= 0 && bytes[nameAt] === 6) name = text.decode(bytes.subarray(nameAt + 2, nameAt + 2 + bytes[nameAt + 1]!));
    const directionAt = property(bytes, "ddir", start, end);
    const direction = directionAt >= 0 && bytes[directionAt] === 2 ? bytes[directionAt + 1]! : null;
    const posAt = property(bytes, "pos", start, end);
    const origin = (posAt >= 0 ? readXyz(bytes, view, posAt, end)?.value : null) ?? [0, 0, 0];
    const drills: MdrlDrill[] = [];
    for (let at = indexOfBytes(bytes, drillMark, start); at >= 0 && at < end; at = indexOfBytes(bytes, drillMark, at + drillMark.length)) {
      const next = indexOfBytes(bytes, drillMark, at + drillMark.length);
      const limit = next >= 0 && next < end ? next : end;
      const sruAt = property(bytes, "sru", at, limit);
      if (sruAt < 0) continue;
      // sru: 01 (lista) 0F f32 0F f32 02 00 (kraj)
      let cursor = sruAt + 1;
      const singles: number[] = [];
      while (bytes[cursor] === 0x0f && cursor + 5 <= limit) { singles.push(view.getFloat32(cursor + 1, true)); cursor += 5; }
      const xyz = readXyz(bytes, view, cursor, limit);
      if (!xyz || singles.length < 1) continue;
      const flag = (name: string) => { const flagAt = property(bytes, name, cursor, limit); return flagAt >= 0 && bytes[flagAt] === 0x09; };
      drills.push({ diameter: singles[0]!, depth: singles[1] ?? 0, x: mm(xyz.value[0]), y: mm(xyz.value[1]), z: mm(xyz.value[2]), kon: flag("kon"), pro: flag("pro") });
    }
    groups.push({ name, direction, origin: [mm(origin[0]), mm(origin[1]), mm(origin[2])], drills });
  });
  return { groups, drillCount: groups.reduce((sum, group) => sum + group.drills.length, 0) };
}
