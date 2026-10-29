import test from 'node:test';
import assert from 'node:assert/strict';
import { applyCorpusVariableVisibility } from '../lib/corpus-variable-visibility.ts';
import { parseCorpusE3d } from '../lib/corpus-s3d.ts';
import { writeCorpusE3dGeometryCopy } from '../lib/corpus-s3d-writer.ts';
const source = `<ELEMENTFILE><ELEMENT ENAME="Test" ESIRINA="600" EVISINA="720" EDUBINA="560"><EVAR VAR0="TIP=1" VAR1="ShowD_PlAFON=if(TIP=1;1;0)" VAR2="ShowD_Noga=TIP=0"/><DASKE><AD DNAME="Plafon" BOJA="123" PROZIRNO="false" VISIBLE="false" VISINA="600" DUBINA="560" DEBLJINA="18" XF="S-18" CUSTOM="ostaje"><RUPE/><KRIVULJE DATA="opaque"/></AD></DASKE><ELMLIST><ELM ENAME="Noga" EVISIBLE="true" EEDITABLE="true" ELOCKED="false"><DASKE><AD DNAME="Dio" VISIBLE="true"/></DASKE></ELM></ELMLIST></ELEMENT></ELEMENTFILE>`;
test('računa IF vidljivost ploče i pod-elementa, čuva izvorni model', () => {
 const element = parseCorpusE3d(source).elements[0]!;
 const next = applyCorpusVariableVisibility(element);
 assert.equal(next.boards[0]!.visible, true);
 assert.equal(next.children[0]!.visible, false);
 assert.equal(element.boards[0]!.visible, false);
 assert.deepEqual(next.variables, element.variables);
 assert.equal(next.boards[0]!.height, element.boards[0]!.height);
 assert.deepEqual(next.boards[0]!.holes, element.boards[0]!.holes);
});
test('čuva nerazriješene, ciklične i vrijednosti izvan 0/1', () => {
 const element = parseCorpusE3d(source).elements[0]!;
 for (const expression of ['Nepoznato', 'ShowD_PlAFON', '2', '1/0']) {
   const next = applyCorpusVariableVisibility({...element, variables:{ShowD_PlAFON:expression}});
   assert.equal(next.boards[0]!.visible, false);
 }
});
test('ne primjenjuje kontrolu na dvosmislene nazive objekata', () => {
 const element = parseCorpusE3d(source).elements[0]!;
 const next = applyCorpusVariableVisibility({...element, boards:[element.boards[0]!, {...element.boards[0]!, name:'PLAFON'}]});
 assert.deepEqual(next.boards.map(board=>board.visible), [false,false]);
});
test('E3D čuva vidljivost poslije učitavanja i omogućava vraćanje izvornog stanja', () => {
 const before = parseCorpusE3d(source).elements;
 const next = before.map(applyCorpusVariableVisibility);
 const xml = writeCorpusE3dGeometryCopy(source, before, next);
 const reopened = parseCorpusE3d(xml).elements;
 assert.equal(reopened[0]!.boards[0]!.visible, true);
 assert.equal(reopened[0]!.children[0]!.visible, false);
 assert.match(xml, /XF="S-18" CUSTOM="ostaje"/);
 assert.match(xml, /<KRIVULJE DATA="opaque"\/>/);
 assert.match(xml, /ShowD_PlAFON=if\(TIP=1;1;0\)/);
 const undo = writeCorpusE3dGeometryCopy(xml, reopened, before);
 assert.equal(parseCorpusE3d(undo).elements[0]!.boards[0]!.visible, false);
 assert.equal(parseCorpusE3d(undo).elements[0]!.children[0]!.visible, true);
});
