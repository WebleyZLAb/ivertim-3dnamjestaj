import assert from "node:assert/strict";
import test from "node:test";
import { duplicateCorpusE3dBoardCopies, positionCorpusE3dBoard, replaceCorpusE3dElementVariables } from "../lib/corpus-s3d-writer.ts";
import { parseCorpusE3d } from "../lib/corpus-s3d.ts";
import { recalculateCorpusE3dVariables } from "../lib/corpus-parametric.ts";

const source = '<ELEMENTFILE><ELEMENT ENAME="Probe" EVISINA="800" ESIRINA="800" EDUBINA="500"><EVAR VAR0="SHIFT=25"/><DASKE DCOUNT="1"><AD DNAME="A" DXPOS="25" DYPOS="100" DZPOS="0" VISINA="500" DUBINA="400" DEBLJINA="18" SMJER="2" DKUT="0" XKUT="0" ZKUT="0" XF="SHIFT" YF="100" HF="500" CUSTOM="keep"><RUPE><UNKNOWN ID="keep"/></RUPE></AD></DASKE></ELEMENT></ELEMENTFILE>';
test("offset parametric copies survive recalculation, variable change and reopening", () => {
  const copied = duplicateCorpusE3dBoardCopies(source,0,[{name:"B",position:[65,200,-10]},{name:"C",position:[5,300,0]}]);
  assert.deepEqual(parseCorpusE3d(recalculateCorpusE3dVariables(copied)).elements[0]!.boards.map(board=>board.position),[[25,100,0],[65,200,-10],[5,300,0]]);
  const changed = recalculateCorpusE3dVariables(replaceCorpusE3dElementVariables(copied,[0],{SHIFT:"40"}));
  const reopened = parseCorpusE3d(changed).elements[0]!;
  assert.deepEqual(reopened.boards.map(board=>board.position),[[40,100,0],[80,200,-10],[20,300,0]]);
  assert.equal(reopened.boards[0]!.formulas!.XF,"SHIFT");
  assert.equal(reopened.boards[1]!.formulas!.HF,"500");
  assert.equal((changed.match(/<UNKNOWN ID="keep"\/>/g)??[]).length,3);
});

test("even placement retains the original and copy offsets after later variable edits", () => {
  const expanded = duplicateCorpusE3dBoardCopies(source,0,[{name:"B",position:[125,600,0]}]);
  const positioned = positionCorpusE3dBoard(expanded,0,[5,0,0]);
  const changed = recalculateCorpusE3dVariables(replaceCorpusE3dElementVariables(positioned,[0],{SHIFT:"40"}));
  assert.deepEqual(parseCorpusE3d(changed).elements[0]!.boards.map(board=>board.position),[[20,0,0],[140,600,0]]);
  assert.throws(()=>positionCorpusE3dBoard(source,0,[NaN,0,0]),/konačne/);
  assert.throws(()=>duplicateCorpusE3dBoardCopies(source.replace('DXPOS="25"','DXPOS=""'),0,[{name:"B",position:[40,0,0]}]),/početnu koordinatu/);
});

test("offset preserves escaped conditions, unknown expressions and untouched axes", () => {
  const conditional = source.replace('XF="SHIFT"','XF="IF(SHIFT&lt;30;SHIFT;SHIFT+1)"');
  const copied = duplicateCorpusE3dBoardCopies(conditional,0,[{name:"B",position:[65,100,0]}]);
  assert.equal(parseCorpusE3d(copied).elements[0]!.boards[1]!.formulas!.YF,"100");
  assert.deepEqual(parseCorpusE3d(recalculateCorpusE3dVariables(copied)).elements[0]!.boards.map(board=>board.position[0]),[25,65]);
  const changed = recalculateCorpusE3dVariables(replaceCorpusE3dElementVariables(copied,[0],{SHIFT:"40"}));
  assert.deepEqual(parseCorpusE3d(changed).elements[0]!.boards.map(board=>board.position[0]),[41,81]);
  const unknown = duplicateCorpusE3dBoardCopies(source.replace('XF="SHIFT"','XF="CUSTOM_UNKNOWN(1)"'),0,[{name:"B",position:[65,100,0]}]);
  const board = parseCorpusE3d(recalculateCorpusE3dVariables(unknown)).elements[0]!.boards[1]!;
  assert.equal(board.position[0],65);
  assert.equal(board.formulas!.XF,"(CUSTOM_UNKNOWN(1))+(40)");
});
