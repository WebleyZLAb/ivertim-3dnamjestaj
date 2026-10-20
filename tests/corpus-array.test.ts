import assert from "node:assert/strict";
import test from "node:test";
import { corpusLinearCopies } from "../lib/corpus-array.ts";
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
