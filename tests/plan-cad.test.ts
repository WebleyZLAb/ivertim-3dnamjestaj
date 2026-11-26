import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import test from "node:test";
import { corpusDrawingShape } from "../lib/corpus-drawing.ts";
import { parseCorpusE3d } from "../lib/corpus-s3d.ts";
import { decodeCorpusText } from "../lib/corpus-macro.ts";
import { parseCadEntities, serializeCadEntities, entitySegments, orthoPoint, rectanglePoints, snapPoint, wallPlacement, wallSourceForSegment, type CadEntity, type CadPoint } from "../lib/plan-cad.ts";

test("pravi ugao pomjera točku na dominantnu os", () => {
  assert.deepEqual(orthoPoint([100, 100], [900, 180]), [900, 100]);
  assert.deepEqual(orthoPoint([100, 100], [180, 900]), [100, 900]);
  assert.deepEqual(snapPoint([123, 457], 50), [100, 450]);
  assert.deepEqual(snapPoint([123, 457], 0), [123, 457]);
});

test("segmenti: polilinija otvorena i zatvorena, četverokut, kružnica", () => {
  const poly: CadEntity = { id: "p", kind: "polyline", points: [[0, 0], [1000, 0], [1000, 500]], closed: false };
  assert.equal(entitySegments(poly).length, 2);
  assert.equal(entitySegments({ ...poly, closed: true }).length, 3);
  const rect: CadEntity = { id: "r", kind: "rect", points: rectanglePoints([0, 0], [400, 300]), closed: true };
  assert.deepEqual(entitySegments(rect).map(([a, b]) => Math.hypot(b[0] - a[0], b[1] - a[1])), [400, 300, 400, 300]);
  assert.deepEqual(entitySegments({ id: "c", kind: "circle", points: [[0, 0]], closed: true, radius: 100 }), []);
});

/** Element sa nominalnom kutijom kao Wall: širina = dužina, dubina = debljina. */
const WALL = `<ELEMENTFILE VER="16"><ELEMENT ECLAS="TElement" ENAME="Wall" EKUT="0" EXPOX="0" EYPOS="0" EZPOS="0" EVISINA="2600" EDUBINA="100" ESIRINA="1000" EVISIBLE="true"/></ELEMENTFILE>`;

function footprintOf(a: CadPoint, b: CadPoint, thickness: number, align: "center" | "left" | "right") {
  const placement = wallPlacement(a, b, thickness, align);
  const base = parseCorpusE3d(WALL).elements[0]!;
  const element = { ...base, width: placement.length, depth: thickness, position: placement.position, angle: placement.angle };
  return corpusDrawingShape(element, "top")!.points;
}

/** Udaljenost točke od prave a→b sa predznakom (lijevo je pozitivno za pogled iz X desno, Z gore). */
const side = (p: CadPoint, a: CadPoint, b: CadPoint) => ((b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0])) / Math.hypot(b[0] - a[0], b[1] - a[1]);

test("zid leži na liniji: centar je na liniji, a debljina na izabranoj strani, za sve smjerove", () => {
  for (const [a, b] of [[[0, 0], [2000, 0]], [[0, 0], [0, 1500]], [[500, 500], [1500, 1700]], [[2000, 1000], [500, 300]], [[0, 0], [-900, 900]]] as [CadPoint, CadPoint][]) {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]);
    const center = footprintOf(a, b, 100, "center");
    const offsets = center.map((point) => side(point, a, b));
    assert.ok(offsets.every((value) => Math.abs(Math.abs(value) - 50) < 0.1), `centar ${a}→${b}: ${offsets}`);
    // Početak i kraj zida su na krajevima segmenta (projekcija duž linije pokriva tačno [0, dužina]).
    const along = center.map((point) => ((point[0] - a[0]) * (b[0] - a[0]) + (point[1] - a[1]) * (b[1] - a[1])) / length);
    assert.ok(Math.abs(Math.min(...along)) < 0.1 && Math.abs(Math.max(...along) - length) < 0.1, `dužina ${a}→${b}: ${along}`);
    const left = footprintOf(a, b, 100, "left").map((point) => side(point, a, b));
    const right = footprintOf(a, b, 100, "right").map((point) => side(point, a, b));
    assert.ok(Math.abs(Math.max(...left) - Math.max(...right)) > 99 && (Math.min(...left) >= -0.01 || Math.max(...left) <= 0.01), "lijevo i desno leže sa suprotnih strana linije");
  }
});

const library = new URL("../public/local-corpus/Elmsav/Wall_installations/Wall.e3d", import.meta.url);
test("zid iz prave biblioteke dobija dužinu, položaj i ugao segmenta", { skip: !existsSync(library) }, () => {
  const source = decodeCorpusText(readFileSync(library));
  const xml = wallSourceForSegment(source, [1000, 500], [1000, 3500], { thickness: 120 });
  const wall = parseCorpusE3d(xml).elements[0]!;
  assert.equal(wall.width, 3000);
  assert.equal(wall.depth, 120);
  assert.equal(wall.height, 2600);
  assert.equal(Math.round(wall.angle ?? 0), -90);
  assert.throws(() => wallSourceForSegment(source, [0, 0], [0, 0]), /prekratak|Sve mjere/);
});

test("zapis linija: upis pa čitanje vraća iste oblike, a neispravan sadržaj se odbija", () => {
  const entities: CadEntity[] = [
    { id: "a", kind: "polyline", points: [[0, 0], [1000, 0], [1000, 500]], closed: false },
    { id: "b", kind: "rect", points: rectanglePoints([0, 0], [400, 300]), closed: true },
    { id: "c", kind: "circle", points: [[200, 200]], closed: true, radius: 150 },
  ];
  const text = serializeCadEntities("Kuhinja.S3D", entities, "2026-11-26T00:00:00.000Z");
  assert.deepEqual(parseCadEntities(text, "kuhinja.s3d"), entities);
  assert.throws(() => parseCadEntities(text, "Druga.S3D"), /pripadaju projektu/);
  assert.throws(() => parseCadEntities("nije json"), /JSON/);
  assert.throws(() => parseCadEntities(JSON.stringify({ format: "drugo", version: 1, entities: [] })), /podržane verzije/);
  const bad = (entity: unknown) => JSON.stringify({ format: "ivertim-corpus-cad", version: 1, sourceFile: "x", entities: [entity] });
  assert.throws(() => parseCadEntities(bad({ id: "x", kind: "polyline", points: [[0, 0]], closed: false })), /manje od dvije/);
  assert.throws(() => parseCadEntities(bad({ id: "x", kind: "line", points: [[0, 0], [Number.NaN, 1]], closed: false })), /ispravan oblik/);
  assert.throws(() => parseCadEntities(bad({ id: "x", kind: "circle", points: [[0, 0]], closed: true })), /radijus/);
  const duplicate = JSON.stringify({ format: "ivertim-corpus-cad", version: 1, sourceFile: "x", entities: [entities[0], entities[0]] });
  assert.equal(new Set(parseCadEntities(duplicate).map((entity) => entity.id)).size, 2, "ponovljeni id se razrješava");
});
