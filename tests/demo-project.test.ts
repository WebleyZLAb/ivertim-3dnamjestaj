import assert from "node:assert/strict";
import test from "node:test";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";
import { DEMO_S3D, EMPTY_S3D } from "../src/demo-project.ts";

test("novi prazan projekat ima valjanu prostoriju i nema elemente", () => {
  const project = parseCorpusS3d(EMPTY_S3D);
  assert.equal(project.elements.length, 0);
  assert.deepEqual(project.room, { width: 4, length: 4, height: 1.2, lowerHeight: 1.4 });
});

test("ugrađeni demo ostaje valjan i pokriva 3D ploče i kroz-rupu", () => {
  const project = parseCorpusS3d(DEMO_S3D);
  assert.equal(project.elements.length, 1);
  assert.equal(project.elements[0]?.boards.length, 3);
  assert.equal(project.elements[0]?.boards.every((board) => board.curvePoints.length === 4), true);
  assert.equal(project.elements[0]?.boards.reduce((sum, board) => sum + board.holeCount, 0), 1);
  assert.equal(project.elements[0]?.consumables[0]?.quantity, 4);
  assert.deepEqual(project.elements[0]?.boards[0]?.consumables.map(({ sides }) => sides), [[true, false, false, false], [false, false, true, false]]);
  assert.deepEqual(project.elements[0]?.macroLinks, [{
      object1: 0, object2: -1, corpusFlag: 0, name: "IVERTIM DEMO MAKRO", encodedSections: ["MSFO"],
      encodedPayloads: { MSFO: ["eJxz9vfzc3UOsTUyBgAPjAKt"] },
      secondaryName: "", secondaryEncodedSections: [], secondaryEncodedPayloads: {},
  }]);
});
