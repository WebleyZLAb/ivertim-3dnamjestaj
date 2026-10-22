import assert from "node:assert/strict";
import test from "node:test";
import { analyzeCorpusLayout, corpusContainedLayoutElements, corpusLayoutIssueElements, corpusLayoutProblemElements, corpusSeparatedLayoutElements } from "../lib/corpus-layout.ts";
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

test("problem rasporeda razrješava elemente u obuhvatu koji je stvarno analiziran", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="Prvi" EXPOX="0" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560"/><ELEMENT ENAME="Drugi" EXPOX="4600" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560"/></PROJECTFILE>`);
  const analyzedGroup = [project.elements[1]!];
  const issue = analyzeCorpusLayout(analyzedGroup, room)[0]!;
  assert.deepEqual(issue.elementIndexes, [0]);
  assert.deepEqual(corpusLayoutIssueElements(issue, analyzedGroup), analyzedGroup);
});

test("vraća više problematičnih elemenata u sobu kao jedan novi niz i čuva ostale", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="Lijevo" EXPOX="-100" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560"/><ELEMENT ENAME="Unutra" EXPOX="1000" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560"/><ELEMENT ENAME="Desno" EXPOX="4900" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560"/></PROJECTFILE>`);
  const result = corpusContainedLayoutElements(project.elements, [project.elements[0]!, project.elements[2]!], room)!;
  assert.deepEqual(result.movedIndexes, [0, 2]);
  assert.deepEqual(result.blockedIndexes, []);
  assert.equal(result.elements[1], project.elements[1]);
  assert.deepEqual(result.elements.map((element) => element.position[0]), [0, 1000, 4400]);
  assert.equal(analyzeCorpusLayout(result.elements, room).filter(({ type }) => type === "outside-room").length, 0);
});

test("ne pomjera zaključan ili prevelik element pri automatskom vraćanju", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="Zaključan" ELOCKED="true" EXPOX="-100" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560"/><ELEMENT ENAME="Prevelik" EXPOX="0" EYPOS="0" EZPOS="560" ESIRINA="6000" EVISINA="820" EDUBINA="560"/></PROJECTFILE>`);
  const result = corpusContainedLayoutElements(project.elements, project.elements, room)!;
  assert.deepEqual(result.movedIndexes, []);
  assert.deepEqual(result.blockedIndexes, [0, 1]);
  assert.equal(result.elements, project.elements);
});

test("razdvaja drugi element najkraćim pomakom po izabranoj osi", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="Sidro" EXPOX="0" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560"/><ELEMENT ENAME="Pokretni" EXPOX="599" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560"/></PROJECTFILE>`);
  const result = corpusSeparatedLayoutElements(project.elements, project.elements, "x")!;
  assert.equal(result.movedIndex, 1);
  assert.ok(Math.abs(result.delta - 1) < 0.00001);
  assert.equal(result.elements[0], project.elements[0]);
  assert.equal(analyzeCorpusLayout(result.elements, room).some(({ type }) => type === "overlap"), false);
});

test("SAT razdvajanje rotiranih elemenata prestaje na prvom dodiru", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="Sidro" EXPOX="1000" EYPOS="0" EZPOS="1000" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="45"/><ELEMENT ENAME="Pokretni" EXPOX="1001" EYPOS="0" EZPOS="1000" ESIRINA="600" EVISINA="820" EDUBINA="560" EKUT="45"/></PROJECTFILE>`);
  const result = corpusSeparatedLayoutElements(project.elements, project.elements, "z")!;
  assert.equal(analyzeCorpusLayout(result.elements, room).some(({ type }) => type === "overlap"), false);
  assert.ok(Math.abs(result.delta) > 0);
  const beforeContact = result.elements.map((element, index) => index === 1 ? { ...element, position: [element.position[0], element.position[1], element.position[2]! - Math.sign(result.delta) * 0.01] as const } : element);
  assert.equal(analyzeCorpusLayout(beforeContact, room).some(({ type }) => type === "overlap"), true);
});

test("ne razdvaja kada drugi element nije urediv", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="Sidro" EXPOX="0" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560"/><ELEMENT ENAME="Zaključan" ELOCKED="true" EXPOX="599" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560"/></PROJECTFILE>`);
  assert.equal(corpusSeparatedLayoutElements(project.elements, project.elements, "x"), null);
});

test("grupiše jedinstvene elemente problema za 3D oznake", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A" EXPOX="4600" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560"/><ELEMENT ENAME="B" EXPOX="4700" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560"/><ELEMENT ENAME="Čist" EXPOX="1000" EYPOS="0" EZPOS="560" ESIRINA="600" EVISINA="820" EDUBINA="560"/></PROJECTFILE>`);
  const problems = corpusLayoutProblemElements(analyzeCorpusLayout(project.elements, room), project.elements);
  assert.deepEqual(problems.outsideRoom, project.elements.slice(0, 2));
  assert.deepEqual(problems.overlapping, project.elements.slice(0, 2));
});
