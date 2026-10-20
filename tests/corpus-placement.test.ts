import assert from "node:assert/strict";
import test from "node:test";
import { corpusAdjacentPlacementPosition, corpusAlignedPlacementPosition, corpusContainedRoomPosition, corpusRoomPlacementPosition, corpusSnappedPosition } from "../lib/corpus-placement.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

function element(xmlAttributes: string) {
  return parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ${xmlAttributes}/></PROJECTFILE>`).elements[0]!;
}

test("postavlja nerotiran element uz svih pet granica prostorije", () => {
  const cabinet = element(`ENAME="A" EXPOX="123" EYPOS="45" EZPOS="67" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="0"`);
  const room = { width: 4, length: 5, height: 1.2, lowerHeight: 1.4 };
  assert.deepEqual(corpusRoomPlacementPosition(cabinet, room, "floor"), [123, 0, 67]);
  assert.deepEqual(corpusRoomPlacementPosition(cabinet, room, "left", 10), [10, 45, 67]);
  assert.deepEqual(corpusRoomPlacementPosition(cabinet, room, "right", 10), [4390, 45, 67]);
  assert.deepEqual(corpusRoomPlacementPosition(cabinet, room, "back", 10), [123, 45, 570]);
  assert.deepEqual(corpusRoomPlacementPosition(cabinet, room, "front", 10), [123, 45, 3990]);
});

test("spaja element sa odabranim susjedom bez preklapanja", () => {
  const moving = element(`ENAME="A" EXPOX="100" EYPOS="0" EZPOS="300" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="0"`);
  const target = element(`ENAME="B" EXPOX="1000" EYPOS="50" EZPOS="800" ESIRINA="800" EVISINA="900" EDUBINA="600" EKUT="0"`);
  assert.deepEqual(corpusAdjacentPlacementPosition(moving, target, "left", 5), [395, 50, 300]);
  assert.deepEqual(corpusAdjacentPlacementPosition(moving, target, "right", 5), [1805, 50, 300]);
  assert.deepEqual(corpusAdjacentPlacementPosition(moving, target, "back", 5), [100, 50, 195]);
  assert.deepEqual(corpusAdjacentPlacementPosition(moving, target, "front", 5), [100, 50, 1365]);
});

test("zaokružuje koordinate i postavlja rotirani element uz zidove", () => {
  const rotated = element(`ENAME="A" EXPOX="123" EYPOS="47" EZPOS="68" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="90"`);
  assert.deepEqual(corpusSnappedPosition(rotated, 10), [120, 50, 70]);
  const room = { width: 4, length: 5, height: 1, lowerHeight: 1.5 };
  assert.deepEqual(corpusRoomPlacementPosition(rotated, room, "left"), [560, 47, 68]);
  assert.deepEqual(corpusRoomPlacementPosition(rotated, room, "right"), [5000, 47, 68]);
  assert.deepEqual(corpusRoomPlacementPosition(rotated, room, "back"), [123, 47, 600]);
  assert.deepEqual(corpusRoomPlacementPosition(rotated, room, "front"), [123, 47, 4000]);
});

test("poravnava svjetske ivice i centre dva elementa bez promjene ostalih osa", () => {
  const moving = element(`ENAME="A" EXPOX="100" EYPOS="20" EZPOS="700" ESIRINA="600" EVISINA="800" EDUBINA="400" EKUT="90"`);
  const target = element(`ENAME="B" EXPOX="1000" EYPOS="100" EZPOS="1200" ESIRINA="800" EVISINA="1000" EDUBINA="800" EKUT="0"`);
  assert.deepEqual(corpusAlignedPlacementPosition(moving, target, "left"), [1400, 20, 700]);
  assert.deepEqual(corpusAlignedPlacementPosition(moving, target, "centerX"), [1600, 20, 700]);
  assert.deepEqual(corpusAlignedPlacementPosition(moving, target, "right"), [1800, 20, 700]);
  assert.deepEqual(corpusAlignedPlacementPosition(moving, target, "back"), [100, 20, 1000]);
  assert.deepEqual(corpusAlignedPlacementPosition(moving, target, "centerZ"), [100, 20, 1100]);
  assert.deepEqual(corpusAlignedPlacementPosition(moving, target, "front"), [100, 20, 1200]);
  assert.deepEqual(corpusAlignedPlacementPosition(moving, target, "bottom"), [100, 100, 700]);
  assert.deepEqual(corpusAlignedPlacementPosition(moving, target, "centerY"), [100, 200, 700]);
  assert.deepEqual(corpusAlignedPlacementPosition(moving, target, "top"), [100, 300, 700]);
});

test("vraća cijeli element unutar svih šest granica sobe najmanjim pomakom", () => {
  const room = { width: 4, length: 5, height: 1.2, lowerHeight: 1.4 };
  const outside = element(`ENAME="A" EXPOX="-50" EYPOS="-20" EZPOS="4100" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="0"`);
  assert.deepEqual(corpusContainedRoomPosition(outside, room), [0, 0, 4000]);
  assert.deepEqual(corpusContainedRoomPosition(outside, room, 10), [10, 10, 3990]);

  const alreadyInside = element(`ENAME="B" EXPOX="100" EYPOS="100" EZPOS="1000" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="90"`);
  assert.deepEqual(corpusContainedRoomPosition(alreadyInside, room, 10), [570, 100, 1000]);
});

test("ne pokušava smjestiti element kada soba nije poznata ili je omotač prevelik", () => {
  const cabinet = element(`ENAME="A" EXPOX="0" EYPOS="0" EZPOS="0" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="0"`);
  assert.equal(corpusContainedRoomPosition(cabinet, { width: null, length: 5, height: 2.6, lowerHeight: null }), null);
  assert.equal(corpusContainedRoomPosition(cabinet, { width: 0.5, length: 5, height: 2.6, lowerHeight: null }), null);
  assert.equal(corpusContainedRoomPosition(cabinet, { width: 4, length: 5, height: 2.6, lowerHeight: null }, -1), null);
});
