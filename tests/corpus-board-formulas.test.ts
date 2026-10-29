import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {parseCorpusE3d} from "../lib/corpus-s3d.ts";
import {decodeCorpusText} from "../lib/corpus-macro.ts";
import {replaceCorpusE3dBoardFormulas} from "../lib/corpus-s3d-writer.ts";
import {applyCorpusE3dBoardFormulas,previewCorpusBoardFormulas} from "../lib/corpus-board-formulas.ts";
const xml=decodeCorpusText(readFileSync("public/local-corpus/Elmsav/_____PUSTI PRIJE SVEGA/D1V.E3D"));
const root=parseCorpusE3d(xml).elements[0]!;
const top=root.boards.findIndex(b=>b.name==="PLAFON"), side=root.boards.findIndex(b=>b.name==="Lijevi_bok");
test("PLAFON X izraz računa referencu boka, čuva je i prenosi kasniju debljinu",()=>{
 const preview=previewCorpusBoardFormulas(root,top,{XF:"lijevi_bok.debljina+2"});
 assert.equal(preview.values[0],20);assert.equal(preview.errors.length,0);
 let next=applyCorpusE3dBoardFormulas(xml,top,{XF:"lijevi_bok.debljina+2"});
 next=applyCorpusE3dBoardFormulas(next,side,{DF:"20"});
 const result=parseCorpusE3d(next).elements[0]!;
 assert.equal(result.boards[top]!.position[0],22);
 assert.equal(result.boards[top]!.formulas?.XF,"lijevi_bok.debljina+2");
 assert.equal(result.boards[side]!.thickness,20);
 assert.equal(previewCorpusBoardFormulas(result,top,{XF:"lijevi_bok.debljina+2"}).changed,false);
});
test("nepoznat izraz i ciklus imaju razlog i ne prepisuju spremljenu geometriju",()=>{
 for(const [expression,reason] of [["NEPOSTOJECE+1","missing"],["self.x+1","cycle"]]) {
  const preview=previewCorpusBoardFormulas(root,top,{XF:expression!});
  assert.equal(preview.errors[0]!.reason,reason);
  assert.equal(preview.values[0],root.boards[top]!.position[0]);
  assert.throws(()=>applyCorpusE3dBoardFormulas(xml,top,{XF:expression!}),/Izraz nije primijenjen/);
 }
 assert.throws(()=>applyCorpusE3dBoardFormulas(xml,top,{HF:"-10"}),/Izraz nije primijenjen/);
});
test("uklanjanje izraza zadržava izračunati broj i prekida samo tu vezu",()=>{
 let next=applyCorpusE3dBoardFormulas(xml,top,{XF:"lijevi_bok.debljina+2"});
 next=applyCorpusE3dBoardFormulas(next,top,{XF:""});
 next=applyCorpusE3dBoardFormulas(next,side,{DF:"22"});
 const board=parseCorpusE3d(next).elements[0]!.boards[top]!;
 assert.equal(board.position[0],20);assert.equal(board.formulas?.XF,undefined);
});
test("attribute-only upis čuva nepoznati sadržaj i XML escapuje izraz",()=>{
 const source=`<ELEMENTFILE><ELEMENT><DASKE><AD DNAME="A" XF="old"><OPAQUE DATA="untouched"/></AD></DASKE><UNSUPPORTED DATA="keep"/></ELEMENT></ELEMENTFILE>`;
 const output=replaceCorpusE3dBoardFormulas(source,0,{XF:'IF(S<700;1;2)'});
 assert.match(output,/XF="IF\(S&lt;700;1;2\)"/);
 assert.match(output,/<OPAQUE DATA="untouched"\/>/);
 assert.match(output,/<UNSUPPORTED DATA="keep"\/>/);
 assert.equal(parseCorpusE3d(output).elements[0]!.boards[0]!.formulas?.XF,'IF(S<700;1;2)');
 assert.throws(()=>replaceCorpusE3dBoardFormulas(source,99,{XF:"1"}),/nije pronađena/);
 assert.throws(()=>replaceCorpusE3dBoardFormulas(source,0,{NOT_A_FIELD:"1"}),/Nepoznata/);
});


const nested=`<ELEMENTFILE><ELEMENT ENAME="Root" ESIRINA="800" EVISINA="720" EDUBINA="500"><EVAR VAR0="GAP=4"/><DASKE/><OPAQUE DATA="keep-root"/><ELMLIST><ELM ENAME="First" ESIRINA="796" ESF="S-4" EVISINA="700" EDUBINA="500"><DASKE><AD DNAME="Part" DKUT="0" XKUT="0" ZKUT="0" DXPOS="0" DYPOS="0" DZPOS="0" VISINA="200" DUBINA="100" DEBLJINA="18" SMJER="1"/></DASKE><ELMLIST><ELM ENAME="Deep" ESIRINA="398" ESF="S/2" EVISINA="300" EDUBINA="100"><EVAR VAR0="GAP=2"/><DASKE><AD DNAME="Part" DKUT="0" XKUT="0" ZKUT="0" DXPOS="0" DYPOS="0" DZPOS="0" SMJER="1" VISINA="100" DUBINA="100" DEBLJINA="18"/></DASKE></ELM></ELMLIST></ELM><ELM ENAME="Second" ESIRINA="400" ESF="S/2" EVISINA="700" EDUBINA="500"><EVAR VAR0="GAP=10"/><DASKE><AD DNAME="Part" DKUT="0" XKUT="0" ZKUT="0" DXPOS="0" DYPOS="0" DZPOS="0" SMJER="1" VISINA="200" DUBINA="100" DEBLJINA="18"/></DASKE></ELM></ELMLIST></ELEMENT></ELEMENTFILE>`;
test("podelement koristi lokalne mjere i naslijeđenu varijablu uz tačnu XML putanju",()=>{
 const root=parseCorpusE3d(nested).elements[0]!;
 const first=previewCorpusBoardFormulas(root,0,{XF:"S+GAP"},[0,0]);
 assert.equal(first.values[0],800);assert.equal(first.errors.length,0);
 const second=previewCorpusBoardFormulas(root,0,{XF:"S+GAP"},[0,1]);
 assert.equal(second.values[0],410);
 const output=applyCorpusE3dBoardFormulas(nested,0,{XF:"S+GAP"},[0,0]);
 const next=parseCorpusE3d(output).elements[0]!;
 assert.equal(next.children[0]!.boards[0]!.position[0],800);
 assert.equal(next.children[1]!.boards[0]!.formulas?.XF,undefined);
 assert.equal(next.children[1]!.boards[0]!.position[0],0);
 assert.match(output,/<OPAQUE DATA="keep-root"\/>/);
});
test("duboka putanja i shadow varijable ostaju sačuvani kroz izvoz i ciklus se odbija",()=>{
 const path=[0,0,0];
 const output=applyCorpusE3dBoardFormulas(nested,0,{XF:"S+GAP"},path);
 const next=parseCorpusE3d(output).elements[0]!;
 assert.equal(next.children[0]!.children[0]!.boards[0]!.position[0],400);
 assert.equal(next.children[0]!.boards[0]!.formulas?.XF,undefined);
 assert.throws(()=>applyCorpusE3dBoardFormulas(output,0,{XF:"self.x+1"},path),/Izraz nije primijenjen/);
 assert.throws(()=>applyCorpusE3dBoardFormulas(output,0,{XF:"1"},[0,8]),/Ploča ili polje/);
});


test("stvarni D1V Fronta/FRD koristi roditeljski ZAZOR bez prepisivanja EFRDATA",()=>{
 const child=root.children.findIndex(e=>e.name==="Fronta");
 assert.ok(child>=0);
 const path=[0,child],index=root.children[child]!.boards.findIndex(b=>b.name==="FRD");
 const preview=previewCorpusBoardFormulas(root,index,{XF:"ZAZOR_"},path);
 assert.equal(preview.values[0],4);assert.equal(preview.errors.length,0);
 const output=applyCorpusE3dBoardFormulas(xml,index,{XF:"ZAZOR_"},path);
 const next=parseCorpusE3d(output).elements[0]!.children[child]!.boards[index]!;
 assert.equal(next.position[0],4);assert.equal(next.formulas?.XF,"ZAZOR_");
 assert.deepEqual(output.match(/EFRDATA="[^"]*"/g),xml.match(/EFRDATA="[^"]*"/g));
});


import {replaceCorpusE3dElementVariables} from "../lib/corpus-s3d-writer.ts";
import {recalculateCorpusE3dVariables} from "../lib/corpus-parametric.ts";
test("promjena varijable dubokog podelementa osvježava njegovu ploču u punom kontekstu",()=>{
 const path=[0,0,0];
 const source=applyCorpusE3dBoardFormulas(nested,0,{XF:"S+GAP"},path);
 const changed=replaceCorpusE3dElementVariables(source,path,{GAP:"3"});
 const next=parseCorpusE3d(recalculateCorpusE3dVariables(changed,{rejectInvalidDimensions:true})).elements[0]!;
 assert.equal(next.children[0]!.children[0]!.boards[0]!.position[0],401);
 assert.equal(next.variables.GAP,"4");
 assert.equal(next.children[1]!.variables.GAP,"10");
});
