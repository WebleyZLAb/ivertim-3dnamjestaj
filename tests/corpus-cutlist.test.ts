import assert from "node:assert/strict";
import test from "node:test";
import { buildCorpusCutList, corpusCutListCsv } from "../lib/corpus-cutlist.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

test("grupiše iste ploče kroz korijenske i ugniježđene elemente", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A"><DASKE><AD DNAME="Bok 1" VISINA="720" DUBINA="560" DEBLJINA="18" MATNAME="Bijela" MATUID="W1"><RUPE><GRUPA14/></RUPE></AD></DASKE><ELMLIST><ELM ENAME="B"><DASKE><AD DNAME="Bok 2" VISINA="720" DUBINA="560" DEBLJINA="18" MATNAME="Bijela" MATUID="W1" VISIBLE="false"><RUPE><GRUPA14/><GRUPA14/></RUPE></AD></DASKE></ELM></ELMLIST></ELEMENT></PROJECTFILE>`);
  const result = buildCorpusCutList(project.elements);
  assert.equal(result.totalBoards, 2);
  assert.equal(result.skippedBoards, 0);
  assert.equal(result.items.length, 1);
  assert.equal(result.items[0]!.quantity, 2);
  assert.equal(result.items[0]!.holeCount, 3);
  assert.equal(result.items[0]!.hiddenCount, 1);
  assert.deepEqual(result.items[0]!.parts, ["A / B: Bok 2", "A: Bok 1"]);
});

test("preskače ploče bez upotrebljivih mjera i čuva Corpus orijentaciju mjera", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><ELEMENT ENAME="A"><DASKE><AD DNAME="Dobra" VISINA="600.5" DUBINA="400" DEBLJINA="18"/><AD DNAME="Bez mjere" VISINA="0" DUBINA="400" DEBLJINA="18"/></DASKE></ELEMENT></PROJECTFILE>`);
  const result = buildCorpusCutList(project.elements);
  assert.equal(result.skippedBoards, 1);
  assert.deepEqual([result.items[0]!.height, result.items[0]!.width], [600.5, 400]);
});

test("izvozi Excel-prijateljski UTF-8 CSV sa tačkom-zarezom i decimalnim zarezom", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><ELEMENT ENAME="A"><DASKE><AD DNAME="Bok; lijevi" VISINA="600.5" DUBINA="400" DEBLJINA="18" MATNAME="Hrast &quot;natur&quot;"/></DASKE></ELEMENT></PROJECTFILE>`);
  const csv = corpusCutListCsv(buildCorpusCutList(project.elements));
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /600,5;400;18;1/);
  assert.match(csv, /"A: Bok; lijevi"/);
});
