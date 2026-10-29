import assert from "node:assert/strict";
import test from "node:test";
import { parseCorpusS3d, type CorpusS3dElement, type CorpusS3dBoard } from "../lib/corpus-s3d.ts";
import { createCorpusWorkingCopyFile, applyCorpusWorkingCopyProject } from "../lib/corpus-model.ts";
import { createCorpusRecoverySnapshot, parseCorpusRecoverySnapshot } from "../lib/corpus-recovery.ts";
import { writeCorpusS3dGeometryCopy } from "../lib/corpus-s3d-writer.ts";
import { prepareCorpusBoardPlacement } from "../lib/corpus-board-placement-formulas.ts";
import { corpusTranslatedBoards } from "../lib/corpus-board-group.ts";
import { recalculateCorpusBoards } from "../lib/corpus-parametric.ts";

const board=(name:string,x:number,formula:string)=>`<AD DNAME="${name}" DXPOS="${x}" DYPOS="0" DZPOS="0" VISINA="100" DUBINA="80" DEBLJINA="18" SMJER="2" DKUT="0" XKUT="0" ZKUT="0" XF="${formula}" CUSTOM="keep"><OPAQUE value="unchanged"/></AD>`;
const xml=`<PROJECTFILE VER="17"><SOBA SIRINA="5000" DUZINA="4000" VISINA="2600"/><ELEMENT ENAME="Parent" EVISINA="1000" ESIRINA="1000" EDUBINA="500"><EVAR VAR0="SHIFT=25"/><ELMLIST><ELM ENAME="Child"><DASKE>${board("A",25,"SHIFT")}${board("B",125,"A.x+100")}</DASKE></ELM></ELMLIST></ELEMENT></PROJECTFILE>`;
const fixture=()=>{
  const project=parseCorpusS3d(xml),root=project.elements[0]!,child=root.children[0]!;
  const {resolved}=prepareCorpusBoardPlacement(root,corpusTranslatedBoards(child,[0,1],[40,0,0]),[0,0]);
  return {project,root,resolved};
};

test("nested S3D placement uses inherited variables and persists numbers plus formulas through JSON recovery",()=>{
  const {project,root,resolved}=fixture();
  assert.deepEqual(resolved.children[0]!.boards.map(board=>board.position[0]),[65,165]);
  assert.equal(root.children[0]!.boards[0]!.formulas!.XF,"SHIFT");
  const copy=createCorpusWorkingCopyFile("nested.S3D",project.elements,[resolved]);
  assert.equal(copy.version,10);
  assert.equal(copy.boardFormulaChanges.length,1);
  assert.deepEqual(copy.boardFormulaChanges[0]!.elementPath,[0,0]);
  const snapshot=parseCorpusRecoverySnapshot(JSON.parse(JSON.stringify(createCorpusRecoverySnapshot("nested.S3D",xml.length,xml,copy))));
  const restored=applyCorpusWorkingCopyProject("nested.S3D",project.elements,project.room,snapshot.workingCopy);
  assert.deepEqual(restored.elements,[resolved]);
  const changed=recalculateCorpusBoards({...restored.elements[0]!,variables:{SHIFT:"40"}});
  assert.deepEqual(changed.children[0]!.boards.map(board=>board.position[0]),[80,180]);
});

test("S3D export writes exact child formulas and preserves unknown XML",()=>{
  const {project,resolved}=fixture();
  const output=writeCorpusS3dGeometryCopy(xml,project.elements,[resolved]);
  const reopened=parseCorpusS3d(output).elements[0]!;
  assert.equal(reopened.children[0]!.boards[0]!.formulas!.XF,"(SHIFT)+(40)");
  assert.equal(reopened.children[0]!.boards[1]!.formulas!.XF,"A.x+100");
  assert.equal((output.match(/<OPAQUE value="unchanged"\/>/g)??[]).length,2);
  assert.deepEqual(recalculateCorpusBoards({...reopened,variables:{SHIFT:"40"}}).children[0]!.boards.map(board=>board.position[0]),[80,180]);
});

test("formula-only edits and removals survive export without rewriting other board attributes",()=>{
  const project=parseCorpusS3d(xml),root=project.elements[0]!,child=root.children[0]!;
  const edited:CorpusS3dElement={...root,children:[{...child,boards:child.boards.map<CorpusS3dBoard>((board,index)=>index===0?{...board,formulas:{XF:"IF(SHIFT<30;SHIFT;40)"}}:{...board,formulas:{} as Record<string,string>})}]};
  const copy=createCorpusWorkingCopyFile("nested.S3D",project.elements,[edited]);
  assert.equal(copy.boardChanges.length,0);
  assert.equal(copy.boardFormulaChanges.length,2);
  const output=writeCorpusS3dGeometryCopy(xml,project.elements,[edited]);
  const boards=parseCorpusS3d(output).elements[0]!.children[0]!.boards;
  assert.equal(boards[0]!.formulas!.XF,"IF(SHIFT<30;SHIFT;40)");
  assert.equal(boards[1]!.formulas!.XF,undefined);
  assert.match(output,/XF="IF\(SHIFT&lt;30;SHIFT;40\)"/);
  assert.equal((output.match(/CUSTOM="keep"/g)??[]).length,2);
});

test("v10 validates formula patches and stale baselines while legacy v9 remains readable",()=>{
  const {project,resolved}=fixture();
  const copy=createCorpusWorkingCopyFile("nested.S3D",project.elements,[resolved]);
  const newer=parseCorpusS3d(xml.replace('XF="SHIFT"','XF="SHIFT+1"'));
  assert.throws(()=>applyCorpusWorkingCopyProject("nested.S3D",newer.elements,newer.room,copy),/Izrazi ploče/);
  const malformed={...copy,boardFormulaChanges:[{...copy.boardFormulaChanges[0]!,after:{NOT_A_FORMULA:"1"}}]};
  assert.throws(()=>applyCorpusWorkingCopyProject("nested.S3D",project.elements,project.room,malformed),/podržane verzije/);
  const missing={...copy,boardFormulaChanges:undefined};
  assert.throws(()=>applyCorpusWorkingCopyProject("nested.S3D",project.elements,project.room,missing),/podržane verzije/);
  const legacy={...createCorpusWorkingCopyFile("nested.S3D",project.elements,project.elements),version:9,boardFormulaChanges:undefined};
  assert.deepEqual(applyCorpusWorkingCopyProject("nested.S3D",project.elements,project.room,legacy).elements,project.elements);
});
