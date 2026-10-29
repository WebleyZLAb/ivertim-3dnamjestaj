import assert from "node:assert/strict";
import test from "node:test";
import { buildCorpusCutList, corpusCutListCsv } from "../lib/corpus-cutlist.ts";
import { parseCorpusS3d } from "../lib/corpus-s3d.ts";

test("grupiše iste ploče kroz korijenske i ugniježđene elemente", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><SOBA/><ELEMENT ENAME="A"><DASKE><AD DNAME="Bok 1" VISINA="720" DUBINA="560" DEBLJINA="18" MATNAME="Bijela" MATUID="W1"><RUPE><GRUPA14/></RUPE></AD></DASKE><ELMLIST><ELM ENAME="B"><DASKE><AD DNAME="Bok 2" VISINA="720" DUBINA="560" DEBLJINA="18" MATNAME="Bijela" MATUID="W1" VISIBLE="false"><RUPE><GRUPA14/><GRUPA14/></RUPE></AD></DASKE></ELM></ELMLIST></ELEMENT></PROJECTFILE>`);
  const result = buildCorpusCutList(project.elements, { includeHidden: true });
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


test("proizvodnja izostavlja skrivenu ploču i potomke skrivenog elementa bez izmjene izvora", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><ELEMENT ENAME="Vidljiv"><DASKE><AD DNAME="Aktivan" VISINA="600" DUBINA="400" DEBLJINA="18"/><AD DNAME="Skrivena ploca" VISIBLE="false" VISINA="600" DUBINA="400" DEBLJINA="18"/></DASKE><ELMLIST><ELM ENAME="Skriven" EVISIBLE="false"><DASKE><AD DNAME="Roditelj" VISINA="600" DUBINA="400" DEBLJINA="18"/></DASKE><ELMLIST><ELM ENAME="Potomak" EVISIBLE="true"><DASKE><AD DNAME="Naslijedjena" VISINA="600" DUBINA="400" DEBLJINA="18"/></DASKE></ELM></ELMLIST></ELM></ELMLIST></ELEMENT></PROJECTFILE>`);
  const before = JSON.stringify(project);
  const result = buildCorpusCutList(project.elements);
  assert.equal(result.totalBoards, 4);
  assert.equal(result.excludedHiddenBoards, 3);
  assert.equal(result.skippedBoards, 0);
  assert.equal(result.items[0]!.quantity, 1);
  assert.deepEqual(result.items[0]!.parts, ["Vidljiv: Aktivan"]);
  assert.doesNotMatch(corpusCutListCsv(result), /Skrivena ploca|Roditelj|Naslijedjena/);
  const audit = buildCorpusCutList(project.elements, {includeHidden:true});
  assert.equal(audit.items[0]!.quantity, 4);
  assert.equal(audit.items[0]!.hiddenCount, 3);
  assert.equal(JSON.stringify(project), before);
});


test("CSV sa zarezom čuva decimalne mjere i navodnike bez zaglavlja i BOM-a", () => {
  const project = parseCorpusS3d(`<PROJECTFILE VER="17"><ELEMENT ENAME="A"><DASKE><AD DNAME="Bok, lijevi" VISINA="600.5" DUBINA="400.25" DEBLJINA="18" MATNAME="Hrast &quot;natur&quot;, bijeli" MATUID="W1"/></DASKE></ELEMENT></PROJECTFILE>`);
  const result = buildCorpusCutList(project.elements);
  const before = JSON.stringify(result);
  assert.equal(corpusCutListCsv(result, {delimiter:",", includeHeader:false, includeBom:false}),
    '"Hrast ""natur"", bijeli",W1,"600,5","400,25",18,1,0,0,"A: Bok, lijevi"\r\n');
  assert.equal(JSON.stringify(result), before);
});

test("tabulator i decimalna tačka čuvaju tekst sa tabom i novim redom", () => {
  const result = {totalBoards:1, skippedBoards:0, excludedHiddenBoards:0, items:[{
    materialName:'Bijela\tmat', materialUid:'W1', height:600.5, width:400.25, thickness:18,
    quantity:1, holeCount:0, hiddenCount:0, parts:['A: Bok\r\nLijevi'],
  }]};
  assert.equal(corpusCutListCsv(result, {delimiter:"\t", decimalSeparator:".", includeHeader:false, includeBom:false}),
    '"Bijela\tmat"\tW1\t600.5\t400.25\t18\t1\t0\t0\t"A: Bok\r\nLijevi"\r\n');
  assert.equal(corpusCutListCsv(result, {includeBom:false}).startsWith('Materijal;UID materijala;'), true);
});
