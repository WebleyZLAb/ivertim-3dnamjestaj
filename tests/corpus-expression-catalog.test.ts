import test from "node:test";
import assert from "node:assert/strict";
import {evaluateCorpusExpression} from "../lib/corpus-expression.ts";
import {corpusExpressionFunctions,corpusExpressionReferences} from "../lib/corpus-expression-catalog.ts";
import {parseCorpusE3d} from "../lib/corpus-s3d.ts";
import {previewCorpusBoardFormulas} from "../lib/corpus-board-formulas.ts";
const root=parseCorpusE3d(`<ELEMENTFILE><ELEMENT ENAME="Test" ESIRINA="800" EVISINA="720" EDUBINA="500" EXPOX="0" EYPOS="0" EZPOS="0"><EVAR VAR0="ZAZOR=4"/><DASKE><AD DNAME="Lijevi_bok" DXPOS="0" DYPOS="0" DZPOS="0" VISINA="720" DUBINA="500" DEBLJINA="18" SMJER="0" DKUT="0" XKUT="0" ZKUT="0"/><AD DNAME="PLAFON" DXPOS="0" DYPOS="702" DZPOS="0" VISINA="764" DUBINA="500" DEBLJINA="18" SMJER="2" DKUT="0" XKUT="0" ZKUT="0"/></DASKE></ELEMENT></ELEMENTFILE>`).elements[0]!;
test("svaki ponuđeni primjer radi u stvarnom evaluatoru",()=>{
 const expected:Record<string,number>={IF:18,MIN:600,MAX:500,ABS:18,ROUND:19,SIN:50,COS:50,DEGTORAD:Math.PI,RADTODEG:90,SQR:144,SQRT:12,TRUNC:-18,ARCCOS:60,ARCSIN:30,ARCTAN:45,ATAN:45,LN:2,LOG10:3,LOGN:3,EXP:1};
 for(const fn of corpusExpressionFunctions) { const value=evaluateCorpusExpression(fn.example,{S:800,D:500}); assert.equal(typeof value,"number",fn.name); assert.ok(Math.abs(Number(value)-expected[fn.name]!)<1e-10,fn.name); }
});
test("kataloška referenca boka i varijable prolazi kroz isti geometrijski graf",()=>{
 const refs=corpusExpressionReferences(root);
 for(const [expression,value] of [["Lijevi_bok.DEBLJINA",18],["Lijevi_bok.AABB.XMAX",18],["ZAZOR",4]] as const) {
  assert.ok(refs.some(ref=>ref.expression===expression));
  const result=previewCorpusBoardFormulas(root,1,{XF:expression});
  assert.equal(result.errors.length,0);assert.equal(result.values[0],value);
 }
});
test("ne nudi dvosmislene ploče niti AABB rotirane ploče, lokalna varijabla ima prvenstvo",()=>{
 const duplicate={...root,boards:[...root.boards,{...root.boards[0]!,name:"lijevi_BOK"}]};
 assert.equal(corpusExpressionReferences(duplicate).some(ref=>ref.expression.toUpperCase().startsWith("LIJEVI_BOK.")),false);
 const rotated={...root,boards:root.boards.map((board,i)=>i===0?{...board,angle:45}:board),variables:{...root.variables,S:"700"}};
 const refs=corpusExpressionReferences(rotated);
 assert.equal(refs.some(ref=>ref.expression==="Lijevi_bok.AABB.XMAX"),false);
 assert.equal(refs.filter(ref=>ref.expression.toUpperCase()==="S").length,1);
 assert.equal(refs.find(ref=>ref.expression==="S")!.category,"Varijable");
});


test("naslijeđene reference se nude uz ispravno prvenstvo bližeg i lokalnog opsega",()=>{
 const parent={...root,name:"Parent",variables:{GAP:"4",PARENT_ONLY:"8"}};
 const child={...root,name:"Child",boards:[],variables:{GAP:"2"}};
 const refs=corpusExpressionReferences(child,[parent]);
 assert.equal(refs.find(ref=>ref.expression==="PARENT_ONLY")!.category,"Naslijeđeno");
 assert.equal(refs.find(ref=>ref.expression==="GAP")!.category,"Varijable");
 assert.equal(refs.filter(ref=>ref.expression.toUpperCase()==="S").length,1);
 assert.equal(refs.find(ref=>ref.expression==="S")!.category,"Element");
});


test("katalog nudi podržano višerječno ime i referenca radi u istom grafu",()=>{
 const element={...root,boards:root.boards.map((b,i)=>i===0?{...b,name:"Lijevi bok"}:b)};
 const ref=corpusExpressionReferences(element).find(ref=>ref.expression==="Lijevi bok.DEBLJINA");
 assert.ok(ref);assert.equal(previewCorpusBoardFormulas(element,1,{XF:ref.expression}).values[0],18);
});
