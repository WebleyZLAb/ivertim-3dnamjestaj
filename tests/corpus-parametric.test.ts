import {readFileSync} from 'node:fs';
import {decodeCorpusText} from '../lib/corpus-macro.ts';
import test from 'node:test';
import assert from 'node:assert/strict';
import {parseCorpusE3d} from '../lib/corpus-s3d.ts';
import {replaceCorpusE3dBoardContour} from '../lib/corpus-s3d-writer.ts';
import {inspectCorpusProductionGeometryIssues,inspectCorpusVariableAssignments,inspectCorpusGeometryIssues,recalculateCorpusBoards,recalculateCorpusE3dVariables} from '../lib/corpus-parametric.ts';
const board=(name:string,extra:string)=>`<AD DNAME="${name}" DXPOS="0" DYPOS="0" DZPOS="0" VISINA="700" DUBINA="500" DEBLJINA="18" SMJER="1" DKUT="0" XKUT="0" ZKUT="0" BOJA="123" PROZIRNO="false" VISIBLE="true" ${extra}><RUPE/><KRIVULJE DATA=""/></AD>`;
const source=(variables:string,boards:string)=>`<ELEMENTFILE><ELEMENT ENAME="Test" EVISINA="720" ESIRINA="600" EDUBINA="560"><EVAR ${variables}/><DASKE>${boards}</DASKE></ELEMENT></ELEMENTFILE>`;
test('promjena tipa leđa odmah računa položaj, mjere i zavisnu ploču',()=>{
 const xml=source('VAR0="TIP_LEDJA=2" VAR1="UVUCENO=37"',board('Ledja','ZF="if(TIP_LEDJA=1;-d+UVUCENO;-d-self.debljina)" HF="v-4" SF="s-4"')+board('Pod','SF="-ledja.z-ledja.debljina"'));
 const before=parseCorpusE3d(xml).elements[0]!;
 const result=recalculateCorpusBoards(before);
 assert.equal(result.boards[0]!.position[2],-578);
 assert.equal(result.boards[0]!.height,716);
 assert.equal(result.boards[0]!.width,596);
 assert.equal(result.boards[1]!.width,560);
 assert.equal(before.boards[0]!.position[2],0);
 const reopened=parseCorpusE3d(recalculateCorpusE3dVariables(xml)).elements[0]!;
 assert.equal(reopened.boards[0]!.position[2],-578);
 assert.equal(reopened.boards[1]!.width,560);
 assert.equal(reopened.boards[0]!.formulas?.ZF,before.boards[0]!.formulas?.ZF);
});
test('ne koristi stare vrijednosti kao rješenje cikličnih i nepoznatih formula',()=>{
 const xml=source('',board('A','XF="b.x+1" HF="NEPOZNATO"')+board('B','XF="a.x+1"'));
 const before=parseCorpusE3d(xml).elements[0]!;
 assert.deepEqual(recalculateCorpusBoards(before).boards.map(b=>b.position[0]),[0,0]);
 assert.equal(recalculateCorpusBoards(before).boards[0]!.height,700);
});
test('računa nerotirane AABB reference tek poslije rješavanja ploče',()=>{
 const xml=source('',board('Bok','XF="18"')+board('Polica','XF="Bok.AABB.XMAX"'));
 assert.equal(recalculateCorpusBoards(parseCorpusE3d(xml).elements[0]!).boards[1]!.position[0],518);
});

test('AABB Z ostaje u Corpus koordinatama, bez Three.js inverzije',()=>{
 const xml=source('',board('Ledja','ZF="-523" DF="3"')+board('Polica','ZF="-20" SF="abs(ledja.aabb.zmax)+self.z"'));
 assert.equal(recalculateCorpusBoards(parseCorpusE3d(xml).elements[0]!).boards[1]!.width,500);
});

test('obnavlja pravougaonu konturu i uz zaokruženje iz binarnog float zapisa',()=>{
 let xml=source('',board('Ledja','HF="v-4" SF="s-4"'));
 xml=replaceCorpusE3dBoardContour(xml,0,[{x:0,z:0},{x:700,z:0},{x:700,z:500},{x:0,z:500}]);
 xml=xml.replaceAll('PTX=0.7','PTX=0.70000002').replaceAll('PTZ=0.5','PTZ=0.50000002');
 const result=parseCorpusE3d(recalculateCorpusE3dVariables(xml)).elements[0]!.boards[0]!;
 assert.equal(result.height,716);
 assert.equal(result.width,596);
 assert.deepEqual(result.curvePoints.map(p=>[p.x,p.z]),[[0,0],[716,0],[716,596],[0,596]]);
});


test('pod-element koristi roditeljske mjere i reference, a lokalna ploča nove mjere pod-elementa',()=>{
 let xml=source('VAR0="zazor_=4"',board('Pod','YF="100"'));
 const child=`<ELMLIST><ELM ENAME="Fronta" EXPOX="2" EYPOS="102" EZPOS="0" EVISINA="716" ESIRINA="596" EDUBINA="18" EXKUT="0" EKUT="0" EZKUT="0" EXF="zazor_/2" EYF="pod.y+zazor_/2" EHF="v-fronta.y-zazor_/2" ESF="sirina-zazor_"><DASKE>${board('FRD','HF="v" SF="s"')}</DASKE></ELM></ELMLIST>`;
 xml=xml.replace('</ELEMENT>',child+'</ELEMENT>').replace('EVISINA="720"','EVISINA="900"').replace('ESIRINA="600"','ESIRINA="800"');
 xml=replaceCorpusE3dBoardContour(xml,0,[{x:0,z:0},{x:700,z:0},{x:700,z:500},{x:0,z:500}],[0,0]);
 const result=parseCorpusE3d(recalculateCorpusE3dVariables(xml)).elements[0]!;
 const front=result.children[0]!;
 assert.deepEqual(front.position,[2,102,0]);assert.equal(front.height,796);assert.equal(front.width,796);
 assert.equal(front.boards[0]!.height,796);assert.equal(front.boards[0]!.width,796);
 assert.deepEqual(front.boards[0]!.curvePoints.map(p=>[p.x,p.z]),[[0,0],[796,0],[796,796],[0,796]]);
 assert.equal(front.formulas?.ESF,'sirina-zazor_');
 assert.equal(result.boards[0]!.width,500);
});

test('neriješene i ciklične mjere pod-elementa ne hrane lokalne ploče spremljenim rezultatima',()=>{
 for(const expressions of ['ESF="missing"','ESF="fronta.visina+1" EHF="fronta.sirina+1"']){
  const xml=source('', '').replace('</ELEMENT>',`<ELMLIST><ELM ENAME="Fronta" EVISINA="716" ESIRINA="596" EDUBINA="18" ${expressions}><DASKE>${board('FRD','SF="s"')}</DASKE></ELM></ELMLIST></ELEMENT>`);
  const result=recalculateCorpusBoards(parseCorpusE3d(xml).elements[0]!);
  assert.equal(result.children[0]!.width,596);assert.equal(result.children[0]!.boards[0]!.width,500);
 }
});

test('lokalne varijable zasjenjuju roditeljske, a potomak nasljeđuje najbliži kontekst',()=>{
 const xml=source('VAR0="dodatak=4"','').replace('</ELEMENT>',`<ELMLIST><ELM ENAME="Fronta" EVISINA="716" ESIRINA="596" EDUBINA="18" ESF="s-dodatak"><EVAR VAR0="dodatak=10"/><DASKE>${board('FRD','SF="s-dodatak"')}</DASKE><ELMLIST><ELM ENAME="Unutra" EVISINA="50" ESIRINA="50" EDUBINA="18" ESF="s-dodatak"><DASKE>${board('P','SF="s-dodatak"')}</DASKE></ELM></ELMLIST></ELM></ELMLIST></ELEMENT>`);
 const result=recalculateCorpusBoards(parseCorpusE3d(xml).elements[0]!);
 assert.equal(result.children[0]!.width,596);
 assert.equal(result.children[0]!.boards[0]!.width,586);
 assert.equal(result.children[0]!.children[0]!.width,586);
 assert.equal(result.children[0]!.children[0]!.boards[0]!.width,576);
});


test('obnova konture cilja tačnu putanju i ne uzima ploče potomka kao korijenske',()=>{
 const xml=`<ELEMENTFILE><ELEMENT ENAME="Bez direktnih ploca"><ELMLIST><ELM ENAME="Fronta"><DASKE>${board('FRD','')}</DASKE></ELM></ELMLIST></ELEMENT></ELEMENTFILE>`;
 const points=[{x:0,z:0},{x:200,z:0},{x:200,z:100},{x:0,z:100}];
 assert.throws(()=>replaceCorpusE3dBoardContour(xml,0,points));
 const result=parseCorpusE3d(replaceCorpusE3dBoardContour(xml,0,points,[0,0])).elements[0]!;
 assert.equal(result.boards.length,0);assert.equal(result.children[0]!.boards[0]!.height,200);
 assert.throws(()=>replaceCorpusE3dBoardContour(xml,0,points,[0,8]));
});


test('dijagnostika razlikuje nepoznati kontekst, ciklus i nevažeći rezultat bez izmjene izvora',()=>{
 const xml=source('',board('A','XF="b.x+1" HF="-1"')+board('B','XF="a.x+1"')).replace('</ELEMENT>',`<ELMLIST><ELM ENAME="Fronta" EVISINA="716" ESIRINA="596" EDUBINA="18"><DASKE>${board('FRD','SF="CLRW"')}</DASKE></ELM></ELMLIST></ELEMENT>`);
 const e=parseCorpusE3d(xml).elements[0]!;const before=JSON.stringify(e);
 const issues=inspectCorpusGeometryIssues(e);
 assert.ok(issues.some(i=>i.boardName==='A'&&i.field==='X'&&i.reason==='cycle'));
 assert.ok(issues.some(i=>i.boardName==='A'&&i.field==='VISINA'&&i.reason==='value'));
 assert.ok(issues.some(i=>i.boardName==='FRD'&&i.expression==='CLRW'&&i.reason==='missing'&&i.elementPath.join('.')==='0.0'));
 assert.equal(JSON.stringify(e),before);
 assert.deepEqual(inspectCorpusGeometryIssues(parseCorpusE3d(source('',board('Dobra','HF="v-4" SF="s-4"'))).elements[0]!),[]);
});


test("dokumentovani engleski nazivi i skraćenice geometrije daju isti broj kao kanonska polja",()=>{
 const xml=source('',board('Side','')+board('Part','XF="Width+W+Height+H+Depth+D+Side.Thickness+Side.TH"'));
 const result=recalculateCorpusBoards(parseCorpusE3d(xml).elements[0]!);
 assert.equal(result.boards[1]!.position[0],3796);
 const shadow=source('VAR0="WIDTH=700"',board('Part','XF="WIDTH+W"'));
 assert.equal(recalculateCorpusBoards(parseCorpusE3d(shadow).elements[0]!).boards[0]!.position[0],1300);
});
test("tačne višerječne reference imaju prvenstvo nad kraćim imenima i čuvaju granice tokena",()=>{
 const xml=source('',board('Side','DF="30"')+board('Left Side','DF="18"')+board('Part','XF="left side.thickness+Side.TH"'));
 const root=parseCorpusE3d(xml).elements[0]!;
 assert.equal(recalculateCorpusBoards(root).boards[2]!.position[0],48);
 const bad={...root,boards:root.boards.map((b,i)=>i===2?{...b,formulas:{...b.formulas,XF:"OtherLeft Side.TH"}}:b)};
 assert.ok(inspectCorpusGeometryIssues(bad).some(issue=>issue.boardIndex===2&&issue.field==="X"));
 const duplicate={...root,boards:[...root.boards,{...root.boards[1]!,name:"left side"}]};
 assert.ok(inspectCorpusGeometryIssues(duplicate).some(issue=>issue.boardIndex===2&&issue.field==="X"));
});


test('dijagnostika prati nedostajuće reference kroz varijable bez lažnog ciklusa ili internog imena',()=>{
 const root=parseCorpusE3d(source('VAR0="A=B+1" VAR1="B=EVAR.FRONT_GAP" VAR2="C=D" VAR3="D=C"',board('Part','XF="A+B" YF="C" ZF="IF(FALSE;MISSING;7)"'))).elements[0]!;
 const issues=inspectCorpusGeometryIssues(root);
 assert.deepEqual(issues.find(issue=>issue.field==='X')!.missingReferences,['EVAR.FRONT_GAP']);
 assert.equal(issues.find(issue=>issue.field==='Y')!.missingReferences,undefined);
 assert.equal(issues.some(issue=>issue.field==='Z'),false);
 assert.equal(recalculateCorpusBoards(root).boards[0]!.position[0],0);
});


test('varijable prikazuju isti geometrijski graf i draft bez pisanja modela',()=>{
 const root=parseCorpusE3d(source('VAR0="A=DEPTH+Side.THICKNESS" VAR1="B=A*2"',board('Side',''))).elements[0]!;
 assert.deepEqual(inspectCorpusVariableAssignments(root).map(a=>[a.name,a.status,a.value]),[['A','resolved',578],['B','resolved',1156]]);
 assert.equal(inspectCorpusVariableAssignments(root,[0],{A:'DEPTH+Side.THICKNESS+2'})[0]!.value,580);
 assert.equal(root.variables.A,'DEPTH+Side.THICKNESS');
 const child={...root,name:'Child',variables:{LOCAL:'PARENT_GAP+WIDTH'},width:100};
 const parent={...root,variables:{PARENT_GAP:'4'},children:[child]};
 assert.equal(inspectCorpusVariableAssignments(parent,[0,0])[0]!.value,104);
 const missing=inspectCorpusVariableAssignments(parent,[0,0],{A:'B+1',B:'EVAR.GAP'});
 assert.deepEqual(missing[0]!.missing,['EVAR.GAP']);assert.equal(missing[0]!.status,'missing');
});


test('stvarni ugaoni model prikazuje razriješene varijable i zadržava stvarne EVAR nedostatke',()=>{
 const root=parseCorpusE3d(decodeCorpusText(readFileSync('public/local-corpus/Elmsav/Cabinet_library/1_Wall_C_Handle/WC_CORNER_45_L.E3D'))).elements[0]!;
 const variables=inspectCorpusVariableAssignments(root);
 assert.equal(variables.find(a=>a.name==='Sides_W')!.value,620);
 assert.equal(variables.find(a=>a.name==='Sides_W')!.status,'resolved');
 const front=inspectCorpusVariableAssignments(root,[0,2]);
 assert.deepEqual(front.find(a=>a.name==='LE_DE')!.missing,['EVAR.FRONT_GAP_L_R']);
 assert.equal(front.find(a=>a.name==='LE_DE')!.status,'missing');
});


test('stvarni trapezni element računa sačuvani kosi ugao i ponovo ga računa poslije promjene širine',()=>{
 const root=parseCorpusE3d(decodeCorpusText(readFileSync('public/local-corpus/Elmsav/_KOSE_KOMODE/KOMODA_KOSINA_TRAPEZ.E3D'))).elements[0]!;
 const next=recalculateCorpusBoards(root);
 assert.ok(Math.abs(next.boards[0]!.angle!-root.boards[0]!.angle!)<0.001);
 const wider={...root,width:1200};
 const changed=recalculateCorpusBoards(wider);
 const expected=-Math.atan((1200-750)/360)*180/Math.PI;
 assert.ok(Math.abs(changed.boards[0]!.angle!-expected)<1e-10);
 assert.equal(root.boards[0]!.angle,-34.778);
 assert.ok(inspectCorpusGeometryIssues(root).length>0,'preostali nepoznati izrazi nisu maskirani');
});


test('neriješeni rotirani AABB zadržava ime ploče umjesto internog ID-a u direktnim i zavisnim porukama',()=>{
 const root=parseCorpusE3d(source('VAR0="BOUND=Rotirana.AABB.XMAX"',board('Rotirana','KYF="45"')+board('Part','XF="BOUND" YF="Rotirana.AABB.XMAX"'))).elements[0]!;
 for(const issue of inspectCorpusGeometryIssues(root))assert.deepEqual(issue.missingReferences,['ROTIRANA.AABB.XMAX']);
 const variable=inspectCorpusVariableAssignments(root)[0]!;
 assert.deepEqual(variable.missing,['ROTIRANA.AABB.XMAX']);
 assert.equal(variable.status,'missing');
 assert.equal(recalculateCorpusBoards(root).boards[1]!.position[0],0);
});


test('proizvodna dijagnostika prati vidljiv obuhvat i razlikuje putanje korijena',()=>{
 const root=parseCorpusE3d(source('',board('Vidljiva','XF="UNKNOWN"')+board('Skrivena','YF="OTHER"'))).elements[0]!;
 const hiddenBoard={...root.boards[1]!,visible:false};
 const visible={...root,boards:[root.boards[0]!,hiddenBoard],children:[{...root,visible:false}]};
 const issues=inspectCorpusProductionGeometryIssues([{...root,visible:false},visible,visible]);
 assert.equal(issues.length,2);
 assert.deepEqual(issues.map(issue=>issue.elementPath),[[1],[2]]);
 assert.ok(issues.every(issue=>issue.boardName==='Vidljiva'));
 assert.equal(inspectCorpusProductionGeometryIssues([]).length,0);
});
