import test from 'node:test';import assert from 'node:assert/strict';
import {readCorpusBinary,writeCorpusBinary,decodeCorpusExtended} from '../lib/corpus-binary.ts';
import {corpusBinaryVariables,corpusBinaryObjects,corpusBinaryTools} from '../lib/corpus-binary-schema.ts';
const s=(v:string)=>[6,v.length,...Array.from(v,c=>c.charCodeAt(0))];
const id=(v:string)=>[7,v.length,...Array.from(v,c=>c.charCodeAt(0))];
const i=(v:number)=>[2,v&255];const list=(...v:number[][])=>[1,...v.flat(),0];
const obj=(name:string,fields:number[])=>[...id(name),...list(i(0),fields)];
const extended=(value:number)=>{const b=new Uint8Array(10),d=new DataView(b.buffer);if(value===0){d.setUint16(8,Object.is(value,-0)?0x8000:0,true);return b;}const e=Math.floor(Math.log2(Math.abs(value)));d.setBigUint64(0,BigInt(Math.abs(value)/2**e*2**63),true);d.setUint16(8,e+16383+(value<0?0x8000:0),true);return b;};
test('typed integers, wide strings, exact currency and x87 values retain original encodings',()=>{
 const b=new Uint8Array([3,0x00,0x80,4,0xff,0xff,0xff,0x7f,18,2,0,0,0,0x10,1,0x61,0,16,...Array(8).fill(255),5,...extended(2.5)]);
 const doc=readCorpusBinary(b);assert.equal(doc.nodes[0]!.value,-32768);assert.equal(doc.nodes[1]!.value,2147483647);assert.equal(doc.nodes[2]!.value,'Đa');assert.equal(doc.nodes[3]!.value,'-0.0001');assert.equal(doc.nodes[4]!.value,2.5);
 const expected=b.slice();b.fill(0);assert.deepEqual(writeCorpusBinary(doc),expected);
});
test('x87 decoder handles signs, zero and infinity without dropping bit patterns',()=>{
 assert.equal(decodeCorpusExtended(extended(-12.5)),-12.5);assert.ok(Object.is(decodeCorpusExtended(extended(-0)),-0));
 const b=new Uint8Array(10);const d=new DataView(b.buffer);d.setBigUint64(0,0x8000000000000000n,true);d.setUint16(8,0x7fff,true);assert.equal(decodeCorpusExtended(b),Infinity);
 const stream=Uint8Array.from([5,...b]);assert.deepEqual(writeCorpusBinary(readCorpusBinary(stream)),stream);assert.throws(()=>decodeCorpusExtended(new Uint8Array(8)));
});
test('EVarList exposes parameters and preserves unknown positional flags',()=>{
 const group=list(i(3),s('TYPE'),s('2'),i(0),s('Type of back'),i(0),[8],s('Construction'),[9],s('Choose back'),i(0),[8]);
 const bytes=Uint8Array.from(obj('EVarList',[...s('Items'),...list(obj('Var',[...s('Group'),...group,...s('list'),...list(s('None=0'),s('Solid=2'))]))]));
 const d=readCorpusBinary(bytes),vars=corpusBinaryVariables(d);assert.equal(vars.length,1);assert.equal(vars[0]!.name,'TYPE');assert.equal(vars[0]!.storedValue,'2');assert.deepEqual(vars[0]!.options,['None=0','Solid=2']);assert.equal(vars[0]!.positional.length,12);assert.deepEqual(writeCorpusBinary(d),bytes);
 const broken=Uint8Array.from(obj('EVarList',[...s('Items'),...list(obj('Var',[...s('Group'),...list(i(3),s('x'))]))]));assert.throws(()=>corpusBinaryVariables(readCorpusBinary(broken)),/Group/);
});
test('raw price layouts decode six doubles or six extended values and preserve category names',()=>{
 for(const modern of [false,true]){
  const values=new Uint8Array(modern?48:60);const d=new DataView(values.buffer);
  for(let j=0;j<6;j++){if(modern)d.setFloat64(j*8,j+1.5,true);else values.set(extended(j+1.5),j*10);}
  const data=Uint8Array.from(obj('PriceMarginDefault',[...(modern?[...s('UQ'),...i(1)]:[]),...s('ACT'),...i(0),...s('VAL'),...values,...s('CIJ'),...list(s('Base'))]));
  const tree=readCorpusBinary(data);const o=corpusBinaryObjects(tree)[0]!;assert.deepEqual(o.fields.find(f=>f.name==='VAL')!.values[0]!.decoded,[1.5,2.5,3.5,4.5,5.5,6.5]);assert.deepEqual(writeCorpusBinary(tree),data);
 }
});
test('raw coordinate arrays include zeros instead of ending lists at zero bytes',()=>{
 const xyz=new Uint8Array(24),d=new DataView(xyz.buffer);[0,0,1,2,3,0].forEach((v,i)=>d.setFloat32(i*4,v,true));
 const bytes=Uint8Array.from(obj('VC',[...s('boj'),...new Uint8Array(16),...s('list'),...i(2),1,...xyz,0]));const tree=readCorpusBinary(bytes);assert.equal(tree.nodes.length,2);assert.deepEqual(corpusBinaryObjects(tree)[0]!.fields[1]!.values[1]!.children![0]!.decoded,[0,0,1,2,3,0]);assert.deepEqual(writeCorpusBinary(tree),bytes);
});
test('tool extraction validates declared count rather than silently discarding tools',()=>{
 const bytes=Uint8Array.from(obj('TCTLIST',[...s('cnt'),...i(1),...list(i(0),obj('TACTD',[...s('na'),...s('D'),...s('to'),...i(3),...s('dia'),5,...extended(5)]))]));const tools=corpusBinaryTools(readCorpusBinary(bytes));assert.equal(tools[0]!.toolNumber,3);assert.equal(tools[0]!.diameter,5);
 const bad=Uint8Array.from(obj('TCTLIST',[...s('cnt'),...i(2),...list()]));assert.throws(()=>corpusBinaryTools(readCorpusBinary(bad)),/Broj alata/);
});
test('rejects truncation, unsupported tags and invalid sized raw blocks',()=>{
 for(const b of [[255],[3,1],[6,9,65],[1,2,1],[20,255,255,255,127],[14]])assert.throws(()=>readCorpusBinary(Uint8Array.from(b)));
 const bad=Uint8Array.from(obj('TCLBL',[...s('BMP'),...i(-1)]));assert.throws(()=>readCorpusBinary(bad),/BMP/);
});

test('unknown raw-layout revisions and out-of-range integer edits are rejected',()=>{
 const bytes=Uint8Array.from([...id('PriceMarginDefault'),...list(i(1),[...s('VAL'),...new Uint8Array(60)])]);assert.throws(()=>readCorpusBinary(bytes),/verzija/);
 assert.throws(()=>writeCorpusBinary({bytes:2,nodes:[{kind:'int8',tag:2,offset:0,end:2,value:128}]}),/raspona/);
});
