import assert from "node:assert/strict";
import test from "node:test";
import { corpusElementFootprint, corpusFootprintsOverlap } from "../lib/corpus-footprint.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

function element(x: number, z: number, angle: number) {
  return parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A" EXPOX="${x}" EYPOS="0" EZPOS="${z}" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="${angle}"/></PROJECTFILE>`).elements[0]!;
}

function rounded(values: readonly number[]) {
  return values.map((value) => Math.round(value * 1e9) / 1e9);
}

test("Corpus Z koordinata nerotiranog elementa ide od EZPOS-dubina do EZPOS", () => {
  const footprint = corpusElementFootprint(element(100, 700, 0))!;
  assert.deepEqual(rounded([footprint.worldBounds.minX, footprint.worldBounds.maxX, footprint.worldBounds.minZ, footprint.worldBounds.maxZ]), [100, 700, 140, 700]);
});

test("rotacija od 90 stepeni koristi isti pivot kao Three.js prikaz", () => {
  const footprint = corpusElementFootprint(element(1000, 800, 90))!;
  assert.deepEqual(rounded([footprint.worldBounds.minX, footprint.worldBounds.maxX, footprint.worldBounds.minZ, footprint.worldBounds.maxZ]), [440, 1000, 200, 800]);
});

test("SAT razlikuje stvarni presjek od samog dodira rotiranih elemenata", () => {
  const first = corpusElementFootprint(element(1000, 1000, 45))!;
  const overlap = corpusElementFootprint(element(1001, 1000, 45))!;
  const touching = corpusElementFootprint(element(1000 + 600 * Math.SQRT1_2, 1000 - 600 * Math.SQRT1_2, 45))!;
  assert.equal(corpusFootprintsOverlap(first, overlap), true);
  assert.equal(corpusFootprintsOverlap(first, touching), false);
});
