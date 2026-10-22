import assert from "node:assert/strict";
import test from "node:test";
import { corpusAlignedGroupElements, corpusCenteredGroupElements, corpusContainedGroupElements, corpusElementAllowsModeling, corpusElementsWithoutGroup, corpusEvenlyDistributedGroupElements, corpusGroupArrayCopies, corpusGroupAtRoomSideElements, corpusGroupBounds, corpusGroupCopies, corpusGroupGridCopies, corpusGroupRoomClearances, corpusGroupVisibilityElements, corpusIsolatedGroupElements, corpusPositionedGroupElements, corpusRotatedGroupAroundCenterElements, corpusRotatedGroupElements, corpusSnappedGroupElements, corpusSpacedGroupElements, corpusTranslatedElements, corpusVisibleRootElements } from "../lib/corpus-group.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

function elements(xml: string) {
  return parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA SIRINA="4" DUZINA="5" VISINA="2.6"/>${xml}</PROJECTFILE>`).elements;
}

const source = () => elements(`
  <ELEMENT ENAME="A" EXPOX="100" EYPOS="20" EZPOS="200" ESIRINA="600" EVISINA="800" EDUBINA="500" EKUT="0"/>
  <ELEMENT ENAME="B" EXPOX="1000" EYPOS="100" EZPOS="1100" ESIRINA="800" EVISINA="600" EDUBINA="400" EKUT="90"/>
  <ELEMENT ENAME="C" EXPOX="2200" EYPOS="200" EZPOS="300" ESIRINA="500" EVISINA="700" EDUBINA="300" EKUT="0"/>
`);

test("pomjera samo označene korijenske elemente i čuva njihov redoslijed", () => {
  const original = source();
  const moved = corpusTranslatedElements(original, [2, 0], [50, -20, 100])!;
  assert.deepEqual(moved.map((element) => element.position), [[150, 0, 300], [1000, 100, 1100], [2250, 180, 400]]);
  assert.equal(moved[1], original[1]);
  assert.deepEqual(moved.map((element) => element.name), ["A", "B", "C"]);
});

test("postavlja minimalni ugao zajedničkog omotača na tačne koordinate", () => {
  const original = source();
  const positioned = corpusPositionedGroupElements(original, [0, 1], [300, 40, 500])!;
  const bounds = corpusGroupBounds(positioned, [0, 1])!;
  assert.deepEqual([bounds.minX, bounds.minY, bounds.minZ], [300, 40, 500]);
  assert.deepEqual([bounds.width, bounds.height, bounds.depth], [900, 800, 1400]);
  assert.deepEqual(positioned[0]!.position, [300, 40, 1000]);
  assert.deepEqual(positioned[1]!.position, [1200, 120, 1900]);
  assert.equal(positioned[2], original[2]);
  assert.equal(corpusPositionedGroupElements(original, [0, 1], [Number.NaN, 0, 0]), null);
});

test("mjeri zajednički rotirani omotač i udaljenosti grupe do sobe", () => {
  const original = source();
  assert.deepEqual(corpusGroupBounds(original, [0, 1]), {
    minX: 100, maxX: 1000, minY: 20, maxY: 820, minZ: -300, maxZ: 1100,
    width: 900, height: 800, depth: 1400,
  });
  const clearances = corpusGroupRoomClearances(original, [0, 1], { width: 4, length: 5, height: 2.6, lowerHeight: null })!;
  assert.deepEqual(clearances.map(({ side, distance, status }) => [side, distance, status]), [
    ["left", 100, "free"], ["right", 4000, "free"], ["floor", 20, "free"], ["ceiling", 1780, "free"],
    ["back", -300, "outside"], ["front", 2900, "free"],
  ]);
  assert.equal(corpusGroupBounds(original, []), null);
});

test("poravnava rotirani element prema prvom označenom sidru", () => {
  const original = source();
  const left = corpusAlignedGroupElements(original, [0, 1], "left")!;
  assert.equal(left[0], original[0]);
  assert.deepEqual(left[1]!.position, [500, 100, 1100]);
  const centers = corpusAlignedGroupElements(original, [2, 0, 1], "centerY")!;
  assert.deepEqual(centers.map((element) => element.position[1]), [150, 250, 200]);
});

test("rotira cijelu grupu oko prvog označenog Corpus pivota", () => {
  const original = source();
  const rotated = corpusRotatedGroupElements(original, [0, 1], 90)!;
  assert.deepEqual(rotated[0]!.position, [100, 20, 200]);
  assert.equal(rotated[0]!.angle, 90);
  assert.deepEqual(rotated[1]!.position.map((value) => Math.round(value!)), [1000, 100, -700]);
  assert.equal(rotated[1]!.angle, 180);
  assert.equal(rotated[2], original[2]);
  const restored = corpusRotatedGroupElements(rotated, [0, 1], -90)!;
  assert.deepEqual(restored.slice(0, 2).map((element) => element.position.map((value) => Math.round(value!))), original.slice(0, 2).map((element) => element.position));
});

test("rotira grupu oko centra zajedničkog omotača", () => {
  const original = source();
  const before = corpusGroupBounds(original, [0, 1])!;
  const rotated = corpusRotatedGroupAroundCenterElements(original, [0, 1], 90)!;
  const after = corpusGroupBounds(rotated, [0, 1])!;
  assert.ok(Math.abs((before.minX + before.maxX) - (after.minX + after.maxX)) < 0.000001);
  assert.ok(Math.abs((before.minZ + before.maxZ) - (after.minZ + after.maxZ)) < 0.000001);
  assert.ok(Math.abs(before.width - after.depth) < 0.000001);
  assert.ok(Math.abs(before.depth - after.width) < 0.000001);
  assert.deepEqual(rotated.map((element) => element.angle), [90, 180, original[2]!.angle]);
  assert.equal(rotated[2], original[2]);
  assert.equal(corpusRotatedGroupAroundCenterElements(original, [0], 90), null);
});

test("vraća zajednički omotač grupe unutar svih granica sobe", () => {
  const original = source();
  const outside = corpusTranslatedElements(original, [0, 1], [-1200, -300, 3500])!;
  const contained = corpusContainedGroupElements(outside, [0, 1], { width: 4, length: 5, height: 2.6, lowerHeight: null }, 50)!;
  assert.deepEqual(contained[0]!.position.map((value) => Math.round(value!)), [50, 50, 3050]);
  assert.deepEqual(contained[1]!.position.map((value) => Math.round(value!)), [950, 130, 3950]);
  assert.equal(contained[2], original[2]);
});

test("centrira zajednički omotač grupe po sve tri ose prostorije", () => {
  const original = source();
  const room = { width: 4, length: 5, height: 2.6, lowerHeight: null };
  const centeredX = corpusCenteredGroupElements(original, [0, 1], room, "x")!;
  assert.deepEqual(centeredX[0]!.position.map((value) => Math.round(value!)), [2050, 20, 200]);
  assert.deepEqual(centeredX[1]!.position.map((value) => Math.round(value!)), [2950, 100, 1100]);
  const centeredY = corpusCenteredGroupElements(original, [0, 1], room, "y")!;
  assert.deepEqual(centeredY[0]!.position.map((value) => Math.round(value!)), [100, 900, 200]);
  assert.deepEqual(centeredY[1]!.position.map((value) => Math.round(value!)), [1000, 980, 1100]);
  const centeredZ = corpusCenteredGroupElements(original, [0, 1], room, "z")!;
  assert.deepEqual(centeredZ[0]!.position.map((value) => Math.round(value!)), [100, 20, 1800]);
  assert.deepEqual(centeredZ[1]!.position.map((value) => Math.round(value!)), [1000, 100, 2700]);
  assert.equal(corpusCenteredGroupElements(original, [0, 1], { ...room, length: .1 }, "x"), null);
});

test("postavlja zajednički omotač grupe uz svih šest granica prostorije", () => {
  const original = source();
  const room = { width: 4, length: 5, height: 2.6, lowerHeight: null };
  const positions = (side: Parameters<typeof corpusGroupAtRoomSideElements>[3]) => corpusGroupAtRoomSideElements(original, [0, 1], room, side, 50)!.slice(0, 2).map((element) => element.position.map((value) => Math.round(value!)));
  assert.deepEqual(positions("left"), [[50, 20, 200], [950, 100, 1100]]);
  assert.deepEqual(positions("right"), [[4050, 20, 200], [4950, 100, 1100]]);
  assert.deepEqual(positions("floor"), [[100, 50, 200], [1000, 130, 1100]]);
  assert.deepEqual(positions("ceiling"), [[100, 1750, 200], [1000, 1830, 1100]]);
  assert.deepEqual(positions("back"), [[100, 20, 550], [1000, 100, 1450]]);
  assert.deepEqual(positions("front"), [[100, 20, 3050], [1000, 100, 3950]]);
  assert.equal(corpusGroupAtRoomSideElements(original, [0, 1], room, "left", -1), null);
  assert.equal(corpusGroupAtRoomSideElements(original, [0, 1], { ...room, width: .2 }, "front", 0), null);
});

test("postavlja sidro na mrežu jednim zajedničkim pomakom", () => {
  const original = source();
  const moved = corpusTranslatedElements(original, [0, 1], [3, 7, 6])!;
  const snapped = corpusSnappedGroupElements(moved, [0, 1], 10)!;
  assert.deepEqual(snapped[0]!.position, [100, 30, 210]);
  assert.deepEqual(snapped[1]!.position, [1000, 110, 1110]);
  assert.equal(corpusSnappedGroupElements(snapped, [0, 1], 10), snapped);
});

test("pravi nezavisne kopije označene grupe sa zajedničkim pomakom", () => {
  const original = source();
  const copies = corpusGroupCopies(original, [2, 0], [600, 10, -20])!;
  assert.deepEqual(copies.map((element) => element.name), ["C", "A"]);
  assert.deepEqual(copies.map((element) => element.position), [[2800, 210, 280], [700, 30, 180]]);
  assert.notEqual(copies[0], original[2]);
  assert.equal(copies[0]!.boards, original[2]!.boards);
  assert.equal(original.length, 3);
});

test("pravi ograničenu linearnu seriju cijele grupe", () => {
  const original = source();
  const copies = corpusGroupArrayCopies(original, [0, 2], 3, [500, 100, -50])!;
  assert.equal(copies.length, 6);
  assert.deepEqual(copies.map((element) => element.name), ["A", "C", "A", "C", "A", "C"]);
  assert.deepEqual(copies.map((element) => element.position), [
    [600, 120, 150], [2700, 300, 250],
    [1100, 220, 100], [3200, 400, 200],
    [1600, 320, 50], [3700, 500, 150],
  ]);
  assert.equal(corpusGroupArrayCopies(original, [0, 2], 0, [1, 0, 0]), null);
  assert.equal(corpusGroupArrayCopies(original, [0, 2], 51, [1, 0, 0]), null);
});

test("pravi stabilnu 2D mrežu cijele grupe bez ponavljanja početne ćelije", () => {
  const original = source();
  const copies = corpusGroupGridCopies(original, [0, 2], 3, 2, [500, 0, 0], [0, 900, -100])!;
  assert.equal(copies.length, 10);
  assert.deepEqual(copies.map((element) => element.name), ["A", "C", "A", "C", "A", "C", "A", "C", "A", "C"]);
  assert.deepEqual(copies.map((element) => element.position), [
    [600, 20, 200], [2700, 200, 300], [1100, 20, 200], [3200, 200, 300],
    [100, 920, 100], [2200, 1100, 200], [600, 920, 100], [2700, 1100, 200], [1100, 920, 100], [3200, 1100, 200],
  ]);
  assert.equal(corpusGroupGridCopies(original, [0, 2], 1, 1, [500, 0, 0], [0, 900, 0]), null);
  assert.equal(corpusGroupGridCopies(original, [0, 2], 2, 2, [0, 0, 0], [0, 900, 0]), null);
  assert.equal(corpusGroupGridCopies(original, [0, 2], 8, 8, [500, 0, 0], [0, 900, 0]), null);
});

test("uklanja označenu grupu i čuva redoslijed ostalih korijena", () => {
  const original = source();
  const remaining = corpusElementsWithoutGroup(original, [2, 0])!;
  assert.deepEqual(remaining.map((element) => element.name), ["B"]);
  assert.equal(remaining[0], original[1]);
  assert.equal(corpusElementsWithoutGroup(original, [0]), null);
});

test("sakriva, izoluje i ponovo prikazuje korijenske elemente", () => {
  const original = source();
  const hidden = corpusGroupVisibilityElements(original, [0, 2], false)!;
  assert.deepEqual(hidden.map((element) => element.visible !== false), [false, true, false]);
  assert.equal(hidden[1], original[1]);
  assert.equal(corpusGroupVisibilityElements(hidden, [0, 2], false), hidden);
  const isolated = corpusIsolatedGroupElements(original, [0, 2])!;
  assert.deepEqual(isolated.map((element) => element.visible !== false), [true, false, true]);
  const restored = corpusVisibleRootElements(isolated);
  assert.deepEqual(restored.map((element) => element.visible !== false), [true, true, true]);
  assert.equal(corpusVisibleRootElements(restored), restored);
});

test("ravnomjerno raspoređuje srednje rotirane omotače između krajnjih", () => {
  const original = source();
  const distributed = corpusEvenlyDistributedGroupElements(original, [2, 0, 1], "x")!;
  assert.equal(distributed[0], original[0]);
  assert.deepEqual(distributed[1]!.position.map((value) => Math.round(value!)), [1650, 100, 1100]);
  assert.equal(distributed[2], original[2]);
  assert.equal(corpusEvenlyDistributedGroupElements(original, [0, 1], "x"), null);
  assert.equal(corpusEvenlyDistributedGroupElements(original, [0, 1, 2], "z"), null);
});

test("slaže rotirane omotače sa tačno zadanim razmakom", () => {
  const original = source();
  const spaced = corpusSpacedGroupElements(original, [2, 0, 1], "x", 100)!;
  assert.equal(spaced[0], original[0]);
  assert.deepEqual(spaced[1]!.position.map((value) => Math.round(value!)), [1200, 100, 1100]);
  assert.deepEqual(spaced[2]!.position.map((value) => Math.round(value!)), [1300, 200, 300]);
  const zSpaced = corpusSpacedGroupElements(original, [0, 1], "z", 50)!;
  assert.equal(zSpaced[0], original[0]);
  assert.deepEqual(zSpaced[1]!.position.map((value) => Math.round(value!)), [1000, 100, 1050]);
  assert.equal(corpusSpacedGroupElements(original, [0, 1], "x", -1), null);
  assert.equal(corpusSpacedGroupElements(original, [0], "x", 0), null);
});

test("raspoređuje i slaže elemente vertikalno po Y osi", () => {
  const vertical = elements(`
    <ELEMENT ENAME="Donji" EXPOX="0" EYPOS="0" EZPOS="500" ESIRINA="400" EVISINA="200" EDUBINA="300"/>
    <ELEMENT ENAME="Srednji" EXPOX="0" EYPOS="500" EZPOS="500" ESIRINA="400" EVISINA="300" EDUBINA="300"/>
    <ELEMENT ENAME="Gornji" EXPOX="0" EYPOS="1000" EZPOS="500" ESIRINA="400" EVISINA="100" EDUBINA="300"/>
  `);
  const even = corpusEvenlyDistributedGroupElements(vertical, [2, 0, 1], "y")!;
  assert.deepEqual(even.map((element) => element.position[1]), [0, 450, 1000]);
  assert.equal(even[0], vertical[0]);
  assert.equal(even[2], vertical[2]);
  const spaced = corpusSpacedGroupElements(vertical, [1, 2, 0], "y", 50)!;
  assert.deepEqual(spaced.map((element) => element.position[1]), [0, 250, 600]);
});

test("odbija nevažeći izbor, nepotpune položaje i neispravan pomak", () => {
  const original = source();
  assert.equal(corpusTranslatedElements(original, [0], [1, 2, 3]), null);
  assert.equal(corpusTranslatedElements(original, [0, 3], [1, 2, 3]), null);
  assert.equal(corpusTranslatedElements(original, [0, 1], [Number.NaN, 0, 0]), null);
  const incomplete = [{ ...original[0]!, position: [null, 0, 0] as const }, original[1]!];
  assert.equal(corpusTranslatedElements(incomplete, [0, 1], [1, 2, 3]), null);
  assert.equal(corpusAlignedGroupElements(incomplete, [0, 1], "left"), null);
  assert.equal(corpusRotatedGroupElements(incomplete, [0, 1], 90), null);
  assert.equal(corpusRotatedGroupElements(original, [0, 1], Number.POSITIVE_INFINITY), null);
  assert.equal(corpusSnappedGroupElements(original, [0, 1], 0), null);
  assert.equal(corpusContainedGroupElements(original, [0, 1], { width: .2, length: .2, height: .2, lowerHeight: null }), null);
  assert.equal(corpusGroupCopies(original, [0, 1], [0, 0, 0]), null);
});

test("zaključani i neuredivi elementi blokiraju geometriju ali ostaju kopirljivi", () => {
  const original = source();
  const protectedElements = [{ ...original[0]!, locked: true }, { ...original[1]!, editable: false }, original[2]!];
  assert.equal(corpusTranslatedElements(protectedElements, [0, 2], [10, 0, 0]), null);
  assert.equal(corpusAlignedGroupElements(protectedElements, [1, 2], "left"), null);
  assert.equal(corpusEvenlyDistributedGroupElements(protectedElements, [0, 1, 2], "x"), null);
  assert.equal(corpusSpacedGroupElements(protectedElements, [0, 2], "x", 10), null);
  assert.equal(corpusGroupCopies(protectedElements, [0, 1], [100, 0, 0])?.length, 2);
  assert.equal(corpusElementAllowsModeling(protectedElements[0]!), false);
  assert.equal(corpusElementAllowsModeling(protectedElements[1]!), false);
  assert.equal(corpusElementAllowsModeling(original[2]!), true);
});
