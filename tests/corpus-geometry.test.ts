import assert from "node:assert/strict";
import test from "node:test";
import { corpusBoardDimensions, corpusHolePosition, corpusRoomTotalHeight, evaluateCorpusFormula, expandCorpusCurve } from "../lib/corpus-geometry.ts";

test("sabira gornju i donju Corpus visinu prostorije", () => {
  assert.equal(corpusRoomTotalHeight(1.2, 1.4), 2.5999999999999996);
  assert.equal(corpusRoomTotalHeight(0, 2.49), 2.49);
  assert.equal(corpusRoomTotalHeight(null, null), null);
});

test("SMJER 0 postavlja debljinu po X osi za bočnu ploču", () => {
  assert.deepEqual(corpusBoardDimensions(0, 702, 560, 18), [18, 702, 560]);
});

test("SMJER 1 postavlja debljinu po Z osi za leđa i fronte", () => {
  assert.deepEqual(corpusBoardDimensions(1, 716, 396, 3), [396, 716, 3]);
});

test("SMJER 2 postavlja debljinu po Y osi za podove i police", () => {
  assert.deepEqual(corpusBoardDimensions(2, 400, 560, 18), [400, 18, 560]);
});

test("nepoznat smjer ostaje siguran horizontalni prikaz", () => {
  assert.deepEqual(corpusBoardDimensions(null, 400, 560, 18), [400, 18, 560]);
});

test("sigurno računa Corpus formule položaja rupa", () => {
  const variables = { B: 400, L: 560, D: 18 };
  assert.equal(evaluateCorpusFormula("B/2-16", variables), 184);
  assert.equal(evaluateCorpusFormula("(L-D)/2", variables), 271);
  assert.equal(evaluateCorpusFormula("UNKNOWN+1", variables), null);
  assert.equal(evaluateCorpusFormula("B/0", variables), null);
});

test("preslikava rupe na glavnu plohu za sva tri smjera", () => {
  assert.deepEqual(corpusHolePosition(0, 184, 296, 400, 560, 18), [18.6, 184, 296]);
  assert.deepEqual(corpusHolePosition(1, 184, 296, 400, 560, 18), [296, 184, 18.6]);
  assert.deepEqual(corpusHolePosition(2, 184, 296, 400, 560, 18), [184, 18.6, 296]);
  assert.equal(corpusHolePosition(2, 900, 296, 400, 560, 18), null);
});

test("zadržava ravne konture i zaglađuje označene segmente", () => {
  const rectangle = [
    { x: 0, z: 0, style: 0 }, { x: 100, z: 0, style: 0 },
    { x: 100, z: 50, style: 0 }, { x: 0, z: 50, style: 0 },
  ];
  assert.deepEqual(expandCorpusCurve(rectangle), rectangle);

  const rounded = rectangle.map((point) => ({ ...point, style: 2 }));
  const expanded = expandCorpusCurve(rounded, 4);
  assert.equal(expanded.length, 16);
  assert.deepEqual(expanded.filter((_, index) => index % 4 === 0), rounded);
  assert.ok(expanded.every((point) => Number.isFinite(point.x) && Number.isFinite(point.z)));
});

test("rekonstruiše kružni luk iz tetive i Corpus radijusa", () => {
  const circle = [
    { x: 0, z: 30, style: 2, arcRadius: 30, arcSmooth: 1 },
    { x: 30, z: 0, style: 2, arcRadius: 30, arcSmooth: 1 },
    { x: 60, z: 30, style: 2, arcRadius: 30, arcSmooth: 1 },
    { x: 30, z: 60, style: 2, arcRadius: 30, arcSmooth: 1 },
  ];
  const expanded = expandCorpusCurve(circle, 4);
  assert.equal(expanded.length, 16);
  for (const point of expanded) {
    assert.ok(Math.abs(Math.hypot(point.x - 30, point.z - 30) - 30) < 0.001);
  }
});
