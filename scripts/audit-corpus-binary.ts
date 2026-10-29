import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {readCorpusBinary,writeCorpusBinary} from '../lib/corpus-binary.ts';
import {corpusBinaryObjects,corpusBinaryVariables,corpusBinaryTools,corpusBinaryDrillPresets} from '../lib/corpus-binary-schema.ts';
import {createHash} from 'node:crypto';
interface AuditResult {file:string;bytes:number;exact?:boolean;className?:string;objects?:number;variables?:number;tools?:number;drillPresets?:number;hash?:string;error?:string;}
const inventory: {file:string;status:string}[]=JSON.parse(await readFile('.local-corpus-archive/analysis/support-folder-audit.json','utf8'));
const files=inventory.filter(r=>['binary-partial','token-stream-reviewed','binary-structured'].includes(r.status)).map(r=>r.file);
files.push('public/local-corpus/Potrosni/TDPKS.dkps','public/local-corpus/Makro/MakroCollection.dat');
const results:AuditResult[]=[];
await mkdir('.local-corpus-archive/analysis/binary',{recursive:true});
for(const file of files){
  const bytes=await readFile(file);
  try{
    const document=readCorpusBinary(bytes);
    if(document.nodes.length!==2||document.nodes[0]?.kind!=='ident'||document.nodes[1]?.kind!=='list'||document.nodes[1].end!==bytes.length)throw Error('Nepotpuno korijensko stablo');
    if(!Buffer.from(writeCorpusBinary(document)).equals(bytes))throw Error('Bajtovi nisu isti');
    const objects=corpusBinaryObjects(document),className=String(document.nodes[0].value);
    const variables=className==='EVarList'?corpusBinaryVariables(document):undefined;
    const tools=className==='TCTLIST'?corpusBinaryTools(document):undefined;
    const drillPresets=className==='PDRLREC'?corpusBinaryDrillPresets(document):undefined;
    const semantic={objects,variables,tools,drillPresets};
    const name=file.replaceAll('\\','/').replaceAll('/','__');
    await writeFile('.local-corpus-archive/analysis/binary/'+name+'.json',JSON.stringify({document,semantic},null,2));
    results.push({file,bytes:bytes.length,exact:true,className,objects:objects.length,variables:variables?.length,tools:tools?.length,drillPresets:drillPresets?.length,hash:createHash('sha256').update(bytes).digest('hex')});
  }catch(error){results.push({file,bytes:bytes.length,error:String(error)});}
}
await writeFile('.local-corpus-archive/analysis/binary-reader-results.json',JSON.stringify(results,null,2));
console.log(JSON.stringify({files:results.length,exact:results.filter(r=>r.exact).length,failures:results.filter(r=>r.error),variables:results.reduce((n,r)=>n+(r.variables??0),0),tools:results.reduce((n,r)=>n+(r.tools??0),0),drillPresets:results.filter(r=>r.drillPresets!==undefined).map(r=>({file:r.file,count:r.drillPresets}))},null,2));
if(results.some(r=>r.error))process.exitCode=1;
