import test from "node:test";
import assert from "node:assert/strict";
import {applyGolaCuts,removeGolaCuts,golaContour,readGolaCuts,type GolaCut} from "../lib/corpus-gola-cuts.ts";
import {parseCorpusE3d,parseCorpusS3d} from "../lib/corpus-s3d.ts";
import {expandCorpusCurve} from "../lib/corpus-geometry.ts";
import {validateStraightContour} from "../lib/corpus-contour.ts";
import {createCorpusWorkingCopyFile,applyCorpusWorkingCopyProject} from "../lib/corpus-model.ts";
import {writeCorpusS3dWithImportedElements} from "../lib/corpus-s3d-writer.ts";
const curve='<KRIVULJE EXTRA="keep" DATA="&quot;PTOCKA=0&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=0&quot;,&quot;PTZ=0&quot;,&quot;PTOCKA=1&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=0.777&quot;,&quot;PTZ=0&quot;,&quot;PTOCKA=2&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=0.777&quot;,&quot;PTZ=0.56&quot;,&quot;PTOCKA=3&quot;,&quot;PTSTYLE=0&quot;,&quot;PTX=0&quot;,&quot;PTZ=0.56&quot;"><OPAQUE VALUE="original"/></KRIVULJE>';
const board=(name:string,x:number)=>`<AD DNAME="${name}" SMJER="0" DXPOS="${x}" DYPOS="100" DZPOS="0" VISINA="777" DUBINA="560" DEBLJINA="18" DKUT="0" XKUT="0" ZKUT="0" HF="777" CUSTOM="keep &gt; 1"><RUPE/><OPAQUE UID="unchanged"/>${curve}</AD>`;
const xml=`<ELEMENTFILE VER="17"><ELEMENT ENAME="Test" ESIRINA="600" EVISINA="877" EDUBINA="560" EEDITABLE="true"><DASKE DCOUNT="3">${board('Lijevi_bok',0)}${board('Desni_bok',582)}<AD DNAME="Pod" SMJER="2" VISINA="564" DUBINA="560" DEBLJINA="18" DXPOS="18" DYPOS="100" DZPOS="0"/></DASKE></ELEMENT></ELEMENTFILE>`;
const l:GolaCut={kind:"L",enabled:true,height:57,depth:26,radius:10,y:0};
const c:GolaCut={kind:"C",enabled:true,height:72,depth:26,radius:10,y:400};
const points=(output:string,i=0)=>parseCorpusE3d(output).elements[0]!.boards[i]!.curvePoints;

test("L usjek odgovara sedam tačaka i radijusu stvarnog Gola boka",()=>{
 const output=applyGolaCuts(xml,[0,1],[l]);
 const p=points(output);
 assert.deepEqual(p.map(v=>[v.x,v.z,v.style,v.arcRadius]),[[0,0,0,null],[720,0,0,null],[720,16,2,10],[730,26,0,null],[777,26,0,null],[777,560,0,null],[0,560,0,null]]);
 assert.deepEqual(points(output,1),p);
 assert.equal(parseCorpusE3d(output).elements[0]!.boards[2]!.curvePoints.length,0);
 assert.match(output,/HF="777" CUSTOM="keep &gt; 1"/);assert.match(output,/<RUPE\/><OPAQUE UID="unchanged"\/>/);
 validateStraightContour(expandCorpusCurve(p));
});
test("C Y se računa od dna elementa; oba unutrašnja ugla imaju stvarni kružni luk",()=>{
 const p=points(applyGolaCuts(xml,[0],[c]));
 assert.deepEqual(p.slice(1,7).map(v=>[v.x,v.z,v.style,v.arcRadius]),[[300,0,0,null],[300,16,2,10],[310,26,0,null],[362,26,2,10],[372,16,0,null],[372,0,0,null]]);
 validateStraightContour(expandCorpusCurve(p));
});
test("više C usjeka i L rade zajedno bez dupliranja pri ponovnom Napravi",()=>{
 const cuts=[l,c,{...c,y:200}];const once=applyGolaCuts(xml,[0,1],cuts);const twice=applyGolaCuts(once,[0,1],cuts);
 assert.equal(twice,once);assert.equal(points(once).filter(p=>p.style===2).length,5);
 assert.equal((once.match(/<IVERTIM_GOLA /g)||[]).length,2);
 validateStraightContour(expandCorpusCurve(points(once),8));
});
test("Obriši vraća tačan original konture, a promjene drugih podataka ne briše",()=>{
 const cut=applyGolaCuts(xml,[0],[l]);const withOther=cut.replace('UID="unchanged"','UID="later-change"');
 const restored=removeGolaCuts(withOther,[0]);assert.ok(restored.includes(curve));assert.match(restored,/UID="later-change"/);assert.doesNotMatch(restored,/IVERTIM_GOLA/);
 assert.deepEqual(points(restored),points(xml));
 assert.throws(()=>removeGolaCuts(xml,[0]),/nema usjeka/);
 assert.throws(()=>removeGolaCuts(cut.replace('PTX=0.72','PTX=0.71'),[0]),/mijenjane/);
});
test("loše mjere, preklapanja, rotacije i postojeći tuđi izrezi odbijaju cijelu radnju",()=>{
 for(const cuts of [[{...l,radius:27}],[{...l,height:0}],[{...l,depth:600}],[{...c,y:0}],[{...c,y:850}],[l,{...c,y:800}],[c,{...c,y:420}]])assert.throws(()=>applyGolaCuts(xml,[0,1],cuts));
 assert.throws(()=>applyGolaCuts(xml.replace('DKUT="0"','DKUT="90"'),[0],[l]),/nerotirane/);
 assert.throws(()=>applyGolaCuts(xml.replace('PTSTYLE=0','PTSTYLE=1'),[0],[l]),/pravougaona/);
 assert.throws(()=>applyGolaCuts(xml.replace('EEDITABLE="true"','EEDITABLE="false"'),[0],[l]),/zaključan/);
 assert.throws(()=>applyGolaCuts(xml,[0,77],[l]),/pronađena/);
 assert.equal(points(xml).length,4);
});
test("ugnježđeni element mijenja samo izabranu putanju",()=>{
 const nested=xml.replace('</DASKE>','</DASKE><ELMLIST>'+xml.match(/<ELEMENT .*<\/ELEMENT>/)![0].replace('<ELEMENT ','<ELM ').replace('</ELEMENT>','</ELM>')+'</ELMLIST>');
 const output=applyGolaCuts(nested,[0],[l],[0,0]);const root=parseCorpusE3d(output).elements[0]!;
 assert.equal(root.boards[0]!.curvePoints.length,4);assert.equal(root.children[0]!.boards[0]!.curvePoints.length,7);
});
test("usjeci i original ostaju kroz S3D izvoz, JSON oporavak i ponovno E3D čitanje",()=>{
 const cut=applyGolaCuts(xml,[0,1],[l,c]);const element=parseCorpusE3d(cut).elements[0]!;
 const source='<PROJECTFILE VER="17"><SOBA/></PROJECTFILE>';const project=parseCorpusS3d(source);
 const output=writeCorpusS3dWithImportedElements(source,[],[element],[{sourceFile:'cuts.E3D',sourceXml:cut,originalElement:element}]);
 assert.deepEqual(parseCorpusS3d(output).elements[0]!.boards[0]!.curvePoints,element.boards[0]!.curvePoints);
 const copy=createCorpusWorkingCopyFile('test.S3D',[],[element],undefined,undefined,[{sourceFile:'cuts.E3D',sourceXml:cut}]);
 const restored=applyCorpusWorkingCopyProject('test.S3D',[],project.room,JSON.parse(JSON.stringify(copy)));
 assert.deepEqual(restored.elements[0]!.boards[0]!.curvePoints,element.boards[0]!.curvePoints);
 assert.ok(removeGolaCuts(restored.importedE3dSources[0]!.sourceXml,[0,1]).includes(curve));
 const standalone=createCorpusWorkingCopyFile('test.E3D',parseCorpusE3d(xml).elements,[element],undefined,undefined,[],{sourceFile:'test.E3D',sourceXml:cut});
 assert.equal(applyCorpusWorkingCopyProject('test.E3D',parseCorpusE3d(xml).elements,project.room,JSON.parse(JSON.stringify(standalone))).elements[0]!.boards[0]!.curvePoints.length,element.boards[0]!.curvePoints.length);
});
test("podešavanja sva četiri usjeka ostaju u E3D za ponovno otvaranje alata",()=>{
 const cuts=[l,c,{...c,enabled:false,y:550},{...c,enabled:false,y:600}];const output=applyGolaCuts(xml,[0,1],cuts);
 assert.deepEqual(readGolaCuts(output,0),cuts);assert.deepEqual(readGolaCuts(output,1),cuts);
 assert.equal(readGolaCuts(removeGolaCuts(output,[0]),0),null);
});

test("ravna dionica prije kružnog luka ostaje ravna u Gola prikazu",()=>{
 const p=points(applyGolaCuts(xml,[0],[l]));const expanded=expandCorpusCurve(p);
 assert.equal(expanded[0],p[0]);assert.equal(expanded[1],p[1]);assert.equal(expanded[2],p[2]);
 assert.ok(expanded.every(v=>v.z>=-0.0001&&v.x>=-0.0001&&v.x<=777.0001&&v.z<=560.0001));
});

test("Gola zaobljenje je tangentno na obje ravne dionice, bez obrnutog luka",()=>{
 const p=points(applyGolaCuts(xml,[0],[l]));const expanded=expandCorpusCurve(p,8);
 const middle=expanded[6]!;
 assert.ok(Math.abs(middle.x-(730-10/Math.sqrt(2)))<0.00001);
 assert.ok(Math.abs(middle.z-(16+10/Math.sqrt(2)))<0.00001);
 assert.equal(p[2]!.arcSmooth,0);
 const cp=points(applyGolaCuts(xml,[0],[c]));
 assert.ok(cp.filter(p=>p.style===2).every(p=>p.arcSmooth===0));
});
