import type {CorpusBinaryDocument,CorpusBinaryNode} from './corpus-binary.ts';
export interface CorpusBinaryField {name:string; values:readonly CorpusBinaryNode[];}
export interface CorpusBinaryObject {className:string;version:number;offset:number;end:number;fields:readonly CorpusBinaryField[];}
export function corpusBinaryObjects(document:CorpusBinaryDocument):CorpusBinaryObject[] {
  const objects:CorpusBinaryObject[]=[];
  function visit(nodes:readonly CorpusBinaryNode[]){
    for(let i=0;i<nodes.length;i++){
      const id=nodes[i]!,body=nodes[i+1];
      if(id.kind==='ident'&&typeof id.value==='string'&&body?.kind==='list'){
        const parts=body.children??[],version=parts[0]?.value;
        if(typeof version!=='number'||!Number.isInteger(version))throw Error(`Nedostaje verzija ${id.value} @${id.offset}`);
        const fields:CorpusBinaryField[]=[];
        for(let p=1;p<parts.length;){
          const name=parts[p++]!;if(name.kind!=='string'||typeof name.value!=='string')throw Error(`Neimenovano polje ${id.value} @${name.offset}`);
          if(!parts[p])throw Error(`Nedostaje vrijednost ${id.value}.${name.value}`);
          let count=1;const first=parts[p]!,next=parts[p+1];
          if(first.kind==='ident'&&next?.kind==='list')count=2;
          else if(typeof first.value==='number'&&(next?.kind==='list'||next?.kind.startsWith('raw-')))count=2;
          if(id.value==='PDRLREC'&&name.value==='list'&&typeof parts[p+1]?.value==='number'&&parts[p+2]?.kind==='list')count=3;
          fields.push({name:name.value,values:parts.slice(p,p+count)});p+=count;
        }
        objects.push({className:id.value,version,offset:id.offset,end:body.end,fields});
      }
      if(id.children)visit(id.children);
    }
  }
  visit(document.nodes);return objects;
}
export function corpusBinaryField(object:CorpusBinaryObject,name:string):readonly CorpusBinaryNode[] {
  const found=object.fields.filter(f=>f.name===name);if(found.length>1)throw Error(`Dvosmisleno polje ${object.className}.${name}`);return found[0]?.values??[];
}
export interface CorpusBinaryVariable {
  name:string;storedValue:string|number|boolean|null;typeCode:number;caption:string;group:string;hint:string;
  options:readonly string[];positional:readonly CorpusBinaryNode[];
}
export function corpusBinaryVariables(document:CorpusBinaryDocument):CorpusBinaryVariable[] {
  if(document.nodes[0]?.value!=='EVarList')throw Error('Očekivan EVarList');
  return corpusBinaryObjects(document).filter(o=>o.className==='Var').map(o=>{
    const fields=corpusBinaryField(o,'Group')[0]?.children;
    if(!fields||fields.length!==12)throw Error(`Nepoznata Group šema @${o.offset}`);
    const type=fields[0]!.value,name=fields[1]!.value,value=fields[2]!.value,caption=fields[4]!.value,group=fields[7]!.value,hint=fields[9]!.value;
    if(typeof type!=='number'||typeof name!=='string'||typeof caption!=='string'||typeof group!=='string'||typeof hint!=='string'||value===undefined)throw Error(`Neispravni podaci varijable @${o.offset}`);
    const options=corpusBinaryField(o,'list')[0]?.children??[];
    if(options.some(n=>typeof n.value!=='string'))throw Error(`Neispravna lista izbora @${o.offset}`);
    return {name,storedValue:value,typeCode:type,caption,group,hint,options:options.map(n=>String(n.value)),positional:fields};
  });
}
export function corpusBinaryTools(document:CorpusBinaryDocument){
  if(document.nodes[0]?.value!=='TCTLIST')throw Error('Očekivan TCTLIST');
  const objects=corpusBinaryObjects(document),root=objects[0]!;
  const declared=corpusBinaryField(root,'cnt')[0]?.value;
  const tools=objects.filter(o=>['TACTD','TACTM','TACTS'].includes(o.className)).map(o=>({
    className:o.className,name:corpusBinaryField(o,'na')[0]?.value,toolNumber:corpusBinaryField(o,'to')[0]?.value,
    diameter:corpusBinaryField(o,'dia')[0]?.value,fields:o.fields,
  }));
  if(declared!==tools.length)throw Error(`Broj alata ${declared} != ${tools.length}`);
  return tools;
}
export function corpusBinaryDrillPresets(document:CorpusBinaryDocument){
  if(document.nodes[0]?.value!=='PDRLREC')throw Error('Očekivan PDRLREC');
  const root=corpusBinaryObjects(document)[0]!,field=corpusBinaryField(root,'list');
  const list=field.at(-1)?.children??[];const count=field.at(-2)?.value;
  if(typeof count!=='number'||list.length!==count*7)throw Error('Nepoznata šema predefinisanih bušenja');
  return Array.from({length:count},(_,i)=>{const row=list.slice(i*7,i*7+7);return {id:row[0]!.value,diameterCandidate:row[1]!.value,depthCandidate:row[2]!.value,modeRaw:row[3]!.value,flag1:row[4]!.value,flag2:row[5]!.value,name:row[6]!.value,fields:row};});
}
