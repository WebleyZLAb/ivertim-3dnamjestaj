import assert from "node:assert/strict";
import test from "node:test";
import { corpusPlanViewShapes, isPlanViewPlane, readCorpusPlanes } from "../lib/corpus-planes.ts";

const bytes = (...parts: (number | number[] | string)[]) => parts.flatMap((part) => typeof part === "string" ? [...part].map((char) => char.charCodeAt(0)) : Array.isArray(part) ? part : [part]);
const single = (value: number) => [...new Uint8Array(new Float32Array([value]).buffer)];
const vector = (key: string, x: number, y: number, z: number) => bytes(6, key.length, key, single(x), single(y), single(z), 0);
const ident = (name: string) => bytes(7, name.length, name);
const point = (x: number, z: number) => bytes(ident("TShapePathPoint"), 1, 2, 1, 6, 2, "UQ", 4, 1, 6, 5, "pkind", 2, 1, vector("pos", x, 0, z));
const plane = (dir: [number, number, number], up: [number, number, number], shapes: number[]) => bytes(ident("TBP"), 1, 2, 0, vector("dir", ...dir), vector("up", ...up), shapes);
const toXml = (data: number[]) => `<PROJECTFILE><PLANES>${data.map((value) => value.toString(16).padStart(2, "0")).join("")}</PLANES></PROJECTFILE>`;

const wall = plane([0, -1, 0], [1, 0, 0], bytes(ident("TShapeSquare"), 1, point(-10, -10), point(10, -10), point(10, 10), point(-10, 10)));
const plan = plane([0, 0, 1], [0, 1, 0], bytes(
  ident("TShapeSquare"), 1, point(-2515, -2500), point(2515, -2500), point(2515, 2500), point(-2515, 2500),
  ident("TShapePolyline"), 1, point(0, 0), point(1850, 0), point(1850, 600),
));

test("ravnine: smjer i gornji vektor, tlocrt je ravnina sa smjerom (0,0,1)", () => {
  const planes = readCorpusPlanes(toXml([...wall, ...plan]));
  assert.equal(planes.length, 2);
  assert.deepEqual(planes.map((item) => item.dir), [[0, -1, 0], [0, 0, 1]]);
  assert.deepEqual(planes.map((item) => item.up), [[1, 0, 0], [0, 1, 0]]);
  assert.deepEqual(planes.map(isPlanViewPlane), [false, true]);
  assert.deepEqual(planes[1]!.shapes.map((item) => [item.kind, item.points.length]), [["TShapeSquare", 4], ["TShapePolyline", 3]]);
  assert.deepEqual(planes[1]!.shapes[0]!.points[0], [-2515, 0, -2500]);
});

test("oblici tlocrta se daju kao centrirani (x, z) parovi, bez oblika elevacija", () => {
  const shapes = corpusPlanViewShapes(toXml([...wall, ...plan]));
  assert.deepEqual(shapes.map((item) => item.kind), ["TShapeSquare", "TShapePolyline"]);
  assert.deepEqual(shapes[0]!.points, [[-2515, -2500], [2515, -2500], [2515, 2500], [-2515, 2500]]);
  assert.deepEqual(shapes[1]!.points, [[0, 0], [1850, 0], [1850, 600]]);
});

test("projekat bez PLANES ili s neispravnim sadržajem ne baca grešku", () => {
  assert.deepEqual(readCorpusPlanes("<PROJECTFILE/>"), []);
  assert.deepEqual(readCorpusPlanes("<PLANES>0707zz</PLANES>"), []);
  assert.deepEqual(corpusPlanViewShapes("<PLANES>0102030405</PLANES>"), []);
});
