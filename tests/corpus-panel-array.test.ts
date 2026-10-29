import test from "node:test";
import assert from "node:assert/strict";
import { corpusPanelArray, type CorpusPanelArraySpec } from "../lib/corpus-panel-array.ts";
import { generateCorpusCabinetE3d } from "../lib/corpus-generator.ts";
import { appendCorpusE3dBoard, writeCorpusE3dGeometryCopy } from "../lib/corpus-s3d-writer.ts";
import { parseCorpusE3d } from "../lib/corpus-s3d.ts";
import { buildCorpusCutList } from "../lib/corpus-cutlist.ts";

const spec: CorpusPanelArraySpec = { kind: 'shelves', count: 4, thickness: 18, frontInset: 20, opening: { x: 18, y: 18, z: 0, width: 782, height: 684, depth: 320 } };

test('četiri police imaju jednake čiste razmake i uvlačenje u Corpus Z smjeru', () => {
  const boards = corpusPanelArray(spec);
  const gap = (684 - 4 * 18) / 5;
  for (let index = 0; index < boards.length; index += 1) {
    const board = boards[index]!;
    const before = index === 0 ? 18 : boards[index - 1]!.position[1] + 18;
    assert.ok(Math.abs(board.position[1] - before - gap) < .001);
    assert.equal(board.position[2], -20);
    assert.equal(board.height, 782);
    assert.equal(board.width, 300);
    assert.equal(board.direction, 2);
  }
  assert.ok(Math.abs(702 - (boards.at(-1)!.position[1] + 18) - gap) < .001);
});

test('pojedinačne pozicije 140/280/420/560 i pregrade koriste odgovarajuće lokalne ose', () => {
  const shelves = corpusPanelArray({ ...spec, offsets: [140, 280, 420, 560] });
  assert.deepEqual(shelves.map(board => board.position[1]), [158, 298, 438, 578]);
  const dividers = corpusPanelArray({ ...spec, kind: 'dividers', count: 2, offsets: [200, 500] });
  assert.deepEqual(dividers.map(board => board.position), [[218, 18, -20], [518, 18, -20]]);
  assert.equal(dividers[0]!.direction, 0);
  assert.equal(dividers[0]!.height, 684);
});

test('raspored odbija preklapanje, položaje van otvora i nepotpune ili prevelike unose', () => {
  for (const invalid of [
    { count: 0 }, { count: 51 }, { count: 1.5 }, { thickness: 200 }, { frontInset: -1 },
    { frontInset: 320 }, { offsets: [10, 20, 100, 200] }, { offsets: [0, 100, 200, 680] },
    { offsets: [10] }, { thickness: Number.NaN }, { opening: { ...spec.opening, width: Number.POSITIVE_INFINITY } },
  ]) assert.throws(() => corpusPanelArray({ ...spec, ...invalid }));
});

test('dodane police prolaze E3D izvoz i ponovno učitavanje sa krojnom listom i očuvanim izvornim pločama', () => {
  const generated = generateCorpusCabinetE3d({ name: 'Test 818', code: 'TEST', width: 818, height: 720, depth: 320, thickness: 18, shelfCount: 0, includeBack: true, materialName: 'Iveral', color: 0xd8d1c1 });
  const original = parseCorpusE3d(generated.sourceXml).elements[0]!;
  let expanded = generated.sourceXml;
  for (const board of corpusPanelArray(spec, original.boards[0])) expanded = appendCorpusE3dBoard(expanded, board);
  const current = parseCorpusE3d(expanded).elements[0]!;
  assert.equal(current.boards.length, original.boards.length + 4);
  assert.deepEqual(current.boards.slice(0, original.boards.length), original.boards);
  const exported = writeCorpusE3dGeometryCopy(expanded, [current], [current]);
  const reloaded = parseCorpusE3d(exported).elements[0]!;
  assert.deepEqual(reloaded.boards, current.boards);
  const shelves = reloaded.boards.filter(board => board.name.startsWith('Polica'));
  assert.equal(shelves.length, 4);
  assert.ok(shelves.every(board => board.materialName === 'Iveral' && board.visible === true));
  assert.equal(buildCorpusCutList([reloaded]).skippedBoards, 0);
});

import { estimateCorpusPanelOpening } from "../lib/corpus-panel-array.ts";

test('procjena otvora poštuje coklu i unutrašnju ravan leđa umjesto spoljne dubine', () => {
  const generated = generateCorpusCabinetE3d({ name: 'Donji', code: 'D818', width: 818, height: 820, depth: 320, thickness: 18, shelfCount: 0, baseHeight: 100, includePlinth: true, includeBack: true, frontCount: 1, materialName: 'Bijela', color: 0xffffff });
  const element = parseCorpusE3d(generated.sourceXml).elements[0]!;
  const opening = estimateCorpusPanelOpening(element, 18);
  assert.deepEqual(opening, { x: 18, y: 118, z: 0, width: 782, height: 684, depth: 302 });
  const shelves = corpusPanelArray({ ...spec, opening }, element.boards[0]);
  assert.ok(shelves.every(board => -board.position[2] + board.width === 302));
});

test('tanka leđa iza korpusa ne smanjuju otvor i fronta se ne zamijeni za leđa', () => {
  const generated = generateCorpusCabinetE3d({ name: 'Viseći', code: 'G818', width: 818, height: 720, depth: 320, thickness: 18, shelfCount: 0, includeBack: true, backType: 'thin', backThickness: 3, frontCount: 2, materialName: 'Bijela', color: 0xffffff });
  const element = parseCorpusE3d(generated.sourceXml).elements[0]!;
  assert.equal(estimateCorpusPanelOpening(element, 18).depth, 320);
});

test('rotirana ploča ne postaje granica pravougaonog otvora', () => {
  const generated = generateCorpusCabinetE3d({ name: 'Korpus', code: 'K818', width: 818, height: 720, depth: 320, thickness: 18, shelfCount: 0, includeBack: false, materialName: 'Bijela', color: 0xffffff });
  const element = parseCorpusE3d(generated.sourceXml).elements[0]!;
  const rotated = { ...element.boards[0]!, position: [-500, 0, 0] as const, xAngle: 45 };
  const opening = estimateCorpusPanelOpening({ ...element, boards: [...element.boards, rotated] }, 18);
  assert.equal(opening.x, 18);
  assert.equal(opening.width, 782);
});


test('skrivene alternativne ploče ne ograničavaju procjenu otvora ni dubinu novih polica', () => {
  const generated = generateCorpusCabinetE3d({ name: 'Korpus', code: 'K818', width: 818, height: 720, depth: 320, thickness: 18, shelfCount: 0, includeBack: true, backType: 'thin', backThickness: 3, materialName: 'Bijela', color: 0xffffff });
  const element = parseCorpusE3d(generated.sourceXml).elements[0]!;
  const hiddenBack = { ...element.boards[0]!, name:'Alternativna ledja', direction:1, position:[18,18,-220] as const, visible:false };
  const hiddenSide = { ...element.boards[0]!, name:'Alternativni bok', direction:0, position:[-200,0,0] as const, visible:false };
  const hiddenTop = { ...element.boards[0]!, name:'Alternativni plafon', direction:2, position:[0,1000,0] as const, visible:false };
  const opening = estimateCorpusPanelOpening({...element,boards:[...element.boards,hiddenBack,hiddenSide,hiddenTop]},18);
  assert.deepEqual(opening,{x:18,y:18,z:0,width:782,height:684,depth:320});
  const shelves=corpusPanelArray({...spec,opening},element.boards[0]);
  assert.ok(shelves.every(board=>board.position[2]===-20 && board.width===300));
  const withBack=estimateCorpusPanelOpening({...element,boards:[...element.boards,{...hiddenBack,visible:true}]},18);
  assert.equal(withBack.depth,220);
  assert.ok(corpusPanelArray({...spec,opening:withBack},element.boards[0]).every(board=>-board.position[2]+board.width===220));
});


import { corpusPanelOpeningFormulas } from "../lib/corpus-panel-array.ts";
import { recalculateCorpusE3dVariables } from "../lib/corpus-parametric.ts";
import { readFileSync } from "node:fs";
import { decodeCorpusText } from "../lib/corpus-macro.ts";
const d1v = decodeCorpusText(readFileSync("public/local-corpus/Elmsav/_____PUSTI PRIJE SVEGA/D1V.E3D"));
function createBoundArray(kind: "shelves" | "dividers", offsets?: number[]) {
  const root = parseCorpusE3d(d1v).elements[0]!;
  const openingFormulas = corpusPanelOpeningFormulas(root,18);
  assert.ok(openingFormulas);
  const opening = estimateCorpusPanelOpening(root,18);
  let xml = d1v;
  for (const panel of corpusPanelArray({kind,count:offsets?.length ?? 4,thickness:18,frontInset:20,opening,openingFormulas,offsets},root.boards.find(b=>b.direction===2))) xml = appendCorpusE3dBoard(xml,panel);
  const before = parseCorpusE3d(xml).elements[0]!;
  const resized = {...before,width:800,height:900,depth:600};
  return { xml, before, output:recalculateCorpusE3dVariables(writeCorpusE3dGeometryCopy(xml,[before],[resized])) };
}
test("stvarni D1V: vezane police prate širinu, visinu i dubinu poslije E3D izvoza", () => {
 const {before,output} = createBoundArray("shelves");
 const after = parseCorpusE3d(output).elements[0]!;
 const shelves = after.boards.slice(before.boards.length-4);
 const opening = estimateCorpusPanelOpening(after,18);
 assert.equal(opening.width,764);
 assert.equal(opening.depth,563);
 const gap=(opening.height-4*18)/5;
 shelves.forEach((board,i)=>{
  assert.equal(board.height,764);assert.equal(board.width,543);
  assert.ok(Math.abs(board.position[1]!-(opening.y+gap*(i+1)+18*i))<0.001);
  assert.ok(board.formulas?.YF);assert.ok(board.formulas?.HF);
  assert.deepEqual(board.curvePoints.map(p=>[p.x,p.z]),[[0,0],[764,0],[764,543],[0,543]]);
 });
 assert.deepEqual(shelves[0]!.formulas,before.boards.at(-4)!.formulas);
 assert.equal(recalculateCorpusE3dVariables(output),output);
});
test("ručne pozicije ostaju udaljenosti od početka otvora dok mjere prate korpus", () => {
 const {before,output}=createBoundArray("shelves",[140,280,420,560]);
 const after=parseCorpusE3d(output).elements[0]!;
 const opening=estimateCorpusPanelOpening(after,18);
 const shelves=after.boards.slice(before.boards.length-4);
 assert.deepEqual(shelves.map(b=>b.position[1]),[140,280,420,560].map(v=>v+opening.y));
 assert.ok(shelves.every(b=>b.height===764 && b.width===543));
});
test("pregrade prate jednake horizontalne razmake i visinu otvora", () => {
 const {before,output}=createBoundArray("dividers");
 const after=parseCorpusE3d(output).elements[0]!;
 const opening=estimateCorpusPanelOpening(after,18);
 const panels=after.boards.slice(before.boards.length-4), gap=(opening.width-4*18)/5;
 panels.forEach((b,i)=>{assert.ok(Math.abs(b.position[0]!-(opening.x+gap*(i+1)+18*i))<.001);assert.equal(b.height,opening.height);assert.equal(b.width,543)});
});
test("ne veže dvosmislena ili nepodržana imena graničnih ploča", () => {
 const root=parseCorpusE3d(d1v).elements[0]!;
 const side=root.boards.find(b=>b.direction===0 && b.visible!==false)!;
 assert.equal(corpusPanelOpeningFormulas({...root,boards:[...root.boards,{...side}]},18),null);
 assert.equal(corpusPanelOpeningFormulas({...root,boards:root.boards.map(b=>b===side?{...b,name:"Lijevi(bok)"}:b)},18),null);
});


test("naknadno smanjenje odbija raspored bez prostora i čuva prethodni XML", () => {
 const {xml,before}=createBoundArray("shelves");
 for(const patch of [{height:180},{depth:45},{width:30}]) {
  const invalid=writeCorpusE3dGeometryCopy(xml,[before],[{...before,...patch}]);
  assert.throws(()=>recalculateCorpusE3dVariables(invalid,{rejectInvalidDimensions:true}),/Promjena nije primijenjena/);
 }
 assert.equal(parseCorpusE3d(xml).elements[0]!.height,820);
 assert.ok(before.boards.at(-1)!.formulas?.DF?.startsWith("IF("));
 const valid=writeCorpusE3dGeometryCopy(xml,[before],[{...before,width:800,height:900,depth:600}]);
 assert.equal(parseCorpusE3d(recalculateCorpusE3dVariables(valid,{rejectInvalidDimensions:true})).elements[0]!.boards.at(-1)!.thickness,18);
});
test("ručni raspored odbija poziciju van otvora ali prihvata tačnu graničnu poziciju", () => {
 const {xml,before}=createBoundArray("shelves",[140,280,420,560]);
 const invalid=writeCorpusE3dGeometryCopy(xml,[before],[{...before,height:650}]);
 assert.throws(()=>recalculateCorpusE3dVariables(invalid,{rejectInvalidDimensions:true}),/Promjena nije primijenjena/);
 const exact=writeCorpusE3dGeometryCopy(xml,[before],[{...before,height:714}]);
 assert.doesNotThrow(()=>recalculateCorpusE3dVariables(exact,{rejectInvalidDimensions:true}));
});
test("pregrade odbijaju širinu u koju ne staje broj puta debljina", () => {
 const {xml,before}=createBoundArray("dividers");
 const invalid=writeCorpusE3dGeometryCopy(xml,[before],[{...before,width:100}]);
 assert.throws(()=>recalculateCorpusE3dVariables(invalid,{rejectInvalidDimensions:true}),/Promjena nije primijenjena/);
});


import { replaceCorpusE3dElementVariables } from "../lib/corpus-s3d-writer.ts";
test("konstrukcijska varijabla takođe ne može smanjiti otvor ispod rasporeda", () => {
 const {xml,before}=createBoundArray("shelves");
 const next=replaceCorpusE3dElementVariables(xml,[0],{...before.variables,VISINA_NOGICA:"800"});
 assert.throws(()=>recalculateCorpusE3dVariables(next,{rejectInvalidDimensions:true}),/Promjena nije primijenjena/);
 assert.equal(parseCorpusE3d(xml).elements[0]!.variables.VISINA_NOGICA,before.variables.VISINA_NOGICA);
});
