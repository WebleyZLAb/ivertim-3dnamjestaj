import assert from "node:assert/strict";
import test from "node:test";
import { analyzeCorpusBoardContact } from "../lib/corpus-board-contact.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

function boards(xml: string) {
  return parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="E"><DASKE>${xml}</DASKE></ELEMENT></PROJECTFILE>`).elements[0]!.boards;
}

test("nalazi površinski dodir bočne i horizontalne ploče", () => {
  const [side, bottom] = boards(`<AD DNAME="Bok" DXPOS="0" DYPOS="100" DZPOS="0" VISINA="720" DUBINA="560" DEBLJINA="18" SMJER="0"/><AD DNAME="Pod" DXPOS="18" DYPOS="100" DZPOS="0" VISINA="564" DUBINA="560" DEBLJINA="18" SMJER="2"/>`);
  const contact = analyzeCorpusBoardContact(side!, bottom!);
  assert.equal(contact.status, "contact");
  assert.equal(contact.axis, "X");
  assert.deepEqual(contact.overlap, { Y: [100, 118], Z: [0, 560] });
  assert.deepEqual(contact.object1Face, { worldAxis: "X", localAxis: "debljina", side: "max", autostCandidate: null });
  assert.deepEqual(contact.object2Face, { worldAxis: "X", localAxis: "visina", side: "min", autostCandidate: 3 });
  assert.deepEqual(contact.object1LocalOverlap, { minX: 0, maxX: 18, minY: 0, maxY: 560, xAxis: "visina", yAxis: "dubina" });
  assert.deepEqual(contact.object2LocalOverlap, { minX: 0, maxX: 18, minY: 0, maxY: 560, xAxis: "debljina", yAxis: "dubina" });
});

test("preslikava pomjereni presjek u lokalne koordinate obje ploče", () => {
  const [back, shelf] = boards(`<AD DNAME="Leđa" DXPOS="50" DYPOS="20" DZPOS="0" VISINA="300" DUBINA="400" DEBLJINA="10" SMJER="1"/><AD DNAME="Polica" DXPOS="150" DYPOS="120" DZPOS="10" VISINA="200" DUBINA="250" DEBLJINA="20" SMJER="2"/>`);
  const contact = analyzeCorpusBoardContact(back!, shelf!);
  assert.equal(contact.status, "contact");
  assert.equal(contact.axis, "Z");
  assert.deepEqual(contact.object1LocalOverlap, { minX: 100, maxX: 120, minY: 100, maxY: 300, xAxis: "visina", yAxis: "dubina" });
  assert.deepEqual(contact.object2LocalOverlap, { minX: 0, maxX: 20, minY: 0, maxY: 200, xAxis: "debljina", yAxis: "visina" });
});

test("razlikuje razmak, zapreminsko preklapanje i dodir samo ivicom", () => {
  const [base, separated, overlapping, edge] = boards(`<AD DXPOS="0" DYPOS="0" DZPOS="0" VISINA="100" DUBINA="100" DEBLJINA="10" SMJER="2"/><AD DXPOS="120" DYPOS="0" DZPOS="0" VISINA="100" DUBINA="100" DEBLJINA="10" SMJER="2"/><AD DXPOS="50" DYPOS="0" DZPOS="0" VISINA="100" DUBINA="100" DEBLJINA="10" SMJER="2"/><AD DXPOS="100" DYPOS="10" DZPOS="100" VISINA="100" DUBINA="100" DEBLJINA="10" SMJER="2"/>`);
  assert.equal(analyzeCorpusBoardContact(base!, separated!).status, "separated");
  assert.equal(analyzeCorpusBoardContact(base!, overlapping!).status, "overlap");
  assert.equal(analyzeCorpusBoardContact(base!, edge!).status, "edge-only");
});

test("ne nagađa spoj rotirane ili nepotpune ploče", () => {
  const [rotated, plain, incomplete] = boards(`<AD DXPOS="0" DYPOS="0" DZPOS="0" VISINA="100" DUBINA="100" DEBLJINA="10" SMJER="0" DKUT="15"/><AD DXPOS="10" DYPOS="0" DZPOS="0" VISINA="100" DUBINA="100" DEBLJINA="10" SMJER="2"/><AD DXPOS="0" DYPOS="0" DZPOS="0" DUBINA="100" DEBLJINA="10" SMJER="0"/>`);
  assert.equal(analyzeCorpusBoardContact(rotated!, plain!).status, "unsupported");
  assert.equal(analyzeCorpusBoardContact(incomplete!, plain!).status, "unsupported");
});
