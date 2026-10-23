import assert from "node:assert/strict";
import test from "node:test";
import { resolveCorpusMainFaceHoles } from "../lib/corpus-hole-geometry.ts";
import type { CorpusS3dBoard, CorpusS3dHole } from "../lib/corpus-s3d.ts";

const hole = (overrides: Partial<CorpusS3dHole> = {}): CorpusS3dHole => ({
  groupType: "GRUPA14", name: "Rupa", xExpression: "B/2", yExpression: "L/2",
  diameter: 8, depth: 12, plane: 1, angle: 90, machiningMode: null, machining: {}, ...overrides,
});

const board = (holes: CorpusS3dHole[]): CorpusS3dBoard => ({
  name: "Polica", boardType: null, frontType: null, height: 560, width: 400, thickness: 18, direction: 2,
  position: [0, 0, 0], angle: 0, xAngle: 0, zAngle: 0, materialUid: "", materialName: "",
  color: null, transparent: false, visible: true, curveData: null, curvePoints: [],
  curveIsApproximate: false, holeCount: holes.length, holes, consumables: [], unknownChildTags: [],
});

test("razlikuje slijepo i kroz-bušenje na dokazanoj glavnoj plohi", () => {
  const result = resolveCorpusMainFaceHoles(board([hole(), hole({ name: "Kroz", depth: 18 })]));
  assert.deepEqual(result.map(({ kind, depth, side }) => ({ kind, depth, side })), [
    { kind: "blind", depth: 12, side: "max" }, { kind: "through", depth: 18, side: "max" },
  ]);
});

test("RPL 0 ulazi sa suprotne glavne strane, a RPL 1 sa gornje", () => {
  const result = resolveCorpusMainFaceHoles(board([hole({ plane: 0 }), hole({ plane: 1 })]));
  assert.deepEqual(result.map(({ side }) => side), ["min", "max"]);
});

test("računa Corpus formule i ograničava preduboko bušenje na debljinu", () => {
  const [result] = resolveCorpusMainFaceHoles(board([hole({ xExpression: "B-32", yExpression: "L/2", depth: 40 })]));
  assert.equal(result?.u, 528);
  assert.equal(result?.v, 200);
  assert.equal(result?.depth, 18);
  assert.equal(result?.kind, "through");
});

test("ne izmišlja geometriju za druge ravni, nevažeće mjere ili rupu izvan ploče", () => {
  const result = resolveCorpusMainFaceHoles(board([
    hole({ plane: 2 }), hole({ diameter: null }), hole({ depth: 0 }), hole({ xExpression: "B+10" }),
  ]));
  assert.deepEqual(result, []);
});
