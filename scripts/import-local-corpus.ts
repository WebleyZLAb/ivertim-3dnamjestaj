import { loadCorpusVariableDefinitions } from "./corpus-variable-config.ts";
import { parseCorpusScriptMenu } from "../lib/corpus-script-library.ts";
import { decodeCorpusText } from "../lib/corpus-macro.ts";
import { readdir, readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseCorpusMaterialCatalog } from '../lib/corpus-material-library.ts';
import { parseCorpusEdges } from '../lib/corpus-edge-library.ts';
const source = path.resolve(process.argv[2] ?? 'C:/CorpusSoftware64/CorpusSolutions');
const target = path.resolve('public/local-corpus');
const archive = path.resolve('.local-corpus-archive');
async function walk(root: string): Promise<string[]> {
  const entries = await readdir(root, { withFileTypes: true });
  const groups = await Promise.all(entries.filter(e => !e.isSymbolicLink()).map(async e => e.isDirectory() ? walk(path.join(root,e.name)) : [path.join(root,e.name)]));
  return groups.flat();
}
const slash = (p: string) => p.replaceAll('\\','/');
const catalogs = []; const elements: string[] = []; const copied: string[] = []; const edges = [];
for (const folder of ['elmtex','Elmsav','Makro','skripte','Potrosni']) {
  for (const file of await walk(path.join(source,folder))) {
    const relative = slash(path.relative(source,file));
    const destination = path.join(target,relative);
    await mkdir(path.dirname(destination), { recursive:true });
    await copyFile(file,destination); copied.push(relative);
    if (/^matdat\.(mxc|k3x)$/i.test(path.basename(file))) catalogs.push(parseCorpusMaterialCatalog(await readFile(file,'utf8'),relative));
    if (/\.e3d$/i.test(file)) elements.push(relative);
  }
}
for (const file of ['05mm.cxm','1mm.cxm','2mm.cxm']) {
  const relative = 'Potrosni/'+file;
  const xml = await readFile(path.join(source,relative),'utf8');
  edges.push(...parseCorpusEdges(xml,relative));
  await mkdir(path.join(target,'Potrosni'),{recursive:true});
  await copyFile(path.join(source,relative),path.join(target,relative)); copied.push(relative);
}
elements.sort((a,b)=>a.localeCompare(b,'sr'));
const uniqueFiles = [...new Set(copied)];
const macros = uniqueFiles.filter(p => /\.cmk(?:\.txt)?$/i.test(p));
const scripts = uniqueFiles.filter(p => /\.(cps|toc)$/i.test(p));
const scriptEntries = [];
const paths = new Map(uniqueFiles.map(p=>[p.toLowerCase(),p]));
for (const menu of scripts.filter(p=>/\.toc$/i.test(p))) {
  for (const entry of parseCorpusScriptMenu(decodeCorpusText(await readFile(path.join(target,menu))))) {
    const relative = entry.script.replaceAll('\\','/');
    const candidates = [path.posix.join(path.posix.dirname(menu),relative),path.posix.join('skripte',relative)];
    const resolved = candidates.map(p=>paths.get(p.toLowerCase())).find(Boolean) ?? null;
    scriptEntries.push({...entry,menu,resolved});
  }
}
const archived: string[] = [];
for (const folder of ['Modeli','katalog','sobasav','config','system','export','Masine','MRP','OUtDoc','Template','Tool','UpdateInfo']) {
  for (const file of await walk(path.join(source,folder))) {
    const relative = slash(path.relative(source,file));
    const destination = path.join(archive,relative);
    await mkdir(path.dirname(destination),{recursive:true});
    await copyFile(file,destination); archived.push(relative);
  }
  console.log('Arhivirano: '+folder);
}
await mkdir(archive,{recursive:true});
await copyFile(path.join(source,'Default.CPO'),path.join(archive,'Default.CPO')); archived.push('Default.CPO');
await writeFile(path.join(archive,'inventory.json'),JSON.stringify({source,importedAt:new Date().toISOString(),files:archived},null,2));
const variableDefinitions = await loadCorpusVariableDefinitions(path.join(source, "config"));
const manifest = { variableDefinitions, version:1, importedAt:new Date().toISOString(), catalogs,elements,edges,macros,scripts,scriptEntries,files:uniqueFiles };
await writeFile(path.join(target,'manifest.json'), JSON.stringify(manifest));
console.log(JSON.stringify({catalogs:catalogs.length,materials:catalogs.reduce((s,c)=>s+c.records.length,0),elements:elements.length,edges:edges.length,edgeGroups:edges.reduce((a,e)=>({...a,[e.thickness]:(a[e.thickness]??0)+1}),{} as Record<string,number>),files:uniqueFiles.length,macros:macros.length,scripts:scripts.length,archived:archived.length}));
