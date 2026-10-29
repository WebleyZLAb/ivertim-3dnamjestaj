import {decodeCorpusText} from './corpus-macro.ts';

export interface CorpusBinaryNode {
  kind: string; tag: number; offset: number; end: number;
  value?: string | number | boolean | null;
  children?: readonly CorpusBinaryNode[];
  rawHex?: string;
  decoded?: readonly (number | string)[];
}
export interface CorpusBinaryDocument { nodes: readonly CorpusBinaryNode[]; bytes: number; }
export class CorpusBinaryError extends Error {
  readonly offset:number; constructor(message:string, offset:number) { super(`${message} @${offset}`); this.offset=offset; this.name='CorpusBinaryError'; }
}
const hex=(b:Uint8Array)=>Array.from(b,v=>v.toString(16).padStart(2,'0')).join('');

/** X87 Extended (little endian). Raw bits remain available for exact preservation. */
export function decodeCorpusExtended(bytes:Uint8Array): number {
  if(bytes.length!==10) throw new Error('Extended zahtijeva 10 bajtova.');
  const d=new DataView(bytes.buffer,bytes.byteOffset,10), mantissa=d.getBigUint64(0,true),se=d.getUint16(8,true);
  const sign=se&0x8000?-1:1,exponent=se&0x7fff;
  if(exponent===0x7fff) return mantissa===0x8000000000000000n?sign*Infinity:NaN;
  if(mantissa===0n)return sign<0?-0:0;
  return sign*(Number(mantissa)/2**63)*2**((exponent===0?1:exponent)-16383);
}

/** Strict reader for the observed Corpus TReader streams, including explicitly mapped untagged fields. */
export function readCorpusBinary(bytes:Uint8Array):CorpusBinaryDocument {
  let at=0,total=0;
  const fail=(s:string):never=>{throw new CorpusBinaryError(s,at);};
  const take=(n:number)=>{if(!Number.isSafeInteger(n)||n<0||at+n>bytes.length)fail('Nepotpuni blok');const b=bytes.subarray(at,at+n);at+=n;return b;};
  const view=(n:number)=>{const b=take(n);return new DataView(b.buffer,b.byteOffset,b.byteLength);};
  const numberValue=(n:number):number|string=>Number.isFinite(n)?n:Number.isNaN(n)?'NaN':n<0?'-Infinity':'Infinity';
  const raw=(size:number,format:string):CorpusBinaryNode=>{
    const offset=at,b=take(size),d=new DataView(b.buffer,b.byteOffset,b.byteLength);let decoded:(number|string)[]|undefined;
    if(format==='byte-array')decoded=Array.from(b);
    if(format.includes('float32'))decoded=Array.from({length:size/4},(_,i)=>numberValue(d.getFloat32(i*4,true)));
    if(format==='float64-array')decoded=Array.from({length:size/8},(_,i)=>numberValue(d.getFloat64(i*8,true)));
    if(format==='extended-array')decoded=Array.from({length:size/10},(_,i)=>numberValue(decodeCorpusExtended(b.subarray(i*10,i*10+10))));
    if(format==='uint32-array')decoded=Array.from({length:size/4},(_,i)=>d.getUint32(i*4,true));
    return {kind:'raw-'+format,tag:-1,offset,end:at,rawHex:hex(b),...(decoded?{decoded}:{})};
  };
  function sequence(end:boolean,context:string,depth:number):CorpusBinaryNode[] {
    if(depth>128)fail('Predubok tok');const nodes:CorpusBinaryNode[]=[];
    while(at<bytes.length&&(!end||bytes[at]!==0)){
      const previous=nodes.at(-1);const nextContext=previous?.kind==='ident'&&typeof previous.value==='string'?previous.value:context;
      const node=value(nextContext,depth);nodes.push(node);
      if(node.kind==='string'&&typeof node.value==='string'){
        const key=context+'.'+node.value;
        const fixed:Record<string,readonly[number,string]>={
          'PriceMarginDefault.VAL':nodes.some(n=>n.value==='UQ')?[48,'float64-array']:[60,'extended-array'],
          'TBaseKota.dir':[16,'float32-array'],'TBaseKota.colo':[16,'float32-array'],
          'TKotaText.bord':[32,'record'], 'TNacrt.bkt':[1020,'uint32-array'],'TTlocrt.bkt':[1020,'uint32-array'],'TElementNacrt.bkt':[1020,'uint32-array'],'TexplodeSetup.str':[12,'float32-array'],
          'VB.siz':[12,'float32-array'],'VB.ucol':[16,'float32-array'],'VB.bcol':[16,'float32-array'],
          'VC.boj':[16,'float32-array'],'TpresjekUzorak.boj':[12,'float32-array'],'TpresjekSetup.boj':[12,'float32-array'],
        };
        const spec=fixed[key];if(spec){if(nodes[0]?.value!==0)fail('Nepotvrđena verzija sirovog zapisa '+context);nodes.push(raw(spec[0],spec[1]));continue;}
        if(node.value==='BMP'&&(context.startsWith('TCLB')||context==='TLBO')){
          if(nodes[0]?.value!==0)fail('Nepotvrđena verzija bitmap zapisa');
          const count=value(context,depth);nodes.push(count);
          if(typeof count.value!=='number'||!Number.isInteger(count.value)||count.value<0)fail('Neispravna veličina BMP bloka');
          nodes.push(raw(Number(count.value),'bitmap'));continue;
        }
        if((['TDocuSetup.top','TNacrt.tzk','TNacrt.tzc','TTlocrt.tzk','TTlocrt.tzc','TElementNacrt.tzk','TElementNacrt.tzc','VC.list'].includes(key))){
          const count=value(context,depth);nodes.push(count);
          if(typeof count.value!=='number'||!Number.isInteger(count.value)||count.value<0)fail('Neispravan broj stavki');
          const offset=at;if(take(1)[0]!==1)fail('Očekivana lista sirovih vrijednosti');
          const data=raw(Number(count.value)*(key==='VC.list'?12:1),key==='VC.list'?'xyz-float32-array':'byte-array');
          if(take(1)[0]!==0)fail('Nedostaje kraj sirove liste');
          nodes.push({kind:'list',tag:1,offset,end:at,children:[data]});continue;
        }
      }
    }
    if(end){if(at>=bytes.length)fail('Nedostaje kraj liste');at++;}
    return nodes;
  }
  function value(context:string,depth:number):CorpusBinaryNode {
    if(++total>1000000)fail('Previše vrijednosti');
    const offset=at,tag=take(1)[0]!;let kind='',data: string|number|boolean|null= null,children:CorpusBinaryNode[]|undefined,rawHex:string|undefined;
    switch(tag){
      case 0:kind='end';break;
      case 1:kind='list';children=sequence(true,context,depth+1);break;
      case 2:kind='int8';data=view(1).getInt8(0);break;
      case 3:kind='int16';data=view(2).getInt16(0,true);break;
      case 4:kind='int32';data=view(4).getInt32(0,true);break;
      case 5:{kind='extended';const b=take(10);rawHex=hex(b);data=numberValue(decodeCorpusExtended(b));break;}
      case 6:case 7:{kind=tag===6?'string':'ident';const b=take(take(1)[0]!);rawHex=hex(b);data=decodeCorpusText(b);break;}
      case 8:case 9:kind='boolean';data=tag===9;break;
      case 10:case 12:case 18:case 20:{const length=view(4).getUint32(0,true),b=take(length*(tag===18?2:1));rawHex=hex(b);kind=tag===10?'binary':tag===18?'wide-string':tag===20?'utf8-string':'long-string';data=tag===10?null:tag===18?new TextDecoder('utf-16le').decode(b):tag===20?new TextDecoder('utf-8',{fatal:true}).decode(b):decodeCorpusText(b);break;}
      case 11:{kind='set';children=[];while(at<bytes.length&&bytes[at]!==0){const p=at,b=take(take(1)[0]!);children.push({kind:'set-item',tag:-1,offset:p,end:at,value:decodeCorpusText(b),rawHex:hex(b)});}if(take(1)[0]!==0)fail('Nedostaje kraj skupa');break;}
      case 13:kind='nil';break;
      case 14:kind='collection';fail('Kolekcija nije potvrđena u Corpus podacima');
      case 15:{kind='single';const b=take(4);rawHex=hex(b);data=numberValue(new DataView(b.buffer,b.byteOffset,4).getFloat32(0,true));break;}
      case 16:case 19:{kind=tag===16?'currency':'int64';const b=take(8);rawHex=hex(b);const integer=new DataView(b.buffer,b.byteOffset,8).getBigInt64(0,true);const abs=integer<0n?-integer:integer;data=tag===16?`${integer<0n?'-':''}${abs/10000n}.${(abs%10000n).toString().padStart(4,'0')}`:integer.toString();break;}
      case 17:case 21:{kind=tag===17?'date':'double';const b=take(8);rawHex=hex(b);data=numberValue(new DataView(b.buffer,b.byteOffset,8).getFloat64(0,true));break;}
      default:fail('Nepoznat tip '+tag+' u '+context);
    }
    return {kind,tag,offset,end:at,...(children?{children}:{value:data}),...(rawHex!==undefined?{rawHex}:{})};
  }
  return {nodes:sequence(false,'',0),bytes:bytes.length};
}

/** Re-emits all typed and raw fields. Original string and floating encodings are retained. */
export function writeCorpusBinary(document:CorpusBinaryDocument):Uint8Array {
  const parts:Uint8Array[]=[];const emit=(a:readonly number[]|Uint8Array)=>parts.push(Uint8Array.from(a));
  const unhex=(s:string)=>{if(!/^(?:[a-f0-9]{2})*$/i.test(s))throw Error('Neispravan hex');return Uint8Array.from(s.match(/../g)??[],s=>parseInt(s,16));};
  const integer=(n:number,size:number)=>{const bits=size*8;if(!Number.isSafeInteger(n)||n<-(2**(bits-1))||n>=2**(bits-1))throw Error('Cijeli broj izvan raspona');const b=new Uint8Array(size),d=new DataView(b.buffer);if(size===1)d.setInt8(0,n);else if(size===2)d.setInt16(0,n,true);else d.setInt32(0,n,true);emit(b);};
  function node(n:CorpusBinaryNode){
    if(n.kind.startsWith('raw-')){emit(unhex(n.rawHex??''));return;}
    if(n.kind==='set-item'){const b=unhex(n.rawHex??'');if(b.length>255)throw Error('Predug string');emit([b.length]);emit(b);return;}
    emit([n.tag]);
    if(n.tag===1){for(const c of n.children??[])node(c);emit([0]);}
    else if(n.tag>=2&&n.tag<=4)integer(Number(n.value),2**(n.tag-2));
    else if(n.tag===6||n.tag===7){const b=unhex(n.rawHex??'');if(b.length>255)throw Error('Predug string');emit([b.length]);emit(b);}
    else if([10,12,18,20].includes(n.tag)){const b=unhex(n.rawHex??'');integer(n.tag===18?b.length/2:b.length,4);emit(b);}
    else if(n.tag===11){for(const c of n.children??[])node(c);emit([0]);}
    else if([5,15,16,17,19,21].includes(n.tag))emit(unhex(n.rawHex??''));
    else if(![0,8,9,13].includes(n.tag))throw Error('Nepodržan zapis '+n.tag);
  }
  for(const n of document.nodes)node(n);
  const out=new Uint8Array(parts.reduce((sum,b)=>sum+b.length,0));let at=0;for(const b of parts){out.set(b,at);at+=b.length;}return out;
}
export function corpusBinaryScalar(node:CorpusBinaryNode|undefined): string|number|boolean|null|undefined {return node?.value;}
