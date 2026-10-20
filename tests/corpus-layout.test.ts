import assert from "node:assert/strict";
import test from "node:test";
import { analyzeCorpusLayout } from "../lib/corpus-layout.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

const room = { width: 4, length: 5, height: 1.2, lowerHeight: 1.4 };

test("prijavljuje izlazak elementa iz prostorije", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="Van sobe" EXPOX="4600" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="0"/></PROJECTFILE>`);
  const issues = analyzeCorpusLayout(project.elements, room);
  assert.equal(issues.length, 1);
  assert.equal(issues[0]!.type, "outside-room");
});

test("prijavljuje stvarno preklapanje, ali ne i dodir susjednih omotača", () => {
  const overlap = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A" EXPOX="0" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="0"/><ELEMENT ENAME="B" EXPOX="599" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="0"/></PROJECTFILE>`);
  assert.equal(analyzeCorpusLayout(overlap.elements, room).filter(({ type }) => type === "overlap").length, 1);
  const touching = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A" EXPOX="0" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="0"/><ELEMENT ENAME="B" EXPOX="600" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="0"/></PROJECTFILE>`);
  assert.equal(analyzeCorpusLayout(touching.elements, room).length, 0);
});

test("skriveni element se preskače, a rotirani izlazak se tačno prijavljuje", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="Skriven" EVISIBLE="false" EXPOX="-1" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560"/><ELEMENT ENAME="Rotiran" EXPOX="4900" EYPOS="0" EZPOS="600" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="45"/></PROJECTFILE>`);
  const issues = analyzeCorpusLayout(project.elements, room);
  assert.equal(issues.length, 1);
  assert.equal(issues[0]?.type, "outside-room");
  assert.deepEqual(issues[0]?.elementIndexes, [1]);
});
