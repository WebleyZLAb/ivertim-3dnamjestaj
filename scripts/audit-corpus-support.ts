import {readCorpusBinary} from "../lib/corpus-binary.ts";
import {corpusBinaryObjects} from "../lib/corpus-binary-schema.ts";
import {readFile,readdir,writeFile,mkdir} from 'node:fs/promises';
import path from 'node:path';
import {decodeCorpusText} from '../lib/corpus-macro.ts';
const root='.local-corpus-archive';
const folders=['config','export','katalog','Masine','system','Template','Tool'];
async function walk(p:string):Promise<string[]> {const es=await readdir(p,{withFileTypes:true});return(await Promise.all(es.filter(e=>!e.isSymbolicLink()).map(e=>e.isDirectory()?walk(path.join(p,e.name)):[path.join(p,e.name)]))).flat();}
const records=[];
for(const folder of folders)for(const file of await walk(path.join(root,folder))){
 const b=await readFile(file);const relative=file.replaceAll('\\','/'); const ext=path.extname(file).toLowerCase();
 const wide=b[0]===0xff&&b[1]===0xfe;const binary=!wide&&b.subarray(0,Math.min(b.length,4096)).includes(0);let status='binary-preserved';let details:unknown=null;
 if(['.png','.jpg','.bmp','.tga','.dll','.db','.pdf','.xlsx','.ods'].includes(ext)){status=ext==='.dll'?'runtime-library':ext==='.db'?'database':ext==='.pdf'?'document':ext==='.xlsx'||ext==='.ods'?'spreadsheet':'image';}
 else if(!binary){const text=wide?b.subarray(2).toString('utf16le'):decodeCorpusText(b);status='text-reviewed';details={lines:text.split(/\r?\n/).length,sections:[...text.matchAll(/^\[([^\]]+)]/gm)].map(m=>m[1]),keys:[...text.matchAll(/^([^\s;#\/][^=\r\n]{0,80})=/gm)].map(m=>m[1]!.trim()),preview:text.slice(0,600)};}
 else if(b[0]===7 && ext!=='.ccf') {try{const doc=readCorpusBinary(b);const objects=corpusBinaryObjects(doc);if(doc.nodes.length!==2||doc.nodes[1]?.end!==b.length)throw Error("Nepotpuno stablo");status='binary-structured';details={objects:objects.length,classes:objects.map(o=>o.className),fields:objects.map(o=>({className:o.className,keys:o.fields.map(f=>f.name)}))};}catch(e){status='binary-partial';details={error:String(e)};}}
 records.push({file:relative,bytes:b.length,status,details});
}
// Potrosni: all XML/auxiliary files are inspected too; large image catalog is inventoried above.
for(const file of await walk('public/local-corpus/Potrosni')){const b=await readFile(file);const text=decodeCorpusText(b);const xml=text.trimStart().startsWith('<');records.push({file:file.replaceAll('\\','/'),bytes:b.length,status:xml?'xml-reviewed':'binary-preserved',details:xml?{root:/<([A-Za-z_][\w.-]*)/.exec(text)?.[1],potItems:(text.match(/<PotItem\b/g)??[]).length,data:(text.match(/<Data\b/g)??[]).length}:null});}
await mkdir(root+'/analysis',{recursive:true});
await writeFile(root+'/analysis/support-folder-audit.json',JSON.stringify(records,null,2));
console.log(JSON.stringify({files:records.length,statuses:records.reduce((a,r)=>(a[r.status]=(a[r.status]??0)+1,a),{} as Record<string,number>),config:records.filter(r=>r.file.includes('/config/')&&!['image','spreadsheet'].includes(r.status)).map(r=>({file:r.file,status:r.status}))},null,2));
