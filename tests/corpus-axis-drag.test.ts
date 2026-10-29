import test from 'node:test';import assert from 'node:assert/strict';
import {corpusAxisDragSnap} from '../lib/corpus-axis-drag.ts';
import type {DragBody} from '../lib/corpus-drag-snap.ts';import {parseCorpusE3d} from '../lib/corpus-s3d.ts';
const e=parseCorpusE3d('<ELEMENTFILE><ELEMENT ENAME="A"><DASKE/></ELEMENT></ELEMENTFILE>').elements[0]!;
const body=(x:number,y:number,z:number):DragBody=>({element:e,min:[x,y,z],max:[x+100,y+100,z+100]});
test('Y osa zaustavlja na elementu iznad i daje horizontalni kontakt',()=>{
 const result=corpusAxisDragSnap([body(100,0,100)],[body(100,250,100)],[0,1,0],1000,[2000,2600,2000]);
 assert.equal(result.distance,150);assert.ok(result.contacts.some(c=>c.axis==='y'&&c.coordinate===250));
});
test('vertikalna osa ne dopušta ispod poda i privlači prema plafonu',()=>{
 assert.equal(corpusAxisDragSnap([body(100,200,100)],[],[0,1,0],-1000,[2000,2600,2000]).distance,-200);
 assert.equal(corpusAxisDragSnap([body(100,200,100)],[],[0,1,0],2290,[2000,2600,2000]).distance,2300);
});
test('X ograničenje ne dodaje pomak po drugoj osi',()=>{
 const r=corpusAxisDragSnap([body(100,200,300)],[body(500,200,300)],[1,0,0],1000,[2000,2600,2000]);
 assert.equal(r.distance,300);assert.deepEqual([1,0,0].map(v=>v*r.distance),[300,0,0]);
});
test('rotirana lokalna osa ostaje na svojoj pravoj i zaustavlja se na zidu',()=>{
 const d=Math.SQRT1_2;
 const r=corpusAxisDragSnap([body(100,0,100)],[],[d,0,d],1000,[500,2600,500]);
 assert.ok(Math.abs(r.distance*d-300)<1e-6);
});
