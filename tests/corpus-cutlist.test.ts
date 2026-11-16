import assert from "node:assert/strict";
import test from "node:test";
import { buildCorpusCutList, corpusCutListCsv, corpusCutListPartCounts, corpusCutListSkipReason } from "../lib/corpus-cutlist.ts";
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
  assert.deepEqual(result.skippedReasons, { "VISINA=0": 1 });
  assert.deepEqual([result.items[0]!.height, result.items[0]!.width], [600.5, 400]);
});

test("jedno centralno pravilo obrazlaže neupotrebljive proizvodne mjere", () => {
  const project = parseCorpusS3d(`<PROJECTFILE><ELEMENT><DASKE>
    <AD DNAME="Bez mjera" VISINA="0" DUBINA="400" DEBLJINA="0"/>
    <AD DNAME="Dobra" VISINA="600" DUBINA="400" DEBLJINA="18"/>
  </DASKE></ELEMENT></PROJECTFILE>`);
  assert.equal(corpusCutListSkipReason(project.elements[0]!.boards[0]!), "VISINA=0, DEBLJINA=0");
  assert.equal(corpusCutListSkipReason(project.elements[0]!.boards[1]!), null);
});

test("izvozi Excel-prijateljski UTF-8 CSV sa tačkom-zarezom i decimalnim zarezom", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><ELEMENT ENAME="A"><DASKE><AD DNAME="Bok; lijevi" VISINA="600.5" DUBINA="400" DEBLJINA="18" MATNAME="Hrast &quot;natur&quot;"/></DASKE></ELEMENT></PROJECTFILE>`);
  const csv = corpusCutListCsv(buildCorpusCutList(project.elements));
  assert.equal(csv.charCodeAt(0), 0xfeff);
  assert.match(csv, /600,5;400;18;1/);
  assert.match(csv, /"A: Bok; lijevi"/);
});

test("ne spaja frontu i običnu ploču istih mjera te čuva vrstu u CSV-u", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><ELEMENT ENAME="A"><DASKE><AD DNAME="Polica" VISINA="600" DUBINA="400" DEBLJINA="18" MATNAME="Bijela"/><AD DNAME="Fronta" TIPDASKE="1" TIPFRONTE="2" VISINA="600" DUBINA="400" DEBLJINA="18" MATNAME="Bijela"/></DASKE></ELEMENT></PROJECTFILE>`);
  const result = buildCorpusCutList(project.elements);

  assert.equal(result.totalBoards, 2);
  assert.equal(result.totalFronts, 1);
  assert.equal(result.items.length, 2);
  assert.deepEqual(result.items.map(({ frontType, quantity }) => [frontType, quantity]), [[null, 1], [2, 1]]);
  const csv = corpusCutListCsv(result);
  assert.match(csv, /Vrsta dijela;TIPFRONTE/);
  assert.match(csv, /Ploča;;Bijela/);
  assert.match(csv, /Fronta;2;Bijela/);
});

test("razlikuje ploče, fronte i pomoćne TIPFRONTE režime", () => {
  const project = parseCorpusS3d(`<PROJECTFILE><ELEMENT ENAME="A"><DASKE>
    <AD DNAME="Ploča" TIPFRONTE="0" VISINA="600" DUBINA="400" DEBLJINA="18" MATNAME="M"/>
    <AD DNAME="Fronta 1" TIPFRONTE="1" VISINA="600" DUBINA="400" DEBLJINA="18" MATNAME="M"/>
    <AD DNAME="Fronta 6" TIPFRONTE="6" VISINA="600" DUBINA="400" DEBLJINA="18" MATNAME="M"/>
    <AD DNAME="Nogica" TIPFRONTE="5" VISINA="100" DUBINA="60" DEBLJINA="20" MATNAME="Metal"/>
  </DASKE></ELEMENT></PROJECTFILE>`);
  const result = buildCorpusCutList(project.elements);
  const csv = corpusCutListCsv(result);

  assert.equal(result.totalBoards, 4);
  assert.equal(result.totalFronts, 2);
  assert.deepEqual(corpusCutListPartCounts(result), { board: 1, front: 2, auxiliary: 1, unknown: 0 });
  assert.match(csv, /Ploča;;M/);
  assert.match(csv, /Fronta;1;M/);
  assert.match(csv, /Fronta;6;M/);
  assert.match(csv, /Pomoćni dio;5;Metal/);
});

test("CSV ne dopušta Excel formulu iz Corpus tekstualnih polja", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><ELEMENT ENAME="A"><DASKE><AD DNAME="Bok" VISINA="600" DUBINA="400" DEBLJINA="18" MATNAME="=HYPERLINK(&quot;https://invalid&quot;);Bijela"/></DASKE></ELEMENT></PROJECTFILE>`);
  const result = buildCorpusCutList(project.elements);
  const csv = corpusCutListCsv(result);
  assert.match(csv, /"'=HYPERLINK\(""https:\/\/invalid""\);Bijela"/);
});
