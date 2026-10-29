import test from 'node:test';import assert from 'node:assert/strict';
import {corpusDragSnap,corpusDragBody,type DragBody} from '../lib/corpus-drag-snap.ts';
import {parseCorpusE3d} from '../lib/corpus-s3d.ts';
const element=parseCorpusE3d('<ELEMENTFILE><ELEMENT ENAME="Test"><DASKE/></ELEMENT></ELEMENTFILE>').elements[0]!;
const box=(x:number,z=0,y=0):DragBody=>({element:{...element},min:[x,y,z],max:[x+100,y+100,z+100]});
const room={x:2000,z:2000};
test('prislanja uz susjeda i daje kontaktnu plohu',()=>{
 const result=corpusDragSnap([box(0)],[box(500)],room,[390,0]);
 assert.equal(result.delta[0],400);assert.ok(result.contacts.some(c=>c.axis==='x'&&c.coordinate===500&&c.kind==='element'));
});
test('brz potez ne preskače tanak susjedni element',()=>{
 const result=corpusDragSnap([box(0)],[box(500)],room,[1200,0]);
 assert.equal(result.delta[0],400);
});
test('zid sprečava prolaz i prikazuje liniju, a odmicanje oslobađa kontakt',()=>{
 const a=box(100,200);
 const result=corpusDragSnap([a],[],room,[-1000,0]);
 assert.equal(result.delta[0],-100);assert.ok(result.contacts.some(c=>c.kind==='wall'&&c.coordinate===0));
 const away=corpusDragSnap([a],[],room,[50,0],[-100,0]);assert.equal(away.delta[0],50);
});
test('tangentno klizanje uz dodirni element je dozvoljeno',()=>{
 const result=corpusDragSnap([box(0)],[box(500)],room,[400,50],[400,0]);
 assert.deepEqual(result.delta,[400,50]);
});
test('odmak po visini ne stvara lažnu koliziju',()=>{
 const result=corpusDragSnap([box(0)],[box(500,0,200)],room,[1000,0]);assert.equal(result.delta[0],1000);
});
test('postojeće preklapanje ne blokira izlazak, a grupa zadržava isti pomak',()=>{
 assert.equal(corpusDragSnap([box(100)],[box(150)],room,[-80,0]).delta[0],-80); // postojeći preklop je slobodno napustiti
 const grouped=corpusDragSnap([box(0),box(200)],[box(500)],room,[1000,0]);assert.equal(grouped.delta[0],200);
});
test('fizički omotač koristi ploču, a ne pogrešnu spremljenu visinu maske',()=>{
 const xml='<ELEMENTFILE><ELEMENT ENAME="Mask" EXPOX="0" EYPOS="2220" EZPOS="100" EVISINA="2106" ESIRINA="100" EDUBINA="560"><DASKE><AD DNAME="Pod" DXPOS="0" DYPOS="0" DZPOS="0" VISINA="100" DUBINA="2106" DEBLJINA="18" SMJER="2"/></DASKE></ELEMENT></ELEMENTFILE>';
 const body=corpusDragBody(parseCorpusE3d(xml).elements[0]!)!;assert.equal(body.max[1]-body.min[1],18);assert.equal(body.max[2]-body.min[2],2106);
});
