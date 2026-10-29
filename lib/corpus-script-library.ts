export interface CorpusScriptMenuEntry { section: string; name: string; script: string; icon: string; fields: Readonly<Record<string,string>>; }
/** TOC registruje dugmad i putanje, ne sadrži izvorni kod skripte. */
export function parseCorpusScriptMenu(text: string): CorpusScriptMenuEntry[] {
  const entries: CorpusScriptMenuEntry[]=[];
  let section='', fields: Record<string,string>={};
  const flush=()=> { if(section) entries.push({section,name:fields.SCRIPTNAME || section,script:fields.SCFILE || '',icon:fields.ICON || '',fields:{...fields}}); };
  for(const raw of text.replace(/^\uFEFF/,'').split(/\r?\n/)) {
    const line=raw.trim(); if(!line || /^(;|#|\/\/)/.test(line)) continue;
    const header=/^\[([^\]]+)\]$/.exec(line);
    if(header) {flush();section=header[1]!;fields={};continue;}
    const i=line.indexOf('='); if(i>0) fields[line.slice(0,i).trim().toUpperCase()]=line.slice(i+1).trim();
  }
  flush(); return entries;
}
