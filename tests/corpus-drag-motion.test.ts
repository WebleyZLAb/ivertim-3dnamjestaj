import test from 'node:test';import assert from 'node:assert/strict';
import {createCorpusDragMotion,resolveCorpusDragMotion} from '../lib/corpus-drag-motion.ts';
import {parseCorpusE3d} from '../lib/corpus-s3d.ts';import type {DragBody} from '../lib/corpus-drag-snap.ts';
const e=parseCorpusE3d('<ELEMENTFILE><ELEMENT ENAME="A"><DASKE/></ELEMENT></ELEMENTFILE>').elements[0]!;
const body=(x:number,y=0):DragBody=>({element:e,min:[x,y,100],max:[x+100,y+100,200]});
const config={origin:[0,0,0] as [number,number,number],room:[2000,2600,2000] as [number,number,number],step:10,obstacles:[body(500)],bypass:false};
test('Alt može zaobići prepreku i započeti prevlačenje bez snapa',()=>{
 const state=createCorpusDragMotion([body(0)],true);
 const result=resolveCorpusDragMotion(state,[812.345,0,0],{...config,bypass:true});
 assert.equal(result.delta[0],812.345);assert.deepEqual(result.contacts,[]);
});
test('pritisak Alta poslije blokade oslobađa prolaz tokom istog poteza',()=>{
 const blocked=resolveCorpusDragMotion(createCorpusDragMotion([body(0)]),[800,0,0],config);
 assert.equal(blocked.delta[0],400);
 const through=resolveCorpusDragMotion(blocked.state,[800,0,0],{...config,bypass:true});
 assert.equal(through.delta[0],800);assert.deepEqual(through.contacts,[]);
});
test('puštanje Alta s druge strane ne vraća element na početnu prepreku',()=>{
 const through=resolveCorpusDragMotion(createCorpusDragMotion([body(0)]),[800,0,0],{...config,bypass:true});
 const released=resolveCorpusDragMotion(through.state,[800,0,0],config);
 assert.equal(released.delta[0],800);
 const returning=resolveCorpusDragMotion(released.state,[0,0,0],config);
 assert.equal(returning.delta[0],600); // sada se dodiruje suprotna strana prepreke
});
test('Alt se može pustiti unutar preklopa i izaći, ali naredna prepreka ostaje aktivna',()=>{
 const options={...config,obstacles:[body(500),body(1000)]};
 const inside=resolveCorpusDragMotion(createCorpusDragMotion([body(0)]),[550,0,0],{...options,bypass:true});
 const released=resolveCorpusDragMotion(inside.state,[550,0,0],options);
 assert.equal(released.delta[0],550);
 assert.equal(resolveCorpusDragMotion(released.state,[1500,0,0],options).delta[0],900);
});
test('isti prelaz Alt/snap radi preko X ose bez promjene druge dvije koordinate',()=>{
 const options={...config,axis:[1,0,0] as [number,number,number]};
 const through=resolveCorpusDragMotion(createCorpusDragMotion([body(0)]),[800,0,0],{...options,bypass:true});
 const released=resolveCorpusDragMotion(through.state,[800,0,0],options);
 assert.deepEqual(released.delta,[800,0,0]);
 assert.deepEqual(resolveCorpusDragMotion(released.state,[0,0,0],options).delta,[600,0,0]);
});
test('Alt preko Y ose dopušta prolaz kroz pod, a grupa ima iste pomake',()=>{
 const options={...config,obstacles:[],axis:[0,1,0] as [number,number,number],bypass:true};
 const result=resolveCorpusDragMotion(createCorpusDragMotion([body(0),body(200)]),[0,-250.5,0],options);
 assert.deepEqual(result.delta,[0,-250.5,0]);
 const released=resolveCorpusDragMotion(result.state,[0,-250.5,0],{...options,bypass:false});
 assert.equal(released.state.moving[0]!.min[1],-250.5);
 assert.equal(released.state.moving[1]!.min[1],-250.5);
 assert.equal(released.state.moving[1]!.min[0]-released.state.moving[0]!.min[0],200);
});
