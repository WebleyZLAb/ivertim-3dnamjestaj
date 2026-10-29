import { createCorpusWorkingCopyFile, applyCorpusWorkingCopyProject } from "../lib/corpus-model.ts";
import { createCorpusRecoverySnapshot, parseCorpusRecoverySnapshot } from "../lib/corpus-recovery.ts";
import { writeCorpusE3dGeometryCopy } from "../lib/corpus-s3d-writer.ts";
import assert from "node:assert/strict";
import test from "node:test";
import { prepareCorpusGroupVariableChange, type CorpusGroupVariableTarget } from "../lib/corpus-group-variables.ts";
import { parseCorpusE3d, parseCorpusS3d } from "../lib/corpus-s3d.ts";

function target(index:number,name:string,variable="OFFSET",width=600):CorpusGroupVariableTarget {
  const sourceXml=`<ELEMENTFILE VER="17"><ELEMENT ENAME="${name}" EXPOX="${index*700}" EYPOS="0" EZPOS="0" ESIRINA="${width}" EVISINA="720" EDUBINA="560" EKUT="0" EXKUT="0" EZKUT="0" CUSTOM="preserve"><EVAR VAR0="${variable}=25"/><DASKE><AD DNAME="Bok" DXPOS="25" DYPOS="0" DZPOS="0" XF="${variable}" VISINA="720" DUBINA="560" DEBLJINA="18" SMJER="0" DKUT="0" XKUT="0" ZKUT="0" MATUID="M1"><RUPE><GRUPA14 RNA="H" RXP="30" RYP="40" RFI="5" RDU="8" RPL="1" RAA="0" CUSTOM="hole"/></RUPE><PRIVATE VALUE="keep"/></AD></DASKE></ELEMENT></ELEMENTFILE>`;
  const element=parseCorpusE3d(sourceXml).elements[0]!;
  return {rootIndex:index,element,source:{sourceFile:`${name}.E3D`,sourceXml,originalElement:element}};
}

test("priprema dvije izričite mete, čuva njihove položaje, formule i nepoznate podatke",()=>{
  const a=target(0,"A"),b=target(1,"B","offset",800),unselected=target(2,"C");
  const before=JSON.stringify([a,b,unselected]);
  const changed=prepareCorpusGroupVariableChange([a,b],"OFFSET","30+5");
  assert.deepEqual(changed.map(x=>x.rootIndex),[0,1]);
  assert.deepEqual(changed.map(x=>x.element.boards[0]!.position[0]),[35,35]);
  assert.deepEqual(changed.map(x=>x.element.position[0]),[0,700]);
  assert.deepEqual(changed.map(x=>x.element.width),[600,800]);
  assert.equal(changed[1]!.element.variables.offset,"30+5");
  for(const x of changed){
    assert.equal(x.source.originalElement,x.element);
    assert.match(x.source.sourceXml,/CUSTOM="preserve"/);
    assert.match(x.source.sourceXml,/<PRIVATE VALUE="keep"\/>/);
    assert.deepEqual(x.element.boards[0]!.holes,a.element.boards[0]!.holes);
  }
  assert.equal(JSON.stringify([a,b,unselected]),before);
});

test("odbijanje jedne mete ostavlja sve izvore netaknute",()=>{
  const a=target(0,"A"),b=target(1,"B"),before=JSON.stringify([a,b]);
  assert.throws(()=>prepareCorpusGroupVariableChange([a,{...b,element:{...b.element,locked:true}}],"OFFSET","40"),/B.*zaključan/);
  assert.throws(()=>prepareCorpusGroupVariableChange([a,target(1,"B","OTHER")],"OFFSET","40"),/B.*OFFSET/);
  assert.throws(()=>prepareCorpusGroupVariableChange([a,b],"OFFSET","MISSING+1"),/nije razriješen/);
  assert.throws(()=>prepareCorpusGroupVariableChange([a,a],"OFFSET","40"),/različite/);
  assert.equal(JSON.stringify([a,b]),before);
});

test("nevažeća dimenzija na kasnijoj meti odbija cijelu pripremu",()=>{
  const a=target(0,"A"),base=target(1,"B");
  const sourceXml=base.source.sourceXml.replace('VISINA="720" DUBINA="560" DEBLJINA="18"','HF="OFFSET-50" VISINA="720" DUBINA="560" DEBLJINA="18"');
  const element=parseCorpusE3d(sourceXml).elements[0]!;
  const b={...base,element,source:{...base.source,sourceXml,originalElement:element}};
  const before=JSON.stringify([a,b]);
  assert.throws(()=>prepareCorpusGroupVariableChange([a,b],"OFFSET","40"),/B.*nedozvoljenu dimenziju/);
  assert.equal(JSON.stringify([a,b]),before);
});


test("grupna izmjena preživi JSON radnu kopiju i oporavak sva tri E3D izvora",()=>{
  const xml='<PROJECTFILE VER="17"><SOBA SIRINA="5000" DUZINA="4000" VISINA="2600"/></PROJECTFILE>';
  const original=parseCorpusS3d(xml);
  const a=target(0,"A"),b=target(1,"B","OFFSET",800),c=target(2,"C");
  const changed=prepareCorpusGroupVariableChange([a,b],"OFFSET","40");
  const targets=[...changed,c];
  const elements=targets.map(x=>x.element);
  const imports=targets.map(x=>({sourceFile:x.source.sourceFile,sourceXml:writeCorpusE3dGeometryCopy(x.source.sourceXml,[x.source.originalElement],[x.element])}));
  const copy=createCorpusWorkingCopyFile("group.S3D",original.elements,elements,undefined,undefined,imports);
  const recovery=createCorpusRecoverySnapshot("group.S3D",xml.length,xml,copy);
  const restoredSnapshot=parseCorpusRecoverySnapshot(JSON.parse(JSON.stringify(recovery)));
  assert.equal(restoredSnapshot.sourceXml,xml);
  const restored=applyCorpusWorkingCopyProject(restoredSnapshot.fileName,original.elements,original.room,restoredSnapshot.workingCopy);
  assert.deepEqual(restored.elements,elements);
  assert.deepEqual(restored.elements.map(x=>x.variables.OFFSET),["40","40","25"]);
  assert.deepEqual(restored.elements.map(x=>x.boards[0]!.position[0]),[40,40,25]);
  assert.deepEqual(restored.importedE3dSources.map(x=>x.sourceXml),imports.map(x=>x.sourceXml));
  restored.importedE3dSources.forEach((source,index)=>assert.equal(source.originalElement,restored.elements[index]));
});
