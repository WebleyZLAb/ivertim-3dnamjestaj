import assert from "node:assert/strict";
import test from "node:test";
import { corpusElementClearances, corpusRoomClearances } from "../lib/corpus-clearance.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

function element(attributes: string) {
  return parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ${attributes}/></PROJECTFILE>`).elements[0]!;
}

test("mjeri razmak i preklapanje omotača po sve tri ose", () => {
  const left = element(`ENAME="A" EXPOX="0" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="0"`);
  const right = element(`ENAME="B" EXPOX="700" EYPOS="100" EZPOS="560" ESIRINA="400" EVISINA="500" EDUBINA="300" EKUT="0"`);
  assert.deepEqual(corpusElementClearances(left, right), [
    { axis: "X", status: "gap", distance: 100 },
    { axis: "Y", status: "overlap", distance: -500 },
    { axis: "Z", status: "overlap", distance: -300 },
  ]);
});

test("razlikuje dodir i koristi rotirani svjetski omotač", () => {
  const left = element(`ENAME="A" EXPOX="0" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="0"`);
  const touching = element(`ENAME="B" EXPOX="900" EYPOS="820" EZPOS="560" ESIRINA="400" EVISINA="500" EDUBINA="300" EKUT="90"`);
  assert.deepEqual(corpusElementClearances(left, touching), [
    { axis: "X", status: "touch", distance: 0 },
    { axis: "Y", status: "touch", distance: 0 },
    { axis: "Z", status: "overlap", distance: -400 },
  ]);
});

test("mjeri svih šest udaljenosti elementa do granica prostorije", () => {
  const cabinet = element(`ENAME="A" EXPOX="100" EYPOS="50" EZPOS="700" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="0"`);
  assert.deepEqual(corpusRoomClearances(cabinet, { length: 5, width: 4, height: 1.2, lowerHeight: 1.4 }), [
    { side: "left", status: "inside", distance: 100 },
    { side: "right", status: "inside", distance: 4300 },
    { side: "back", status: "inside", distance: 140 },
    { side: "front", status: "inside", distance: 3300 },
    { side: "floor", status: "inside", distance: 50 },
    { side: "ceiling", status: "inside", distance: 1730 },
  ]);
});

test("označava dodir, izlazak i nepoznatu granicu sobe", () => {
  const cabinet = element(`ENAME="A" EXPOX="-20" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="0"`);
  const values = corpusRoomClearances(cabinet, { length: null, width: 0.5, height: null, lowerHeight: null })!;
  assert.deepEqual(values.find(({ side }) => side === "left"), { side: "left", status: "outside", distance: -20 });
  assert.deepEqual(values.find(({ side }) => side === "floor"), { side: "floor", status: "touch", distance: 0 });
  assert.deepEqual(values.find(({ side }) => side === "front"), { side: "front", status: "outside", distance: -60 });
  assert.deepEqual(values.find(({ side }) => side === "right"), { side: "right", status: "unknown", distance: null });
});
