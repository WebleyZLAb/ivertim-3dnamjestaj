import assert from "node:assert/strict";
import test from "node:test";
import { corpusDistributedElements } from "../lib/corpus-distribution.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

function elements(xml: string) {
  return parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA SIRINA="4" DUZINA="5" VISINA="2.6"/>${xml}</PROJECTFILE>`).elements;
}

test("raspoređuje korijenske elemente po X osi prema postojećem redoslijedu", () => {
  const source = elements(`
    <ELEMENT ENAME="Treći" EXPOX="2000" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="0"/>
    <ELEMENT ENAME="Prvi" EXPOX="100" EYPOS="20" EZPOS="700" ESIRINA="800" EVISINA="900" EDUBINA="600" EKUT="0"/>
    <ELEMENT ENAME="Drugi" EXPOX="1000" EYPOS="40" EZPOS="800" ESIRINA="500" EVISINA="700" EDUBINA="400" EKUT="0"/>
  `);
  const arranged = corpusDistributedElements(source, { width: 4, length: 5, height: 2.6, lowerHeight: null }, "x", 50, 100)!;
  assert.deepEqual(arranged.map((element) => element.position), [[1500, 0, 560], [100, 20, 700], [950, 40, 800]]);
  assert.deepEqual(arranged.map((element) => element.name), ["Treći", "Prvi", "Drugi"]);
});

test("raspoređuje rotirane elemente po Z osi koristeći stvarni svjetski omotač", () => {
  const source = elements(`
    <ELEMENT ENAME="A" EXPOX="100" EYPOS="0" EZPOS="1000" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="90"/>
    <ELEMENT ENAME="B" EXPOX="900" EYPOS="0" EZPOS="2000" ESIRINA="800" EVISINA="820" EDUBINA="400" EKUT="0"/>
  `);
  const arranged = corpusDistributedElements(source, { width: 4, length: 5, height: 2.6, lowerHeight: null }, "z", 20, 10)!;
  assert.deepEqual(arranged.map((element) => element.position[2]), [610, 1030]);
  assert.deepEqual(arranged.map((element) => element.position[0]), [100, 900]);
});

test("odbija nepotpun, prevelik ili neispravno podešen raspored", () => {
  const source = elements(`
    <ELEMENT ENAME="A" EXPOX="0" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="0"/>
    <ELEMENT ENAME="B" EXPOX="700" EYPOS="0" EZPOS="560" ESIRINA="800" EVISINA="820" EDUBINA="560" EKUT="0"/>
  `);
  assert.equal(corpusDistributedElements(source.slice(0, 1), { width: 4, length: 5, height: 2.6, lowerHeight: null }, "x"), null);
  assert.equal(corpusDistributedElements(source, { width: 4, length: 1, height: 2.6, lowerHeight: null }, "x"), null);
  assert.equal(corpusDistributedElements(source, { width: null, length: 5, height: 2.6, lowerHeight: null }, "z"), null);
  assert.equal(corpusDistributedElements(source, { width: 4, length: 5, height: 2.6, lowerHeight: null }, "x", -1), null);
});
