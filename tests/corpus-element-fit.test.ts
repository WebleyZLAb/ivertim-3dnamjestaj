import assert from "node:assert/strict";
import test from "node:test";
import { fitCorpusElementToBoards } from "../lib/corpus-element-fit.ts";
import { generateCorpusElementE3d } from "../lib/corpus-element-generator.ts";
import { parseCorpusE3d } from "../lib/corpus-s3d.ts";

function element() {
  return parseCorpusE3d(generateCorpusElementE3d({ name: "Fit", code: "FIT", width: 900, height: 900, depth: 900, starterDirection: 1, starterBoardName: "Ploča", thickness: 18, materialName: "Bijela", materialUid: "", color: 0xffffff }).sourceXml).elements[0]!;
}

test("prilagođava omotač pločama i čuva njihov svjetski položaj", () => {
  const source = element();
  const moved = { ...source, position: [100, 200, 700] as const, boards: [{ ...source.boards[0]!, position: [50, 30, 40] as const, height: 300, width: 500 }] };
  const fitted = fitCorpusElementToBoards(moved)!;
  assert.deepEqual(fitted.position, [150, 230, 660]);
  assert.deepEqual([fitted.width, fitted.height, fitted.depth], [500, 300, 18]);
  assert.deepEqual(fitted.boards[0]!.position, [0, 0, 0]);
  assert.deepEqual([moved.position[0] + 50, moved.position[1] + 30, moved.position[2] - 40], [fitted.position[0], fitted.position[1], fitted.position[2]]);
});

test("čuva položaj pri rotiranom Corpus pivotu", () => {
  const source = element();
  const moved = { ...source, angle: 90, position: [100, 0, 700] as const, boards: [{ ...source.boards[0]!, position: [50, 0, 40] as const, height: 300, width: 500 }] };
  const fitted = fitCorpusElementToBoards(moved)!;
  assert.deepEqual(fitted.position, [60, 0, 650]);
  assert.deepEqual(fitted.boards[0]!.position, [0, 0, 0]);
});

test("ne nagađa element sa djecom, rotiranu ploču ili nepotpune mjere", () => {
  const source = element();
  assert.equal(fitCorpusElementToBoards({ ...source, children: [source] }), null);
  assert.equal(fitCorpusElementToBoards({ ...source, boards: [{ ...source.boards[0]!, angle: 15 }] }), null);
  assert.equal(fitCorpusElementToBoards({ ...source, boards: [{ ...source.boards[0]!, width: null }] }), null);
});
