import test from "node:test";
import assert from "node:assert/strict";
import { parseCorpusE3d } from "../lib/corpus-s3d.ts";
import { prepareCorpusElementVariableChange } from "../lib/corpus-element-variables.ts";
import { createCorpusWorkingCopyFile, applyCorpusWorkingCopyFile } from "../lib/corpus-model.ts";
import { writeCorpusS3dGeometryCopy } from "../lib/corpus-s3d-writer.ts";

const xml = `<ELEMENTFILE><ELEMENT ENAME="Parent" ESIRINA="800" EVISINA="800" EDUBINA="500"><EVAR VAR0="SHIFT=25"/><ELMLIST><ELM ENAME="Child" ESIRINA="500" EVISINA="500" EDUBINA="400"><EVAR VAR0="LOCAL=10"/><DASKE><AD DNAME="A" DXPOS="35" DYPOS="0" DZPOS="0" VISINA="100" DUBINA="80" DEBLJINA="18" SMJER="2" DKUT="0" XKUT="0" ZKUT="0" XF="SHIFT+LOCAL" HF="100-LOCAL" CUSTOM="keep"><OPAQUE VALUE="untouched"/></AD></DASKE></ELM></ELMLIST></ELEMENT></ELEMENTFILE>`;
const root = () => parseCorpusE3d(xml).elements[0]!;

test("S3D variable preparation recalculates descendants in parent context and preserves inputs", () => {
  const before = root(), snapshot = JSON.stringify(before);
  const after = prepareCorpusElementVariableChange(before, [0], { SHIFT: "40" });
  assert.equal(after.children[0]!.boards[0]!.position[0], 50);
  assert.equal(JSON.stringify(before), snapshot);
  const nested = prepareCorpusElementVariableChange(after, [0,0], { LOCAL: "20" });
  assert.equal(nested.children[0]!.boards[0]!.position[0], 60);
  assert.equal(nested.children[0]!.boards[0]!.height, 80);
  const output = writeCorpusS3dGeometryCopy(xml, [before], [nested]);
  const reopened = parseCorpusE3d(output).elements[0]!;
  assert.equal(reopened.children[0]!.boards[0]!.position[0], 60);
  assert.equal(reopened.children[0]!.boards[0]!.height, 80);
  assert.match(output, /<OPAQUE VALUE="untouched"\/>/);
  assert.equal(reopened.children[0]!.boards[0]!.formulas!.XF, "SHIFT+LOCAL");
  const copy = createCorpusWorkingCopyFile("test.s3d", [before], [nested], "");
  const restored = applyCorpusWorkingCopyFile("test.s3d", [before], copy);
  assert.equal(restored[0]!.children[0]!.boards[0]!.position[0], 60);
});

test("invalid dimensions, missing paths, renamed variables and locked ancestors reject atomically", () => {
  const before = root(), snapshot = JSON.stringify(before);
  assert.throws(() => prepareCorpusElementVariableChange(before, [0,0], { LOCAL: "101" }), /nedozvoljenu/);
  assert.throws(() => prepareCorpusElementVariableChange(before, [0,1], {}), /nije pronađen/);
  assert.throws(() => prepareCorpusElementVariableChange(before, [0], { OTHER: "40" }), /postojećih/);
  assert.throws(() => prepareCorpusElementVariableChange({...before, locked:true}, [0,0], {LOCAL:"20"}), /zaključan/);
  assert.equal(JSON.stringify(before), snapshot);
});


import { parseCorpusS3d } from "../lib/corpus-s3d.ts";
import { replaceCorpusE3dBoardContour } from "../lib/corpus-s3d-writer.ts";

const rectangleSource = () => replaceCorpusE3dBoardContour(xml, 0, [{x:0,z:0},{x:100,z:0},{x:100,z:80},{x:0,z:80}], [0,0]).replace('<ELEMENTFILE>', '<PROJECTFILE VER="17"><SOBA/>').replace('</ELEMENTFILE>','</PROJECTFILE>');

test("S3D rectangle dimensions and contour survive JSON recovery and source export together", () => {
  const source = rectangleSource();
  const before = parseCorpusS3d(source).elements[0]!;
  const after = prepareCorpusElementVariableChange(before,[0,0],{LOCAL:"20"});
  const board = after.children[0]!.boards[0]!;
  assert.equal(board.height,80);
  assert.deepEqual(board.curvePoints.map(p=>[p.x,p.z]),[[0,0],[80,0],[80,80],[0,80]]);
  const copy = createCorpusWorkingCopyFile("test.s3d",[before],[after],"");
  assert.equal(copy.version,11);
  assert.equal(copy.boardContourChanges.length,1);
  const restored = applyCorpusWorkingCopyFile("test.s3d",[before],JSON.parse(JSON.stringify(copy)));
  assert.deepEqual(restored[0]!.children[0]!.boards[0]!.curvePoints,board.curvePoints);
  const output = writeCorpusS3dGeometryCopy(source,[before],restored);
  const reopened = parseCorpusS3d(output).elements[0]!.children[0]!.boards[0]!;
  assert.deepEqual(reopened.curvePoints,board.curvePoints);
  assert.equal(reopened.height,80);
  assert.equal(reopened.position[0],45);
  assert.match(output,/<OPAQUE VALUE="untouched"\/>/);
  assert.match(output,/CUSTOM="keep"/);
  assert.equal(writeCorpusS3dGeometryCopy(output,parseCorpusS3d(output).elements,parseCorpusS3d(output).elements),output);
});

test("contour recovery rejects stale baseline, invalid points and omitted v11 changes; v10 remains readable", () => {
  const before = parseCorpusS3d(rectangleSource()).elements[0]!;
  const after = prepareCorpusElementVariableChange(before,[0,0],{LOCAL:"20"});
  const copy = createCorpusWorkingCopyFile("test.s3d",[before],[after],"");
  const stale = structuredClone(copy);
  stale.boardContourChanges[0]!.before[1]!.x=99;
  assert.throws(()=>applyCorpusWorkingCopyFile("test.s3d",[before],stale),/Kontura/);
  const invalid = structuredClone(copy);
  invalid.boardContourChanges[0]!.after[0]!.x=NaN;
  assert.throws(()=>applyCorpusWorkingCopyFile("test.s3d",[before],invalid),/podržane verzije/);
  const curved = structuredClone(copy);
  curved.boardContourChanges[0]!.after[0]!.style=1;
  assert.throws(()=>applyCorpusWorkingCopyFile("test.s3d",[before],curved),/podržane verzije/);
  const {boardContourChanges,...rest}=copy;
  assert.throws(()=>applyCorpusWorkingCopyFile("test.s3d",[before],rest),/podržane verzije/);
  assert.doesNotThrow(()=>applyCorpusWorkingCopyFile("test.s3d",[before],{...rest,version:10}));
});

test("unknown formulas and nonrectangular contours keep their saved data during S3D variable changes", () => {
  const source = replaceCorpusE3dBoardContour(xml,0,[{x:0,z:0},{x:100,z:0},{x:70,z:80},{x:0,z:80}],[0,0]).replace('XF="SHIFT+LOCAL"','XF="UNKNOWN(LOCAL)"');
  const before = parseCorpusE3d(source).elements[0]!;
  const after = prepareCorpusElementVariableChange(before,[0,0],{LOCAL:"20"});
  const board = after.children[0]!.boards[0]!;
  assert.equal(board.position[0],35);
  assert.equal(board.formulas!.XF,"UNKNOWN(LOCAL)");
  assert.deepEqual(board.curvePoints,before.children[0]!.boards[0]!.curvePoints);
  assert.equal(createCorpusWorkingCopyFile("test.s3d",[before],[after],"").boardContourChanges.length,0);
});

test("contour recovery rejects geometry that cannot be exported or disagrees with board dimensions", () => {
  const before = parseCorpusS3d(rectangleSource()).elements[0]!;
  const after = prepareCorpusElementVariableChange(before,[0,0],{LOCAL:"20"});
  const copy = createCorpusWorkingCopyFile("test.s3d",[before],[after],"");
  for (const kind of ["crossed","duplicate","index","size"] as const) {
    const bad = structuredClone(copy);
    const points = bad.boardContourChanges[0]!.after;
    if (kind === "crossed") [points[1],points[2]]=[points[2]!,points[1]!];
    if (kind === "duplicate") {points[1]!.x=0;points[1]!.z=0;}
    if (kind === "index") points[1]!.index=0;
    if (kind === "size") {points[1]!.x=81;points[2]!.x=81;}
    assert.throws(()=>applyCorpusWorkingCopyFile("test.s3d",[before],bad),/podržane verzije|ne odgovara mjerama/);
  }
});

test("a variable change cannot create zero dimensions that make the working copy unreadable", () => {
  const before = root();
  assert.throws(() => prepareCorpusElementVariableChange(before,[0,0],{LOCAL:"100"}), /dimenzij|mjer/);
});

import { readFileSync } from "node:fs";
import { decodeCorpusText } from "../lib/corpus-macro.ts";

test("real D1V hidden PLAFON with a zero formula rejects the S3D edit without source mutation", () => {
  const source = decodeCorpusText(readFileSync("public/local-corpus/Elmsav/_____PUSTI PRIJE SVEGA/D1V.E3D"));
  const before = parseCorpusE3d(source).elements[0]!;
  const snapshot = JSON.stringify(before);
  const top = before.boards.find(board => board.name === "PLAFON")!;
  assert.equal(top.height,602);
  assert.equal(top.visible,false);
  assert.throws(() => prepareCorpusElementVariableChange(before,[0],{...before.variables,ZAZOR_:"8"}), /PLAFON.*pozitivne dimenzije/);
  assert.equal(JSON.stringify(before),snapshot);
});

import { recalculateCorpusE3dVariables } from "../lib/corpus-parametric.ts";
import { replaceCorpusE3dElementVariables } from "../lib/corpus-s3d-writer.ts";
const withoutContourCoordinates = (source: string) => (source.match(/<KRIVULJE\b[^>]*>/g) ?? []).map(tag => tag.replace(/((?:&quot;|&#34;|&#x22;|")PT[XZ]=)(.*?)(?=&quot;|&#34;|&#x22;|")/gi,"$1COORD"));

test("actual D1V automatic contour updates preserve every noncoordinate contour byte and machining record", () => {
  const source = decodeCorpusText(readFileSync("public/local-corpus/Elmsav/_____PUSTI PRIJE SVEGA/D1V.E3D"));
  const before = parseCorpusE3d(source).elements[0]!;
  const variables={...before.variables,TIP_PLAFONA:"1"};
  const after=prepareCorpusElementVariableChange(before,[0],variables);
  const copy=createCorpusWorkingCopyFile("D1V.s3d",[before],[after],"");
  assert.equal(copy.boardContourChanges.length,3);
  const restored=applyCorpusWorkingCopyFile("D1V.s3d",[before],JSON.parse(JSON.stringify(copy)));
  const output=writeCorpusS3dGeometryCopy(source,[before],restored);
  assert.deepEqual(withoutContourCoordinates(output),withoutContourCoordinates(source));
  assert.equal((output.match(/CURVEDATA=/g)??[]).length,27);
  assert.deepEqual(output.match(/EFRDATA="[^"]*"/g),source.match(/EFRDATA="[^"]*"/g));
  assert.deepEqual(output.match(/<RUPE\b[^>]*\/>|<RUPE\b[^>]*>[\s\S]*?<\/RUPE>/g),source.match(/<RUPE\b[^>]*\/>|<RUPE\b[^>]*>[\s\S]*?<\/RUPE>/g));
  const e3d=recalculateCorpusE3dVariables(replaceCorpusE3dElementVariables(source,[0],variables),{rejectInvalidDimensions:true});
  assert.deepEqual(withoutContourCoordinates(e3d),withoutContourCoordinates(source));
});

test("automatic rectangle updates preserve point order, contour attributes and opaque child data", () => {
  let source=replaceCorpusE3dBoardContour(xml,0,[{x:100,z:80},{x:100,z:0},{x:0,z:0},{x:0,z:80}],[0,0]);
  source=source.replace('<KRIVULJE DATA="','<KRIVULJE EXTRA="keep" DATA="&quot;CURVEDATA=opaque&quot;,').replace(/(<KRIVULJE\b[^>]*?)\/>/,'$1><EXTRA KEEP="yes"/></KRIVULJE>');
  const before=parseCorpusE3d(source).elements[0]!;
  const after=prepareCorpusElementVariableChange(before,[0,0],{LOCAL:"20"});
  const points=after.children[0]!.boards[0]!.curvePoints;
  assert.deepEqual(points.map(p=>[p.x,p.z]),[[80,80],[80,0],[0,0],[0,80]]);
  const output=writeCorpusS3dGeometryCopy(source,[before],[after]);
  assert.deepEqual(withoutContourCoordinates(output),withoutContourCoordinates(source));
  assert.match(output,/<EXTRA KEEP="yes"\/><\/KRIVULJE>/);
  assert.deepEqual(parseCorpusE3d(output).elements[0]!.children[0]!.boards[0]!.curvePoints,points);
});

test("repeated D1V variable changes survive JSON and XML cycles without losing contour metadata", () => {
  const original=decodeCorpusText(readFileSync("public/local-corpus/Elmsav/_____PUSTI PRIJE SVEGA/D1V.E3D"));
  let source=original;
  for(const gap of [8,4,12,4]) {
    const before=parseCorpusE3d(source).elements[0]!;
    const after=prepareCorpusElementVariableChange(before,[0],{...before.variables,TIP_PLAFONA:"1",ZAZOR_:String(gap)});
    const copy=createCorpusWorkingCopyFile("cycle.s3d",[before],[after],"");
    const restored=applyCorpusWorkingCopyFile("cycle.s3d",[before],JSON.parse(JSON.stringify(copy)));
    source=writeCorpusS3dGeometryCopy(source,[before],restored);
    const reopened=parseCorpusE3d(source).elements[0]!;
    assert.equal(reopened.variables.ZAZOR_,String(gap));
    assert.deepEqual(withoutContourCoordinates(source),withoutContourCoordinates(original));
    assert.equal((source.match(/CURVEDATA=/g)??[]).length,27);
    assert.deepEqual(source.match(/<RUPE\b[^>]*\/>|<RUPE\b[^>]*>[\s\S]*?<\/RUPE>/g),original.match(/<RUPE\b[^>]*\/>|<RUPE\b[^>]*>[\s\S]*?<\/RUPE>/g));
  }
});

test("a new contour cannot touch a nonadjacent edge without crossing it", () => {
  assert.throws(()=>replaceCorpusE3dBoardContour(xml,0,[{x:0,z:0},{x:100,z:0},{x:100,z:100},{x:50,z:0},{x:0,z:100}],[0,0]),/presijecati/);
});

test("collinear consecutive contour segments remain valid", () => {
  const output=replaceCorpusE3dBoardContour(xml,0,[{x:0,z:0},{x:50,z:0},{x:100,z:0},{x:100,z:80},{x:0,z:80}],[0,0]);
  assert.equal(parseCorpusE3d(output).elements[0]!.children[0]!.boards[0]!.curvePoints.length,5);
});
