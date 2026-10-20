import assert from "node:assert/strict";
import test from "node:test";
import { corpusRasterOperationsToHoles, createCorpusLinearHolePattern, createCorpusRectangularHolePattern, mirrorCorpusHole, oppositeCorpusHoleFace } from "../lib/corpus-machining.ts";
import { simulateCorpusCmk } from "../lib/corpus-cmk-simulation.ts";
import { parseCorpusCmk } from "../lib/corpus-cmk.ts";
import { evaluateCorpusFormula } from "../lib/corpus-geometry.ts";
import type { CorpusS3dHole } from "../lib/corpus-s3d.ts";

const hole: CorpusS3dHole = {
  groupType: "GRUPA14", name: "Tipla", xExpression: "B/2", yExpression: "32",
  diameter: 8, depth: 12, plane: 1, angle: 90, machiningMode: 4, machining: { MILTOOL: "103" },
};

test("gradi linearnu seriju po X osi kao obične Corpus izraze", () => {
  const result = createCorpusLinearHolePattern(hole, 3, 32, "x");
  assert.deepEqual(result.map(({ xExpression }) => xExpression), ["B/2", "(B/2)+32", "(B/2)+64"]);
  assert.deepEqual(result.map(({ yExpression }) => yExpression), ["32", "32", "32"]);
  assert.deepEqual(result.map(({ name }) => name), ["Tipla 1", "Tipla 2", "Tipla 3"]);
  assert.notEqual(result[0]!.machining, hole.machining);
});

test("podržava negativan smjer po Y osi i ograničava neispravne serije", () => {
  const result = createCorpusLinearHolePattern(hole, 2, -37, "y");
  assert.deepEqual(result.map(({ yExpression }) => yExpression), ["32", "(32)-37"]);
  assert.throws(() => createCorpusLinearHolePattern(hole, 0, 32, "x"), /između 1 i 500/);
  assert.throws(() => createCorpusLinearHolePattern(hole, 3, 0, "x"), /različit od nule/);
});

test("gradi pravougaonu mrežu u stabilnom red-kolona redoslijedu", () => {
  const result = createCorpusRectangularHolePattern(hole, 3, 2, 32, 37);
  assert.deepEqual(result.map(({ xExpression, yExpression }) => [xExpression, yExpression]), [
    ["B/2", "32"], ["(B/2)+32", "32"], ["(B/2)+64", "32"],
    ["B/2", "(32)+37"], ["(B/2)+32", "(32)+37"], ["(B/2)+64", "(32)+37"],
  ]);
  assert.deepEqual(result.map(({ name }) => name), ["Tipla R1 K1", "Tipla R1 K2", "Tipla R1 K3", "Tipla R2 K1", "Tipla R2 K2", "Tipla R2 K3"]);
});

test("ograničava veličinu i obavezne razmake mreže", () => {
  assert.throws(() => createCorpusRectangularHolePattern(hole, 2, 2, 0, 32), /X razmak/);
  assert.throws(() => createCorpusRectangularHolePattern(hole, 2, 2, 32, 0), /Y razmak/);
  assert.throws(() => createCorpusRectangularHolePattern(hole, 25, 21, 32, 32), /najviše 500/);
  assert.equal(createCorpusRectangularHolePattern(hole, 1, 1, 0, 0)[0]!.name, "Tipla");
});

test("ogleda rupu prema suprotnoj B ili L ivici standardnim Corpus izrazom", () => {
  const xMirror = mirrorCorpusHole({ ...hole, xExpression: "32" }, "x");
  const yMirror = mirrorCorpusHole(hole, "y");
  assert.equal(xMirror.xExpression, "B-(32)");
  assert.equal(evaluateCorpusFormula(xMirror.xExpression, { B: 720, L: 560 }), 688);
  assert.equal(yMirror.yExpression, "L-(32)");
  assert.equal(evaluateCorpusFormula(yMirror.yExpression, { B: 720, L: 560 }), 528);
  assert.notEqual(yMirror.machining, hole.machining);
});

test("kopira rupu između dokazanih suprotnih RPL 0 i RPL 1 ploha", () => {
  const opposite = oppositeCorpusHoleFace(hole);
  assert.equal(opposite.plane, 0);
  assert.equal(opposite.xExpression, hole.xExpression);
  assert.equal(opposite.yExpression, hole.yExpression);
  assert.notEqual(opposite.machining, hole.machining);
  assert.equal(oppositeCorpusHoleFace({ ...hole, plane: 0 }).plane, 1);
  assert.throws(() => oppositeCorpusHoleFace({ ...hole, plane: 2 }), /Samo RPL 0 i RPL 1/);
});

test("pretvara samo potpuno razriješeni jednoručni CMK RASTER u Corpus rupu", () => {
  const simulation = simulateCorpusCmk(parseCorpusCmk(`[RASTER1]\nGB=1\nGN=TIPLA\nGD=12\nGF=8\nGX=32\nGY=64\nGS=1\nGK=90\nGP=0\nGR=32`));
  const result = corpusRasterOperationsToHoles(simulation.operations);
  assert.equal(result.rejected.length, 0);
  assert.deepEqual(result.holes[0], {
    groupType: "GRUPA14", name: "TIPLA · RASTER1", xExpression: "32", yExpression: "64",
    diameter: 8, depth: 12, plane: 1, angle: 90, machiningMode: null, machining: {},
  });
});

test("širi višestruki RASTER po Y za GP 0 i po X za GP 1", () => {
  const simulation = simulateCorpusCmk(parseCorpusCmk(`[RASTER1]\nGB=3\nGN=Y NIZ\nGD=10\nGF=5\nGX=50\nGY=64\nGS=1\nGK=0\nGP=0\nGR=32\n[RASTER2]\nGB=2\nGN=X NIZ\nGD=10\nGF=5\nGX=10\nGY=20\nGS=1\nGK=90\nGP=1\nGR=-5`));
  const result = corpusRasterOperationsToHoles(simulation.operations);
  assert.equal(result.rejected.length, 0);
  assert.deepEqual(result.holes.map(({ xExpression, yExpression }) => [xExpression, yExpression]), [["50", "64"], ["50", "96"], ["50", "128"], ["10", "20"], ["5", "20"]]);
});

test("odbija neriješen i nedokazani GP režim", () => {
  const simulation = simulateCorpusCmk(parseCorpusCmk(`[RASTER1]\nGB=4\nGN=TIPLA\nGD=10\nGF=5\nGX=50\nGY=64\nGS=1\nGK=0\nGP=2\nGR=32\n[RASTER2]\nGB=1\nGN=TIPLA\nGD=10\nGF=5\nGX=OBJ1.X\nGY=64\nGS=1`));
  const result = corpusRasterOperationsToHoles(simulation.operations);
  assert.equal(result.holes.length, 0);
  assert.match(result.rejected[0]!.reason, /GP=2/);
  assert.match(result.rejected[1]!.reason, /neriješena polja: GX/);
});
