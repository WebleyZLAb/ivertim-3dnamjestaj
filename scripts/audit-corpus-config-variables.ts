import {readFile,writeFile} from 'node:fs/promises';
import {parseCorpusE3d,flattenCorpusS3dElements} from '../lib/corpus-s3d.ts';
import {decodeCorpusText} from '../lib/corpus-macro.ts';
import {analyzeCorpusAssignments,type CorpusExpressionValue} from '../lib/corpus-expression.ts';
const base='.local-corpus-archive/config/';
const constantText=decodeCorpusText(await readFile(base+'SysConst.dat'));
const constants:Record<string,number>={};for(const line of constantText.split(/\r?\n/)){const m=/^\s*(SC_\w+)\s*=\s*(-?[\d.]+)\s*$/i.exec(line);if(m)constants[m[1]!.toUpperCase()]=Number(m[2]);}
const definitionFiles=decodeCorpusText(await readFile(base+'vvf.dat')).split(/\r?\n/).map(s=>s.trim()).filter(Boolean);
const definitions: {name:string;source:string;fields:Record<string,string>}[]=[];
for(const file of definitionFiles){const text=decodeCorpusText(await readFile(base+file));let name='',fields:Record<string,string>={};const flush=()=>{if(name)definitions.push({name,source:file,fields:{...fields}});};for(const raw of text.split(/\r?\n/)){const line=raw.trim();if(/^(\/\/|;|#)/.test(line))continue;const h=/^\[([^\]]+)]$/.exec(line);if(h){flush();name=h[1]!;fields={};continue;}const i=line.indexOf('=');if(i>0)fields[line.slice(0,i).trim()]=line.slice(i+1).trim();}flush();}
const manifest=JSON.parse(await readFile('public/local-corpus/manifest.json','utf8'));
let elements=0,variables=0,withSC=0,missingBefore=0,missingAfter=0,fixed=0;const examples=[];const missingCounts:Record<string,number>={};
for(const file of manifest.elements){const doc=parseCorpusE3d(decodeCorpusText(await readFile('public/local-corpus/'+file)));for(const e of flattenCorpusS3dElements(doc.elements)){
 elements++;variables+=Object.keys(e.variables).length;
 const assignments=Object.entries(e.variables).map(([name,expression])=>({name,expression}));
 const context:Record<string,CorpusExpressionValue>={};
 for(const [key,value] of Object.entries({X:e.position[0],Y:e.position[1],Z:e.position[2],V:e.height,S:e.width,D:e.depth,VISINA:e.height,SIRINA:e.width,DUBINA:e.depth}))if(value!==null)context[key]=value;
 const before=analyzeCorpusAssignments(assignments,context),after=analyzeCorpusAssignments(assignments,{...constants,...context});
 if(assignments.some(a=>/\bSC_/i.test(a.expression)))withSC++;
 missingBefore+=before.filter(a=>a.status==='missing').length;missingAfter+=after.filter(a=>a.status==='missing').length;
 for(let i=0;i<before.length;i++){const b=before[i]!,a=after[i]!;if(b.status==='missing')for(const n of b.missing)missingCounts[n]=(missingCounts[n]??0)+1;if(b.status!=='resolved'&&a.status==='resolved'){fixed++;if(examples.length<8)examples.push({file,element:e.name,name:a.name,value:a.value,missingBefore:b.missing});}}
}}
const report={constants,definitionFiles,definitionCount:definitions.length,definitions,elements,variables,withSC,missingBefore,missingAfter,fixed,examples,topMissing:Object.entries(missingCounts).sort((a,b)=>b[1]-a[1]).slice(0,20)};
await writeFile('.local-corpus-archive/analysis/config-variable-map.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,definitions:undefined},null,2));
