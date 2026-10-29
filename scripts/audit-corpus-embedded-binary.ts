import {readFile,readdir,writeFile} from 'node:fs/promises';import path from 'node:path';import {createHash} from 'node:crypto';
import {readCorpusBinary,writeCorpusBinary} from '../lib/corpus-binary.ts';import {corpusBinaryObjects} from '../lib/corpus-binary-schema.ts';
async function walk(p:string):Promise<string[]>{return(await Promise.all((await readdir(p,{withFileTypes:true})).filter(e=>!e.isSymbolicLink()).map(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]))).flat();}
const unique=new Map<string,{file:string;attribute:string;hex:string;occurrences:number}>();let total=0;
for(const file of await walk('public/local-corpus/Potrosni'))if(/\.(cxm|pxm)$/i.test(file)){
 const text=await readFile(file,'utf8');for(const m of text.matchAll(/\b(DPKSEXTRA|FKOMPARL2)="([0-9a-f]+)"/gi)){
  total++;const hash=createHash('sha256').update(m[2]!.toLowerCase()).digest('hex');const previous=unique.get(hash);if(previous)previous.occurrences++;else unique.set(hash,{file,attribute:m[1]!,hex:m[2]!,occurrences:1});
 }}
const classes:Record<string,number>={},failures=[];let decoded=0;
for(const item of unique.values()){
 try{if(item.hex.length%2)throw Error('Neparan broj HEX cifara');const bytes=Buffer.from(item.hex,'hex');const doc=readCorpusBinary(bytes);if(doc.nodes.length!==2||doc.nodes[1]?.end!==bytes.length)throw Error('Incomplete root');if(!Buffer.from(writeCorpusBinary(doc)).equals(bytes))throw Error('Roundtrip mismatch');const objects=corpusBinaryObjects(doc);const cls=objects[0]?.className??'unknown';classes[cls]=(classes[cls]??0)+1;decoded++;}
 catch(error){failures.push({file:item.file,attribute:item.attribute,bytes:item.hex.length/2,occurrences:item.occurrences,error:String(error)});}
}
const result={total,unique:unique.size,decoded,classes,failures};await writeFile('.local-corpus-archive/analysis/embedded-binary-results.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));

if(failures.length)process.exitCode=1;
