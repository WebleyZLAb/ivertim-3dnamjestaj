import assert from "node:assert/strict";
import test from "node:test";
import { corpusGridCopyOffsets, corpusLinearCopies } from "../lib/corpus-array.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

const element = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="Korpus" EXPOX="100" EYPOS="20" EZPOS="700" ESIRINA="600" EVISINA="800" EDUBINA="400"><DASKE/></ELEMENT></PROJECTFILE>`).elements[0]!;

test("pravi linearni niz nezavisnih kopija po sve tri ose", () => {
  const copies = corpusLinearCopies(element, 3, [650, 10, -25]);
  assert.deepEqual(copies.map((copy) => copy.position), [[750, 30, 675], [1400, 40, 650], [2050, 50, 625]]);
  assert.notEqual(copies[0], element);
  assert.notEqual(copies[0], copies[1]);
});

test("ograničava broj, razmak i nepotpune koordinate", () => {
  assert.throws(() => corpusLinearCopies(element, 0, [600, 0, 0]), /1 do 50/);
  assert.throws(() => corpusLinearCopies(element, 51, [600, 0, 0]), /1 do 50/);
  assert.throws(() => corpusLinearCopies(element, 1, [0, 0, 0]), /razmak/);
  assert.throws(() => corpusLinearCopies({ ...element, position: [null, 0, 0] }, 1, [600, 0, 0]), /potpune/);
});

test("pravi 2D mrežu pomaka bez početne ćelije", () => {
  assert.deepEqual(corpusGridCopyOffsets(3, 2, [100, 0, -5], [0, 80, 10]), [
    [100, 0, -5], [200, 0, -10], [0, 80, 10], [100, 80, 5], [200, 80, 0],
  ]);
});

test("odbija nevažeću, preveliku i preklopljenu mrežu", () => {
  assert.throws(() => corpusGridCopyOffsets(1, 1, [100, 0, 0], [0, 100, 0]), /1 do 50/);
  assert.throws(() => corpusGridCopyOffsets(8, 8, [100, 0, 0], [0, 100, 0]), /1 do 50/);
  assert.throws(() => corpusGridCopyOffsets(2, 2, [0, 0, 0], [0, 100, 0]), /kolone/);
  assert.throws(() => corpusGridCopyOffsets(2, 2, [100, 0, 0], [100, 0, 0]), /isto mjesto/);
  assert.throws(() => corpusGridCopyOffsets(2, 1, [Number.NaN, 0, 0], [0, 0, 0]), /konačni/);
});
