import { readFile,writeFile } from 'node:fs/promises';
import path from 'node:path';
import { decodeCorpusText } from '../lib/corpus-macro.ts';
import { parseCorpusCmk } from '../lib/corpus-cmk.ts';
import { parseCorpusScriptMenu } from '../lib/corpus-script-library.ts';
const root='public/local-corpus';
const m=JSON.parse(await readFile(root+'/manifest.json','utf8'));
const paths=new Map<string,string>(m.files.map((p:string)=>[p.toLowerCase(),p]));
const scriptEntries=[];
for(const menu of m.scripts.filter((p:string)=>/\.toc$/i.test(p))) {
 for(const entry of parseCorpusScriptMenu(decodeCorpusText(await readFile(root+'/'+menu)))) {
  const relative=entry.script.replaceAll('\\','/');
  const resolved=[path.posix.join(path.posix.dirname(menu),relative),path.posix.join('skripte',relative)].map(p=>paths.get(p.toLowerCase())).find(Boolean)??null;
  scriptEntries.push({...entry,menu,resolved});
 }
}
const macroReports=[];
for(const p of m.macros) {
 const bytes=await readFile(root+'/'+p); const doc=parseCorpusCmk(decodeCorpusText(bytes));
 macroReports.push({path:p,bytes:bytes.length,sections:doc.sections.map(s=>({name:s.name,entries:s.entries.length})),unparsed:doc.unparsedLines});
}
const report={macroReports,scriptEntries};
m.scriptEntries=scriptEntries;
await writeFile(root+'/manifest.json',JSON.stringify(m));
await writeFile(root+'/script-analysis.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({macros:m.macros.length,empty:macroReports.filter(r=>!r.bytes).map(r=>r.path),cps:m.scripts.filter((p:string)=>/\.cps$/i.test(p)),toc:m.scripts.filter((p:string)=>/\.toc$/i.test(p)).length,menuEntries:scriptEntries.length,missing:scriptEntries.filter(e=>!e.resolved).length,unparsed:macroReports.filter(r=>r.unparsed.length).map(r=>({path:r.path,count:r.unparsed.length}))},null,2));
