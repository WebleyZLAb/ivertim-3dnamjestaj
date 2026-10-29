import { applyCorpusE3dBoardPlacement } from "../lib/corpus-board-placement-formulas.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { parseCorpusE3d } from "../lib/corpus-s3d.ts";
import { replaceCorpusE3dElementVariables } from "../lib/corpus-s3d-writer.ts";
import { recalculateCorpusE3dVariables } from "../lib/corpus-parametric.ts";
import { corpusTranslatedBoards, corpusTranslatedBoard, corpusAlignedBoardsToAnchor, corpusEvenlyDistributedBoards, corpusPlacedBoardsInElement } from "../lib/corpus-board-group.ts";

const board=(name:string,x:number,formula:string)=>`<AD DNAME="${name}" DXPOS="${x}" DYPOS="0" DZPOS="0" VISINA="100" DUBINA="80" DEBLJINA="18" SMJER="2" DKUT="0" XKUT="0" ZKUT="0" XF="${formula}" CUSTOM="keep"/>`;
const source=`<ELEMENTFILE><ELEMENT ENAME="Placement" EVISINA="800" ESIRINA="1000" EDUBINA="500"><EVAR VAR0="SHIFT=25"/><DASKE DCOUNT="3">${board("A",25,"SHIFT")}${board("B",125,"A.x+100")}${board("C",500,"500")}</DASKE></ELEMENT></ELEMENTFILE>`;
test("group translation survives recalculation without double shifting internal dependencies",()=>{
  const before=parseCorpusE3d(source).elements[0]!;
  const requested=corpusTranslatedBoards(before,[0,1],[40,0,0]);
  const xml=applyCorpusE3dBoardPlacement(source,requested);
  assert.deepEqual(parseCorpusE3d(recalculateCorpusE3dVariables(xml)).elements[0]!.boards.map(board=>board.position[0]),[65,165,500]);
  const changed=recalculateCorpusE3dVariables(replaceCorpusE3dElementVariables(xml,[0],{SHIFT:"40"}));
  const reopened=parseCorpusE3d(changed).elements[0]!;
  assert.deepEqual(reopened.boards.map(board=>board.position[0]),[80,180,500]);
  assert.equal(reopened.boards[1]!.formulas!.XF,"A.x+100");
  assert.equal((changed.match(/CUSTOM="keep"/g)??[]).length,3);
});

test("selected dependencies keep working through an unselected intermediate board",()=>{
  const xml=source.replace('XF="500"','XF="B.x+375"');
  const before=parseCorpusE3d(xml).elements[0]!;
  const requested=corpusTranslatedBoards(before,[0,2],[40,0,0]);
  const result=parseCorpusE3d(applyCorpusE3dBoardPlacement(xml,requested)).elements[0]!;
  assert.deepEqual(result.boards.map(board=>board.position[0]),[65,165,540]);
  assert.equal(result.boards[2]!.formulas!.XF,"B.x+375");
});

test("position commands preserve other axes even when their expressions depend on the moved axis",()=>{
  const xml=source.replace('DNAME="A" DXPOS="25" DYPOS="0"','DNAME="A" DXPOS="25" YF="A.x-25" DYPOS="0"');
  const before=parseCorpusE3d(xml).elements[0]!;
  const result=parseCorpusE3d(applyCorpusE3dBoardPlacement(xml,corpusTranslatedBoards(before,[0,1],[40,0,0]))).elements[0]!;
  assert.deepEqual(result.boards[0]!.position,[65,0,0]);
  assert.equal(result.boards[0]!.formulas!.YF,"(A.x-25)+(-40)");
});

test("unknown expressions retain target numbers, source expressions and immutable inputs",()=>{
  const xml=source.replace('XF="SHIFT"','XF="CUSTOM_UNKNOWN(1)"');
  const before=parseCorpusE3d(xml).elements[0]!;
  const snapshot=JSON.stringify(before);
  const requested=corpusTranslatedBoards(before,[0,1],[40,0,0]);
  const result=parseCorpusE3d(applyCorpusE3dBoardPlacement(xml,requested)).elements[0]!;
  assert.deepEqual(result.boards.map(board=>board.position[0]),[65,165,500]);
  assert.equal(result.boards[0]!.formulas!.XF,"(CUSTOM_UNKNOWN(1))+(40)");
  assert.equal(JSON.stringify(before),snapshot);
});

test("alignment, distribution, placement and single-board moves survive variable changes",()=>{
  const before=parseCorpusE3d(source).elements[0]!;
  const cases=[
    {requested:corpusAlignedBoardsToAnchor(before,[0,1],"x","max"),expected:[40,40,500]},
    {requested:corpusEvenlyDistributedBoards(before,[0,1,2],"x").element,expected:[40,277.5,500]},
    {requested:corpusPlacedBoardsInElement(before,[0,1],"x","max",0).element,expected:[815,915,500]},
    {requested:corpusTranslatedBoard(before,0,[40,0,0]),expected:[80,180,500]},
  ];
  for(const {requested,expected} of cases){
    const positioned=applyCorpusE3dBoardPlacement(source,requested);
    const changed=recalculateCorpusE3dVariables(replaceCorpusE3dElementVariables(positioned,[0],{SHIFT:"40"}));
    assert.deepEqual(parseCorpusE3d(changed).elements[0]!.boards.map(board=>board.position[0]),expected);
  }
});
