import test from "node:test";
import assert from "node:assert/strict";
import { parseCorpusE3d } from "../lib/corpus-s3d.ts";
import { inspectCorpusMaterialReferences, corpusMaterialReferences, replaceCorpusMaterial, sameCorpusMaterial } from "../lib/corpus-material-replacement.ts";
const elements = parseCorpusE3d(`<ELEMENTFILE><ELEMENT ENAME="Root"><DASKE><AD DNAME="A" MATUID="old" MATNAME="Original" VISINA="500" DUBINA="300" DEBLJINA="18"/><AD DNAME="B" MATUID="OLD" MATNAME="Other" DVISIBLE="0"/><AD DNAME="C" MATUID="different" MATNAME="Original"/></DASKE><ELMLIST><ELM ENAME="Child"><DASKE><AD MATUID="old"/></DASKE></ELM><ELM ENAME="Locked" ELOCKED="1"><DASKE><AD MATUID="old"/></DASKE><ELMLIST><ELM><DASKE><AD MATUID="old"/></DASKE></ELM></ELMLIST></ELM></ELMLIST></ELEMENT></ELEMENTFILE>`).elements;
const destination = {uid:"new", name:"Replacement"};
test("jedna ploča ne mijenja ostale niti geometriju i obrade", () => {
  const refs = corpusMaterialReferences(elements);
  const result = replaceCorpusMaterial(elements, refs[0]!, destination, "one");
  assert.equal(result.changed, 1);
  const before = elements[0]!.boards[0]!, after = result.elements[0]!.boards[0]!;
  assert.deepEqual(after, {...before, materialUid:"new", materialName:"Replacement"});
  assert.equal(result.elements[0]!.boards[1], elements[0]!.boards[1]);
  assert.equal(result.elements[0]!.children[0], elements[0]!.children[0]);
  assert.equal(before.materialUid,"old");
});
test("sve iste UID reference uključuju sakrivene i djecu, preskaču zaključano stablo", () => {
  const refs = corpusMaterialReferences(elements);
  const result = replaceCorpusMaterial(elements, refs[0]!, destination, "same");
  assert.equal(result.changed, 3);
  assert.equal(result.skipped, 2);
  assert.equal(result.elements[0]!.boards[2], elements[0]!.boards[2]);
  assert.equal(result.elements[0]!.children[1], elements[0]!.children[1]);
  assert.equal(result.elements[0]!.children[0]!.boards[0]!.materialUid,"new");
});
test("bez UID-a podudara samo isti naziv i ne obuhvata imenovani UID", () => {
  const board = elements[0]!.boards[0]!;
  assert.equal(sameCorpusMaterial({...board, materialUid:"", materialName:" Bijela "}, {...board, materialUid:"", materialName:"BIJELA"}),true);
  assert.equal(sameCorpusMaterial({...board, materialUid:""},board),false);
});
test("nevažeći cilj i prazna zamjena ne mijenjaju model", () => {
  const source = corpusMaterialReferences(elements)[0]!;
  assert.equal(replaceCorpusMaterial(elements, source, {uid:"",name:"A"}, "same").changed,0);
  assert.equal(replaceCorpusMaterial(elements, {...source, boardIndex:900}, destination, "same").changed,0);
});

import { readFileSync } from "node:fs";
import { writeCorpusE3dGeometryCopy } from "../lib/corpus-s3d-writer.ts";
import { decodeCorpusText } from "../lib/corpus-macro.ts";
test("stvarni D1V E3D zadržava sve osim zamijenjenog naziva i UID-a kroz izvoz i učitavanje", () => {
  const xml = decodeCorpusText(readFileSync("public/local-corpus/Elmsav/_____PUSTI PRIJE SVEGA/D1V.E3D"));
  const before = parseCorpusE3d(xml);
  const refs = corpusMaterialReferences(before.elements);
  const source = refs.filter((ref) => ref.editable && ref.board.materialUid.trim()).sort((a,b) => refs.filter((ref) => sameCorpusMaterial(ref.board,b.board)).length - refs.filter((ref) => sameCorpusMaterial(ref.board,a.board)).length)[0]!;
  assert.ok(source);
  const result = replaceCorpusMaterial(before.elements, source, destination, "same");
  assert.ok(result.changed > 1);
  const output = writeCorpusE3dGeometryCopy(xml,before.elements,result.elements);
  const after = parseCorpusE3d(output);
  assert.deepEqual(after.elements,result.elements);
  const oldRefs = corpusMaterialReferences(before.elements), newRefs = corpusMaterialReferences(after.elements);
  let changed = 0;
  for (let i=0; i<oldRefs.length; i++) {
    const old = oldRefs[i]!, next = newRefs[i]!;
    if (old.editable && sameCorpusMaterial(old.board,source.board)) {
      assert.deepEqual(next.board,{...old.board,materialUid:destination.uid,materialName:destination.name}); changed++;
    } else assert.deepEqual(next.board,old.board);
  }
  assert.equal(changed,result.changed);
  assert.equal(writeCorpusE3dGeometryCopy(output,after.elements,after.elements),output);
});


import { createCorpusMaterialIndex, parseCorpusMaterialCatalog } from "../lib/corpus-material-library.ts";
test("provjera referenci odvaja nepostojeći i dupli UID od odsutne slike", () => {
 const catalog = parseCorpusMaterialCatalog(`<MAT>\nNAZIV=Original\nMUID=old\n<ENDMAT>\n<MAT>\nNAZIV=A\nMUID=different\n<ENDMAT>\n<MAT>\nNAZIV=B\nMUID=different\n<ENDMAT>`);
 const audit = inspectCorpusMaterialReferences(elements,createCorpusMaterialIndex([catalog]));
 assert.equal(audit.missing.length,0);
 assert.equal(audit.ambiguous.length,1);
 assert.equal(audit.ambiguous[0]!.boardIndex,2);
 assert.equal(audit.references.length,6);
 const empty = inspectCorpusMaterialReferences(elements,createCorpusMaterialIndex([]));
 assert.equal(empty.missing.length,6);
 assert.equal(empty.ambiguous.length,0);
});
