/**
 * Čitanje CAD oblika iz toka `PLANES` u S3D-u (samo čitanje; ništa se ne upisuje, nije povezano s prikazom).
 *
 * `PLANES` je heksadecimalni Delphi tok. Ravnina je `TBP` sa `dir` i `up` (po tri single vrijednosti odmah iza
 * naziva polja), a oblici su `TShape*` klase s tačkama `TShapePathPoint` čije polje `pos` ima tri single
 * vrijednosti (x, y, z). Provjereno na 9 S3D projekata (Kuhinja_1: sobe 5030 × 5000 × 2745 mm):
 * - ravnina 0 (dir 0,0,1, up 0,1,0) je tlocrt: `TShapeSquare` sa tačkama (±2515, 0, ±2500) je obris poda;
 * - ravnine 1–4 (dir 0,−1,0, up različito) su elevacije zidova: kvadrati (±2515 ili ±2500) × (−1372…1373 = visina 2745);
 * - koordinate su centrirane na sredinu sobe i dane kao (x, 0, z) u ravnini, ne u koordinatama elemenata;
 * - orijentacija ose Z prema koordinatama elemenata i klase oblika za polilinije i zidove nisu potvrđene (nijedan
 *   dostupan projekat nema ručno nacrtanu liniju), pa se oblici ne prikazuju u programu dok se ne dobije uzorak.
 */

export type CorpusPlaneShape = { kind: string; points: [number, number, number][] };
export type CorpusPlane = { index: number; dir: [number, number, number] | null; up: [number, number, number] | null; shapes: CorpusPlaneShape[] };

function hexToBytes(hex: string): Uint8Array {
  const out = new Uint8Array(Math.floor(hex.length / 2));
  for (let index = 0; index < out.length; index++) out[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  return out;
}

const ascii = (bytes: Uint8Array, start: number, length: number) => {
  let text = "";
  for (let index = start; index < start + length; index++) text += String.fromCharCode(bytes[index]!);
  return text;
};

/** Pronalazi `06 <n> <ključ> <3 × single>` nakon `from` unutar `limit` bajtova. */
function readVector(bytes: Uint8Array, key: string, from: number, limit: number): { vector: [number, number, number]; end: number } | null {
  const needle = [6, key.length, ...[...key].map((char) => char.charCodeAt(0))];
  const end = Math.min(bytes.length - needle.length - 12, from + limit);
  outer: for (let index = from; index <= end; index++) {
    for (let offset = 0; offset < needle.length; offset++) if (bytes[index + offset] !== needle[offset]) continue outer;
    const view = new DataView(bytes.buffer, bytes.byteOffset + index + needle.length, 12);
    const vector: [number, number, number] = [view.getFloat32(0, true), view.getFloat32(4, true), view.getFloat32(8, true)];
    if (!vector.every(Number.isFinite)) return null;
    return { vector, end: index + needle.length + 12 };
  }
  return null;
}

export function readCorpusPlanes(sourceXml: string): CorpusPlane[] {
  const hex = /<PLANES>([0-9A-Fa-f]+)<\/PLANES>/.exec(sourceXml)?.[1];
  if (!hex) return [];
  const bytes = hexToBytes(hex);
  const planes: CorpusPlane[] = [];
  let current: CorpusPlane | null = null;
  let shape: CorpusPlaneShape | null = null;
  for (let index = 0; index + 3 < bytes.length; index++) {
    if (bytes[index] !== 7) continue;
    const length = bytes[index + 1]!;
    if (length < 3 || length > 40 || index + 2 + length > bytes.length) continue;
    const name = ascii(bytes, index + 2, length);
    if (!/^T[A-Za-z]+$/.test(name)) continue;
    if (name === "TBP") {
      current = { index: planes.length, dir: null, up: null, shapes: [] };
      planes.push(current);
      shape = null;
      const next = readVector(bytes, "dir", index, 4000);
      if (next) { current.dir = next.vector; const up = readVector(bytes, "up", next.end - 12, 200); if (up) current.up = up.vector; }
    } else if (name === "TShapePathPoint" && current && shape) {
      const point = readVector(bytes, "pos", index, 120);
      if (point) shape.points.push(point.vector);
    } else if (name.startsWith("TShape") && name !== "TShapePathPoint" && current) {
      shape = { kind: name, points: [] };
      current.shapes.push(shape);
    }
  }
  return planes;
}

/** Ravnina tlocrta: smjer (0, 0, 1) i gornji vektor (0, 1, 0) (ravnina 0 u svim pregledanim projektima). */
export function isPlanViewPlane(plane: CorpusPlane): boolean {
  const near = (vector: [number, number, number] | null, expected: [number, number, number]) => vector !== null && vector.every((value, axis) => Math.abs(value - expected[axis]!) < 0.01);
  return near(plane.dir, [0, 0, 1]) && near(plane.up, [0, 1, 0]);
}

/**
 * Oblici tlocrta kao (x, z) parovi, centrirani na sredinu sobe (kako su zapisani). Pretvaranje u koordinate
 * elemenata namjerno nije urađeno dok orijentacija ose Z nije potvrđena na uzorku s ručno nacrtanom linijom.
 */
export function corpusPlanViewShapes(sourceXml: string): { kind: string; points: [number, number][] }[] {
  return readCorpusPlanes(sourceXml).filter(isPlanViewPlane).flatMap((plane) => plane.shapes
    .filter((shape) => shape.points.length >= 2)
    .map((shape) => ({ kind: shape.kind, points: shape.points.map(([x, , z]) => [Math.round(x * 100) / 100, Math.round(z * 100) / 100] as [number, number]) })));
}
