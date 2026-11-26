import { generateCorpusElementE3d, type CorpusElementSpec } from "./corpus-element-generator.ts";
import { parseCorpusE3d, type CorpusS3dElement } from "./corpus-s3d.ts";
import { writeCorpusE3dGeometryCopy } from "./corpus-s3d-writer.ts";

/**
 * Umetanje → Cokla i Radna ploha (lekcija 2/7, koraci 14–21). Pravila su izvedena iz dva stvarna projekta
 * (Kuhinja_1, Tijana_kuhinja) i provjerena poređenjem dasaka sa Corpusovim elementima.
 *
 * Lokalni koordinatni sistem elementa s uglom θ: osa širine u = (cos θ, −sin θ) i osa dubine v = (−sin θ, −cos θ)
 * u Corpus X/Z ravni; položaj elementa je njegova prednja ivica, a tijelo se pruža duž v. Za svaki element je
 * a = P·u (položaj duž zida) i b = P·v (udaljenost od zida; manji b je više prema prostoriji).
 * Niz je skup susjednih donjih elemenata istog ugla i istog b.
 * - Radna ploha: po jedna po nizu; a početka niza, širina niza, Y = vrh elemenata, b = prednji b − prepust (37),
 *   dubina 600, debljina 38 (ugao isti kao elemenata).
 * - Cokla: po nizu elemenata kojima noge nisu vidljive (`VIDLJIVOST_NOGICA=0`), visine `VISINA_NOGICA − 5`,
 *   debljine 18, daska iza prednje ivice (b = prednji b + debljina).
 * Podržani su uglovi 0°, 90°, 180° i 270°; elementi pod drugim uglovima se preskaču. Nizovi pod suprotnim uglovima
 * na istom zidu se ne spajaju, nema spojeva na uglovima, a `RPTIP` se ne postavlja. Postojeća cokla ili ploha (isti
 * naziv, ugao i Y, preklapanje bar pola širine) se prepoznaje i umetak se preskače.
 */

export type BaseRun = {
  /** Ugao niza u stepenima (0, 90, 180 ili 270). */
  angle: number;
  /** Početak niza duž zida (P·u prvog elementa). */
  a: number;
  width: number;
  /** Prednji b (najmanji P·v elemenata niza). */
  front: number;
  top: number;
  depth: number;
  elements: CorpusS3dElement[];
};

export type KitchenInsert = { spec: CorpusElementSpec; position: [number, number, number]; angle: number };

const SPECIAL_NAME = /^(cokla|radna[_ ]?ploha|z\.?o\.?|zidna[_ ]?letvica|zidna[_ ]?lajsna)$/i;
const num = (value: number | null | undefined) => typeof value === "number" && Number.isFinite(value) ? value : null;
const RAD = Math.PI / 180;

/** Ugao u [0, 360) ili null kad nije umnožak 90°. */
function rightAngle(angle: number | null): number | null {
  const normalized = (((angle ?? 0) % 360) + 360) % 360;
  const rounded = Math.round(normalized / 90) * 90;
  return Math.abs(normalized - rounded) < 0.5 ? rounded % 360 : null;
}

const axes = (angle: number) => {
  const sin = Math.round(Math.sin(angle * RAD) * 1e9) / 1e9, cos = Math.round(Math.cos(angle * RAD) * 1e9) / 1e9;
  return { u: [cos, -sin] as const, v: [-sin, -cos] as const };
};
const coordinates = (x: number, z: number, angle: number) => { const { u, v } = axes(angle); return { a: x * u[0] + z * u[1], b: x * v[0] + z * v[1] }; };
const worldPosition = (a: number, b: number, angle: number): [number, number] => { const { u, v } = axes(angle); return [a * u[0] + b * v[0], a * u[1] + b * v[1]]; };

/** Je li element donji element: na podu, pod pravim uglom, dovoljno visok i plitak, i nije već cokla/ploha/obloga. */
export function isBaseCabinet(element: CorpusS3dElement): boolean {
  if (element.visible === false || SPECIAL_NAME.test(element.name.trim())) return false;
  const [x, y, z] = element.position.map(num);
  const [width, height, depth] = [num(element.width), num(element.height), num(element.depth)];
  if (x === null || y === null || z === null || width === null || height === null || depth === null) return false;
  if (rightAngle(num(element.angle)) === null) return false;
  return Math.abs(y) < 1 && height >= 600 && height <= 1000 && depth > 0 && depth <= 700 && width > 0 && element.variables["RPTIP"] === undefined;
}

/** Nizovi susjednih donjih elemenata istog ugla i istog b (razmak do 5 mm), poredani duž zida. */
export function findBaseRuns(elements: readonly CorpusS3dElement[], tolerance = 5): BaseRun[] {
  const items = elements.filter(isBaseCabinet).map((element) => {
    const angle = rightAngle(num(element.angle))!;
    return { element, angle, ...coordinates(element.position[0]!, element.position[2]!, angle) };
  }).sort((p, q) => p.angle - q.angle || p.b - q.b);
  // Prvo grupe po uglu i b (razlika do `tolerance`), pa unutar grupe po položaju duž zida.
  const clusters: (typeof items)[] = [];
  for (const item of items) {
    const cluster = clusters.at(-1);
    if (cluster && cluster[0]!.angle === item.angle && Math.abs(cluster[0]!.b - item.b) <= tolerance) cluster.push(item); else clusters.push([item]);
  }
  const runs: BaseRun[] = [];
  for (const cluster of clusters) {
    cluster.sort((p, q) => p.a - q.a);
    let run: BaseRun | null = null;
    for (const item of cluster) {
      if (run && item.a <= run.a + run.width + tolerance) {
        run.width = Math.max(run.a + run.width, item.a + item.element.width!) - run.a;
        run.front = Math.min(run.front, item.b);
        run.top = Math.max(run.top, item.element.height!);
        run.depth = Math.max(run.depth, item.element.depth!);
        run.elements.push(item.element);
      } else {
        run = { angle: item.angle, a: item.a, width: item.element.width!, front: item.b, top: item.element.height!, depth: item.element.depth!, elements: [item.element] };
        runs.push(run);
      }
    }
  }
  return runs;
}

const firstBoardMaterial = (elements: readonly CorpusS3dElement[]) => {
  for (const element of elements) for (const board of element.boards) if (board.materialUid || board.materialName) return { name: board.materialName || "Materijal", uid: board.materialUid, color: board.color ?? 0xe0e0e0 };
  return { name: "Materijal", uid: "", color: 0xe0e0e0 };
};

const at = (run: Pick<BaseRun, "angle">, a: number, y: number, b: number): [number, number, number] => { const [x, z] = worldPosition(a, b, run.angle); return [Math.round(x * 1000) / 1000, y, Math.round(z * 1000) / 1000]; };

export type WorktopOptions = { thickness?: number; overhang?: number; depth?: number };

/** Jedna radna ploha po nizu donjih elemenata. */
export function worktopInserts(runs: readonly BaseRun[], options: WorktopOptions = {}): KitchenInsert[] {
  const thickness = options.thickness ?? 38, overhang = options.overhang ?? 37, depth = options.depth ?? 600;
  return runs.map((run) => {
    const material = firstBoardMaterial(run.elements);
    return {
      spec: { name: "Radna_Ploha", code: "", className: "TElement", width: Math.round(run.width * 1000) / 1000, height: thickness, depth, starterDirection: 2, starterBoardName: "Radna ploha", thickness, materialName: material.name, materialUid: material.uid, color: material.color },
      position: at(run, run.a, run.top, run.front - overhang),
      angle: run.angle,
    };
  });
}

/**
 * Cokle po nizovima elemenata s nevidljivim nogicama; niz se prekida na elementu s vidljivim nogicama.
 * Visina je `VISINA_NOGICA − 5` (npr. 100 → 95), debljina 18.
 */
export function plinthInserts(runs: readonly BaseRun[], options: { thickness?: number; clearance?: number } = {}): KitchenInsert[] {
  const thickness = options.thickness ?? 18, clearance = options.clearance ?? 5;
  const inserts: KitchenInsert[] = [];
  for (const run of runs) {
    let group: CorpusS3dElement[] = [];
    const flush = () => {
      if (group.length === 0) return;
      const starts = group.map((element) => coordinates(element.position[0]!, element.position[2]!, run.angle));
      const a = Math.min(...starts.map((item) => item.a));
      const end = Math.max(...group.map((element, index) => starts[index]!.a + element.width!));
      const front = Math.min(...starts.map((item) => item.b));
      const legs = Math.min(...group.map((element) => Number(element.variables["VISINA_NOGICA"]) || 100));
      const material = firstBoardMaterial(group);
      inserts.push({
        spec: { name: "Cokla", code: "", className: "TElement", width: Math.round((end - a) * 1000) / 1000, height: Math.max(10, legs - clearance), depth: thickness, starterDirection: 1, starterBoardName: "Cokla", thickness, materialName: material.name, materialUid: material.uid, color: material.color },
        // Kao u Corpusu: daska cokle leži iza prednje ivice (b prednje + debljina).
        position: at(run, a, 0, front + thickness),
        angle: run.angle,
      });
      group = [];
    };
    for (const element of run.elements) {
      const hidden = element.variables["VIDLJIVOST_NOGICA"] === "0" || element.variables["VIDLJIVOST_NOGICA"] === undefined && element.variables["VISINA_NOGICA"] !== undefined;
      if (hidden) group.push(element); else flush();
    }
    flush();
  }
  return inserts;
}

/** Pravi E3D izvor za umetak: generiše element i postavlja mu položaj i ugao. */
export function kitchenInsertSource(insert: KitchenInsert): string {
  const generated = generateCorpusElementE3d(insert.spec);
  const base = parseCorpusE3d(generated.sourceXml).elements[0]!;
  return writeCorpusE3dGeometryCopy(generated.sourceXml, [base], [{ ...base, position: insert.position, angle: insert.angle }]);
}

/**
 * Odvaja umetke koji već postoje u projektu: element istog naziva i ugla na istoj visini čija se širina duž zida
 * preklapa bar upola sa širinom umetka. Vraća umetke za dodavanje i broj preskočenih.
 */
export function withoutExisting(inserts: readonly KitchenInsert[], existing: readonly CorpusS3dElement[]): { kept: KitchenInsert[]; skipped: number } {
  const kept: KitchenInsert[] = [];
  let skipped = 0;
  for (const insert of inserts) {
    const own = coordinates(insert.position[0], insert.position[2], insert.angle);
    const width = insert.spec.width;
    const duplicate = existing.some((element) => {
      if (element.visible === false || element.name.trim().toLowerCase().replace(/[_ ]/g, "") !== insert.spec.name.toLowerCase().replace(/[_ ]/g, "")) return false;
      const angle = rightAngle(num(element.angle));
      const [x, y, z] = element.position.map(num);
      if (angle === null || angle !== insert.angle || x === null || y === null || z === null || num(element.width) === null || Math.abs(y - insert.position[1]) > 1) return false;
      const theirs = coordinates(x, z, angle);
      const overlap = Math.min(own.a + width, theirs.a + element.width!) - Math.max(own.a, theirs.a);
      return overlap >= width / 2;
    });
    if (duplicate) skipped += 1; else kept.push(insert);
  }
  return { kept, skipped };
}
