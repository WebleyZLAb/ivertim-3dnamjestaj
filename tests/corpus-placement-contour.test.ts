import test from "node:test";
import assert from "node:assert/strict";
import { parseCorpusE3d } from "../lib/corpus-s3d.ts";
import { prepareCorpusBoardPlacement } from "../lib/corpus-board-placement-formulas.ts";
import { corpusTranslatedBoard } from "../lib/corpus-board-group.ts";
import { replaceCorpusE3dBoardContour, writeCorpusE3dGeometryCopy } from "../lib/corpus-s3d-writer.ts";
import { createCorpusWorkingCopyFile, applyCorpusWorkingCopyFile } from "../lib/corpus-model.ts";

// Model-only positioning is used by native S3D roots and descendants.
test("model placement rebuilds a rectangle when its dimension depends on the moved coordinate", () => {
  const source = replaceCorpusE3dBoardContour(`<ELEMENTFILE><ELEMENT ENAME="Root" ESIRINA="800" EVISINA="800" EDUBINA="500"><EVAR VAR0="SHIFT=25"/><DASKE><AD DNAME="A" DXPOS="25" DYPOS="0" DZPOS="0" VISINA="100" DUBINA="80" DEBLJINA="18" SMJER="2" DKUT="0" XKUT="0" ZKUT="0" XF="SHIFT" HF="A.x+75"><OPAQUE KEEP="yes"/></AD></DASKE></ELEMENT></ELEMENTFILE>`,0,[{x:0,z:0},{x:100,z:0},{x:100,z:80},{x:0,z:80}]);
  const before=parseCorpusE3d(source).elements[0]!;
  const {resolved}=prepareCorpusBoardPlacement(before,corpusTranslatedBoard(before,0,[40,0,0]));
  assert.equal(resolved.boards[0]!.height,140);
  assert.deepEqual(resolved.boards[0]!.curvePoints.map(p=>[p.x,p.z]),[[0,0],[140,0],[140,80],[0,80]]);
  const copy=createCorpusWorkingCopyFile("placement.s3d",[before],[resolved],"");
  const restored=applyCorpusWorkingCopyFile("placement.s3d",[before],JSON.parse(JSON.stringify(copy)));
  const xml=writeCorpusE3dGeometryCopy(source,[before],restored);
  const reopened=parseCorpusE3d(xml).elements[0]!.boards[0]!;
  assert.equal(reopened.height,140);
  assert.deepEqual(reopened.curvePoints,resolved.boards[0]!.curvePoints);
  assert.match(xml,/<OPAQUE KEEP="yes"\/>/);
});
