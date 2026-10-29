import {readFile,writeFile,mkdir} from "node:fs/promises";
import path from "node:path";
import {decodeCorpusText} from "../lib/corpus-macro.ts";
import {parseCorpusE3d} from "../lib/corpus-s3d.ts";
import {inspectCorpusGeometryIssues} from "../lib/corpus-parametric.ts";

// Read-only inventory of the current evaluator, not a manufacturing/resize certification.
const manifest=JSON.parse(await readFile("public/local-corpus/manifest.json","utf8")) as {elements:string[]};
const candidates=manifest.elements.filter(file=>!/(^|\/)Rubbish\//i.test(file));
const limit=process.argv[2]===undefined?candidates.length:Number(process.argv[2]);
if(!Number.isInteger(limit)||limit<1)throw new Error("Limit must be a positive integer.");
const files=candidates.slice(0,limit);
const missing=new Map<string,number>(),families=new Map<string,number>(),reasons=new Map<string,number>();
let parsed=0,fullyResolved=0,formulaTargetsUnresolved=0;
const failures:Array<{file:string;error:string}>=[];
const examples:Array<{file:string;issues:number;missing:string[]}> = [];
for(const file of files){
 try {
  const roots=parseCorpusE3d(decodeCorpusText(await readFile(path.join("public/local-corpus",file)))).elements;
  if(!roots.length)throw new Error("No root element.");
  const issues=roots.flatMap(root=>inspectCorpusGeometryIssues(root));
  parsed++;
  if(!issues.length)fullyResolved++;
  formulaTargetsUnresolved+=issues.length;
  const fileMissing=new Set(issues.flatMap(issue=>issue.missingReferences??[]));
  for(const key of fileMissing)missing.set(key,(missing.get(key)??0)+1);
  const fileFamilies=new Set([...fileMissing].map(key=>/^CLR[XYHW]$/i.test(key)?"CLR":key.startsWith("EVAR.")?"EVAR":key.endsWith(".DE")?"DE":key));
  for(const key of fileFamilies)families.set(key,(families.get(key)??0)+1);
  for(const key of new Set(issues.map(issue=>issue.reason)))reasons.set(key,(reasons.get(key)??0)+1);
  if(issues.length&&examples.length<20)examples.push({file,issues:issues.length,missing:[...fileMissing]});
 }catch(error){failures.push({file,error:error instanceof Error?error.message:String(error)});}
 if((parsed+failures.length)%100===0)console.log(JSON.stringify({processed:parsed+failures.length,total:files.length,fullyResolved,failures:failures.length}));
}
const sorted=(map:Map<string,number>)=>[...map].sort((a,b)=>b[1]-a[1]||a[0].localeCompare(b[0]));
const report={scope:"Active manifest entries excluding Rubbish; current geometric expression graph only. Zero issues does not prove contour, machining, export, or manufacturing correctness.",candidates:candidates.length,requested:files.length,parsed,fullyResolved,formulaTargetsUnresolved,filesByReason:sorted(reasons),filesByMissingFamily:sorted(families),filesByMissingReference:sorted(missing),failures,examples};
await mkdir(".local-corpus-archive/analysis",{recursive:true});
await writeFile(".local-corpus-archive/analysis/parametric-library-readiness.json",JSON.stringify(report,null,2));
console.log(JSON.stringify({...report,examples:undefined,filesByMissingReference:report.filesByMissingReference.slice(0,15),filesByMissingFamily:report.filesByMissingFamily.slice(0,15)},null,2));
