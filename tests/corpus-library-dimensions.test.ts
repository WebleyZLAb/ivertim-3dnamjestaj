import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {decodeCorpusText} from "../lib/corpus-macro.ts";
import {parseCorpusE3d} from "../lib/corpus-s3d.ts";
import {prepareCorpusLibraryDimensions,CorpusLibraryResizeError} from "../lib/corpus-library-dimensions.ts";
import {replaceCorpusE3dBoardContour,writeCorpusE3dGeometryCopy} from "../lib/corpus-s3d-writer.ts";
const read=(name:string)=>decodeCorpusText(readFileSync(`public/local-corpus/Elmsav/${name}`));
const shelf=read("Wardrobe/Accessories/POLICA.E3D"),d1v=read("_____PUSTI PRIJE SVEGA/D1V.E3D");
test("stvarna bibliotečka POLICA mijenja mjere, zadržava formule i obnavlja konturu prije umetanja",()=>{
 const root=parseCorpusE3d(shelf).elements[0]!;
 const prepared=prepareCorpusLibraryDimensions(shelf,{width:1200,height:18,depth:600});
 assert.equal(prepared.changed,true);
 assert.equal(prepared.element.width,1200);assert.equal(prepared.element.depth,600);
 const board=prepared.element.boards[0]!;
 assert.equal(board.height,1200);assert.equal(board.width,600);assert.equal(board.thickness,18);
 assert.deepEqual(board.formulas,root.boards[0]!.formulas);
 assert.equal(board.materialUid,root.boards[0]!.materialUid);
 assert.deepEqual(board.holes,root.boards[0]!.holes);assert.deepEqual(board.consumables,root.boards[0]!.consumables);
 assert.deepEqual(board.curvePoints.map(p=>[p.x,p.z]),[[0,0],[1200,0],[1200,600],[0,600]]);
 assert.deepEqual(parseCorpusE3d(prepared.sourceXml).elements[0],prepared.element);
});
test("izvorne mjere vraćaju potpuno isti tekst i dozvoljavaju originalni D1V",()=>{
 const root=parseCorpusE3d(d1v).elements[0]!;
 assert.equal(prepareCorpusLibraryDimensions(d1v).sourceXml,d1v);
 const same=prepareCorpusLibraryDimensions(d1v,{width:root.width!,height:root.height!,depth:root.depth!});
 assert.equal(same.changed,false);assert.equal(same.sourceXml,d1v);
});
test("D1V resize jasno odbija neriješeni CLR kontekst, ne vraća djelimično preračunat izvoz",()=>{
 assert.throws(()=>prepareCorpusLibraryDimensions(d1v,{width:800,height:900,depth:600}),(error:unknown)=>{
  assert.ok(error instanceof CorpusLibraryResizeError);assert.equal(error.issues.length,4);
  assert.ok(error.issues.every(issue=>issue.boardName==="FRD"));return true;
 });
});
test("resize odbija nepravougaonu konturu, nevažeće mjere i zaključan izvor",()=>{
 const root=parseCorpusE3d(shelf).elements[0]!,board=root.boards[0]!;
 const custom=replaceCorpusE3dBoardContour(shelf,0,[{x:0,z:0},{x:board.height!,z:0},{x:board.height!/2,z:board.width!}]);
 assert.throws(()=>prepareCorpusLibraryDimensions(custom,{width:1200,height:18,depth:600}),/Kontura ploče/);
 assert.equal(prepareCorpusLibraryDimensions(custom).sourceXml,custom);
 assert.throws(()=>prepareCorpusLibraryDimensions(shelf,{width:0,height:18,depth:600}),/pozitivni brojevi/);
 const locked=writeCorpusE3dGeometryCopy(shelf,[root],[{...root,locked:true}]);
 assert.throws(()=>prepareCorpusLibraryDimensions(locked,{width:1200,height:18,depth:600}),/zaključan/);
});


test("stvarni PLAFON_PLATA sa višerječnim imenima prolazi bibliotečki resize bez gubitka izraza",()=>{
 const xml=read("_OSTALO/PLAFON_PLATA.E3D");
 const prepared=prepareCorpusLibraryDimensions(xml,{width:1500,height:36,depth:650});
 assert.equal(prepared.element.boards.length,5);
 assert.deepEqual(prepared.element.boards.map(b=>[b.height,b.width,b.thickness]),[[1500,650,18],[1500,100,18],[1500,100,18],[450,100,18],[450,100,18]]);
 assert.equal(prepared.element.boards[0]!.position[1],18);
 assert.equal(prepared.element.boards[0]!.formulas?.YF,"bok za platu.debljina");
 assert.deepEqual(prepared.element.boards[0]!.curvePoints.map(p=>[p.x,p.z]),[[0,0],[1500,0],[1500,650],[0,650]]);
});
