import { prepareCorpusLibraryDimensions } from "./corpus-library-dimensions.ts";
import { parseCorpusE3d } from "./corpus-s3d.ts";
import { writeCorpusE3dGeometryCopy } from "./corpus-s3d-writer.ts";

/**
 * 2D CAD u tlocrtu (lekcija 1/7, koraci 59–70): linija, polilinija, četverokut i kružnica,
 * pravi ugao i zid na liniji (element Wall iz Elmsav/Wall_installations).
 * Koordinate su Corpus X i Z u milimetrima. Linije se ne upisuju u S3D (Corpus ih čuva u
 * nepoznatom zapisu), nego žive u radnoj sesiji; zidovi postaju obični elementi projekta.
 */

export type CadPoint = readonly [number, number];
export type CadKind = "polyline" | "line" | "rect" | "circle";
export type CadEntity = { id: string; kind: CadKind; points: readonly CadPoint[]; closed: boolean; radius?: number };

export const distance = (a: CadPoint, b: CadPoint) => Math.hypot(b[0] - a[0], b[1] - a[1]);

/** Pravi ugao: točka se pomjera na vodoravnu ili okomitu liniju od prethodne, zavisno od dominantnog smjera. */
export function orthoPoint(from: CadPoint, to: CadPoint): CadPoint {
  return Math.abs(to[0] - from[0]) >= Math.abs(to[1] - from[1]) ? [to[0], from[1]] : [from[0], to[1]];
}

/** Čvrsta mreža: zaokruživanje na zadati korak (mm). */
export function snapPoint(point: CadPoint, step: number): CadPoint {
  return step > 0 ? [Math.round(point[0] / step) * step, Math.round(point[1] / step) * step] : point;
}

export function rectanglePoints(a: CadPoint, b: CadPoint): CadPoint[] {
  return [[a[0], a[1]], [b[0], a[1]], [b[0], b[1]], [a[0], b[1]]];
}

/** Segmenti entiteta (zatvoreni likovi imaju i zadnji segment natrag na početak); kružnica nema segmente. */
export function entitySegments(entity: CadEntity): [CadPoint, CadPoint][] {
  if (entity.kind === "circle") return [];
  const segments: [CadPoint, CadPoint][] = [];
  for (let index = 1; index < entity.points.length; index++) segments.push([entity.points[index - 1]!, entity.points[index]!]);
  if (entity.closed && entity.points.length > 2) segments.push([entity.points.at(-1)!, entity.points[0]!]);
  return segments;
}

export type WallAlign = "center" | "left" | "right";

export type WallPlacement = {
  /** Položaj elementa (EXPOX, EYPOS, EZPOS). */
  position: [number, number, number];
  /** Ugao elementa u stepenima (EKUT). */
  angle: number;
  length: number;
};

/**
 * Položaj i ugao zida duž segmenta a→b. Lokalna X osa elementa ide od a prema b, a dubina (debljina)
 * ide u smjeru (−sin θ, −cos θ) Corpus X/Z ravni (izvedeno iz iste transformacije koju koristi 3D prikaz).
 * `align` određuje na kojoj strani linije leži debljina zida.
 */
export function wallPlacement(a: CadPoint, b: CadPoint, thickness: number, align: WallAlign = "center"): WallPlacement {
  const length = distance(a, b);
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const theta = Math.atan2(-dz, dx);
  const depth: CadPoint = [-Math.sin(theta), -Math.cos(theta)];
  const shift = align === "center" ? -thickness / 2 : align === "left" ? 0 : -thickness;
  const round = (value: number) => Math.round(value * 1000) / 1000;
  return {
    position: [round(a[0] + depth[0] * shift), 0, round(a[1] + depth[1] * shift)],
    angle: round(theta * 180 / Math.PI),
    length: round(length),
  };
}

/**
 * Pravi E3D zida za segment: mijenja dužinu (širinu elementa) uz preračun parametara i postavlja položaj i ugao.
 * `sourceXml` je izvorni Wall.e3d iz biblioteke.
 */
export function wallSourceForSegment(sourceXml: string, a: CadPoint, b: CadPoint, options: { thickness?: number; height?: number; align?: WallAlign } = {}): string {
  const original = parseCorpusE3d(sourceXml).elements[0];
  if (!original) throw new Error("E3D zida nema korijenski element.");
  const thickness = options.thickness ?? original.depth ?? 100;
  const placement = wallPlacement(a, b, thickness, options.align ?? "center");
  if (!(placement.length > 0)) throw new Error("Segment je prekratak za zid.");
  const resized = prepareCorpusLibraryDimensions(sourceXml, { width: placement.length, height: options.height ?? original.height ?? 2600, depth: thickness });
  const base = resized.element;
  return writeCorpusE3dGeometryCopy(resized.sourceXml, [base], [{ ...base, position: placement.position, angle: placement.angle }]);
}

export const CAD_FILE_FORMAT = "ivertim-corpus-cad";
const MAX_ENTITIES = 5000;

/** Zapis CAD linija uz projekat (zaseban JSON, jer Corpus S3D linije ne čuva u poznatom zapisu). */
export function serializeCadEntities(sourceFile: string, entities: readonly CadEntity[], exportedAt = new Date().toISOString()): string {
  return JSON.stringify({ format: CAD_FILE_FORMAT, version: 1, sourceFile, exportedAt, entities }, null, 2);
}

const isPoint = (value: unknown): value is CadPoint => Array.isArray(value) && value.length === 2 && value.every((item) => typeof item === "number" && Number.isFinite(item));

/** Čita i provjerava zapis linija; baca grešku s razlogom kad nešto nije ispravno. */
export function parseCadEntities(text: string, expectedSourceFile?: string): CadEntity[] {
  let value: unknown;
  try { value = JSON.parse(text); } catch { throw new Error("Fajl linija nije ispravan JSON."); }
  const file = value as { format?: unknown; version?: unknown; sourceFile?: unknown; entities?: unknown };
  if (!file || file.format !== CAD_FILE_FORMAT || file.version !== 1 || !Array.isArray(file.entities)) throw new Error("Fajl nije IVERTIM zapis CAD linija podržane verzije.");
  if (expectedSourceFile && typeof file.sourceFile === "string" && file.sourceFile.toLocaleLowerCase() !== expectedSourceFile.toLocaleLowerCase()) throw new Error(`Linije pripadaju projektu ${file.sourceFile}, a otvoren je ${expectedSourceFile}.`);
  if (file.entities.length > MAX_ENTITIES) throw new Error("Previše linija u fajlu.");
  const seen = new Set<string>();
  return file.entities.map((raw, index) => {
    const entity = raw as Partial<CadEntity>;
    if (!entity || !["polyline", "line", "rect", "circle"].includes(entity.kind as string) || !Array.isArray(entity.points) || !entity.points.every(isPoint)) throw new Error(`Linija ${index + 1} nema ispravan oblik.`);
    const kind = entity.kind as CadKind;
    if (kind === "circle" && !(typeof entity.radius === "number" && entity.radius > 0 && entity.points.length === 1)) throw new Error(`Kružnica ${index + 1} nema ispravan radijus.`);
    if (kind !== "circle" && entity.points.length < 2) throw new Error(`Linija ${index + 1} ima manje od dvije točke.`);
    let id = typeof entity.id === "string" && entity.id && !seen.has(entity.id) ? entity.id : `cad-import-${index}`;
    while (seen.has(id)) id += "x";
    seen.add(id);
    return { id, kind, points: entity.points as CadPoint[], closed: entity.closed === true, ...(kind === "circle" ? { radius: entity.radius } : {}) };
  });
}
