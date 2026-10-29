import {corpusElementGeometryAliases,corpusBoardGeometryAliases} from "./corpus-geometry-aliases.ts";
import { analyzeCorpusAssignments, evaluateCorpusAssignments, type CorpusExpressionValue, type CorpusAssignmentAnalysis } from './corpus-expression.ts';
import { corpusBoardDimensions } from './corpus-geometry.ts';
import { applyCorpusVariableVisibility } from './corpus-variable-visibility.ts';
import { parseCorpusE3d, type CorpusS3dBoard, type CorpusS3dElement } from './corpus-s3d.ts';
import { writeCorpusE3dGeometryCopy, replaceCorpusE3dBoardContour } from './corpus-s3d-writer.ts';
const fields = [
 ['X','XF'], ['Y','YF'], ['Z','ZF'], ['VISINA','HF'], ['SIRINA','SF'], ['DEBLJINA','DF'],
 ['XKUT','KXF'], ['DKUT','KYF'], ['ZKUT','KZF'],
] as const;
const boardValues = (b: CorpusS3dBoard) => [ ...b.position, b.height, b.width, b.thickness, b.xAngle, b.angle, b.zAngle ];
type Scope = { element: CorpusS3dElement; prefix: string; parent?: Scope; children: Scope[]; aliases: Map<string,string> };
const elementFields = [ ['X','EXF'], ['Y','EYF'], ['Z','EZF'], ['VISINA','EHF'], ['SIRINA','ESF'], ['DUBINA','EDF'], ['XKUT','EKXF'], ['DKUT','EKYF'], ['ZKUT','EKZF'] ] as const;
const elementValues = (e: CorpusS3dElement) => [...e.position,e.height,e.width,e.depth,e.xAngle,e.angle,e.zAngle];

/** One dependency graph spans local boards, child geometry and inherited variables.
 * Formula targets never use saved results as inputs; unresolved geometry retains its source value.
 * Child placement/dimensions evaluate in the parent scope, child boards in their own scope.
 */
export type CorpusGeometryIssue = {
 elementPath: number[]; elementName: string; boardIndex: number | null; boardName: string | null;
 field: string; expression: string; missingReferences?: string[]; reason: 'missing' | 'cycle' | 'invalid' | 'unresolved' | 'value';
};
export function recalculateCorpusBoards(element: CorpusS3dElement): CorpusS3dElement {
 return calculateCorpusGeometry(element, false).element;
}
/** Read-only report of formula targets whose saved geometry must be retained. */
export function inspectCorpusGeometryIssues(element: CorpusS3dElement): CorpusGeometryIssue[] {
 return calculateCorpusGeometry(element, true).issues;
}
/** Diagnostics for the same visible scope as the default production lists. */
export function inspectCorpusProductionGeometryIssues(elements:readonly CorpusS3dElement[]):CorpusGeometryIssue[] {
 return elements.flatMap((root,rootIndex)=>inspectCorpusGeometryIssues(root).filter(issue=>{
  let current:CorpusS3dElement|undefined=root;
  if(current.visible===false)return false;
  for(const index of issue.elementPath.slice(1)) {
   current=current?.children[index];
   if(!current||current.visible===false)return false;
  }
  return issue.boardIndex===null||current?.boards[issue.boardIndex]?.visible!==false;
 }).map(issue=>({...issue,elementPath:[rootIndex,...issue.elementPath.slice(1)]})));
}
export function inspectCorpusVariableAssignments(element: CorpusS3dElement, elementPath: readonly number[] = [0], variables?: Record<string,string>): CorpusAssignmentAnalysis[] {
 if(elementPath[0]!==0)return [];
 const stage=(current:CorpusS3dElement,depth:number):CorpusS3dElement=>{
  if(depth===elementPath.length)return variables?{...current,variables}:current;
  return {...current,children:current.children.map((child,i)=>i===elementPath[depth]?stage(child,depth+1):child)};
 };
 return calculateCorpusGeometry(stage(element,1),true).variableAnalyses.filter(entry=>entry.elementPath.join('.')===elementPath.join('.')).map(entry=>entry.analysis);
}
function calculateCorpusGeometry(element: CorpusS3dElement, report: boolean): {element: CorpusS3dElement; issues: CorpusGeometryIssue[]; variableAnalyses:Array<{elementPath:number[];analysis:CorpusAssignmentAnalysis}>} {
 const scopes: Scope[]=[];
 const build=(e:CorpusS3dElement,prefix:string,parent?:Scope):Scope=>{
  const scope:Scope={element:e,prefix,parent,children:[],aliases:new Map()};
  scopes.push(scope); scope.children=e.children.map((child,i)=>build(child,`${prefix}C${i}`,scope)); return scope;
 };
 const root=build(element,'E0');
 const geometry=(scope:Scope,key:string)=>`${scope.prefix}G_${key}`;
 const boardKey=(scope:Scope,i:number,key:string)=>`${scope.prefix}B${i}_${key}`;
 // Construct every scope before translating references to siblings or descendants.
 for(const scope of scopes){
  elementFields.forEach(([key])=>scope.aliases.set(key,geometry(scope,key)));
  for(const [alias,key] of corpusElementGeometryAliases) scope.aliases.set(alias,geometry(scope,key));
  const names=[...scope.element.boards.map(b=>b.name.toUpperCase()),...scope.children.map(c=>c.element.name.toUpperCase())];
  scope.element.boards.forEach((board,i)=>{
   const name=board.name.toUpperCase();if(names.filter(n=>n===name).length!==1)return;
   fields.forEach(([key])=>scope.aliases.set(`${name}.${key}`,boardKey(scope,i,key)));
   for(const [alias,key] of corpusBoardGeometryAliases)scope.aliases.set(`${name}.${alias}`,boardKey(scope,i,key));
   for(const axis of ['X','Y','Z'])for(const end of ['MIN','MAX'])scope.aliases.set(`${name}.AABB.${axis}${end}`,boardKey(scope,i,`AABB_${axis}${end}`));
  });
  scope.children.forEach(child=>{
   const name=child.element.name.toUpperCase();if(names.filter(n=>n===name).length!==1)return;
   elementFields.forEach(([key])=>scope.aliases.set(`${name}.${key}`,geometry(child,key)));
   for(const [alias,key] of corpusElementGeometryAliases)scope.aliases.set(`${name}.${alias}`,geometry(child,key));
  });
  Object.keys(scope.element.variables).forEach((name,i)=>scope.aliases.set(name.toUpperCase(),`${scope.prefix}V${i}`));
 }
 // Preserve a human reference for registered geometry that cannot yet resolve (e.g. rotated AABB).
 const referenceLabels=new Map<string,string>();
 for(const scope of scopes)for(const [label,key] of scope.aliases)if(!referenceLabels.has(key))referenceLabels.set(key,label);
 const readableMissing=(names:readonly string[])=>[...new Set(names.map(name=>referenceLabels.get(name)??name))];
 const lookup=(scope:Scope|undefined,key:string):string|undefined=>scope?.aliases.get(key)??(scope?.parent?lookup(scope.parent,key):undefined);
 const referencePatterns=new Map<Scope,RegExp>();
 const tokenPattern="[A-Za-zČĆŽŠĐčćžšđ_][A-Za-zČĆŽŠĐčćžšđ0-9_.]*";
 const escapePattern=(value:string)=>value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
 for(const scope of scopes){
  const keys=new Set<string>();
  for(let current:Scope|undefined=scope;current;current=current.parent)for(const key of current.aliases.keys())if(/^[A-ZČĆŽŠĐ_][A-ZČĆŽŠĐ0-9_ ]*\.[A-ZČĆŽŠĐ0-9_.]+$/.test(key)&&key.includes(" "))keys.add(key);
  const multi=[...keys].sort((a,b)=>b.length-a.length).map(escapePattern);
  referencePatterns.set(scope,new RegExp(multi.length?`(?<![A-Za-zČĆŽŠĐčćžšđ0-9_.])(?:${multi.join("|")})(?![A-Za-zČĆŽŠĐčćžšđ0-9_.])|${tokenPattern}`:tokenPattern,"gi"));
 }
 const translate=(expression:string,scope:Scope,self?:string)=>expression.replace(referencePatterns.get(scope)!,token=>{
  let key=token.toUpperCase();if(self&&key.startsWith('SELF.'))key=self.toUpperCase()+key.slice(4);
  return lookup(scope,key)??key;
 });
 const initial:Record<string,CorpusExpressionValue>={};
 const assignments:Array<{name:string;expression:string}>=[];
 const targets=new Map<string,CorpusGeometryIssue & {dimension:boolean}>();
 const add=(name:string,value:number|null|undefined,expression:string|undefined,scope:Scope,self?:string)=>{
  if(expression)assignments.push({name,expression:translate(expression,scope,self)});
  else if(typeof value==='number'&&Number.isFinite(value))initial[name]=value;
 };
 for(const scope of scopes){
  elementFields.forEach(([key,formula],j)=>add(geometry(scope,key),elementValues(scope.element)[j],scope.parent?scope.element.formulas?.[formula]:undefined,scope.parent??scope,scope.element.name));
  if(report && scope.parent)elementFields.forEach(([key,formula],j)=>{
   const expression=scope.element.formulas?.[formula];
   if(expression)targets.set(geometry(scope,key),{elementPath:scope.prefix.match(/\d+/g)!.map(Number),elementName:scope.element.name,boardIndex:null,boardName:null,field:key,expression,reason:'unresolved',dimension:j>=3&&j<=5});
  });
  Object.entries(scope.element.variables).forEach(([name,expression],i)=>assignments.push({name:`${scope.prefix}V${i}`,expression:translate(expression,scope)}));
  scope.element.boards.forEach((board,i)=>fields.forEach(([key,formula],j)=>{
   add(boardKey(scope,i,key),boardValues(board)[j],board.formulas?.[formula],scope,board.name);
   const expression=board.formulas?.[formula];
   if(report&&expression)targets.set(boardKey(scope,i,key),{elementPath:scope.prefix.match(/\d+/g)!.map(Number),elementName:scope.element.name,boardIndex:i,boardName:board.name,field:key,expression,reason:'unresolved',dimension:j>=3&&j<=5});
  }));
 }
 let values:Record<string,CorpusExpressionValue>={};
 const bounds:Record<string,CorpusExpressionValue>={};
 const boardCount=scopes.reduce((sum,scope)=>sum+scope.element.boards.length,0);
 for(let pass=0;pass<=boardCount;pass++){
  values=evaluateCorpusAssignments(assignments,{...initial,...bounds}).values;
  let added=false;
  for(const scope of scopes)scope.element.boards.forEach((board,i)=>{
   const v=fields.map(([key])=>values[boardKey(scope,i,key)]);
   if(v.some(value=>typeof value!=='number'||!Number.isFinite(value))||v[6]!==0||v[7]!==0||v[8]!==0||board.direction===null)return;
   const [x,y,z,h,w,t]=v as number[];
   const dimensions=corpusBoardDimensions(board.direction,h!,w!,t!);
   [x!,y!,z!].forEach((position,axis)=>{
    for(const [end,value] of [['MIN',position],['MAX',position+dimensions[axis]!]] as const){
     const key=boardKey(scope,i,`AABB_${['X','Y','Z'][axis]}${end}`);
     if(!(key in bounds)){bounds[key]=value;added=true;}
    }
   });
  });
  if(!added)break;
 }
 const read=(key:string,before:number|null|undefined,dimension:boolean)=>{
  const value=values[key];return typeof value==='number'&&Number.isFinite(value)&&(!dimension||value>=0)?value:before??null;
 };
 const output=(scope:Scope):CorpusS3dElement=>{
  const previous=elementValues(scope.element),next=elementFields.map(([key],j)=>read(geometry(scope,key),previous[j],j>=3&&j<=5));
  const boards=scope.element.boards.map((board,i)=>{
   const old=boardValues(board),v=fields.map(([key],j)=>read(boardKey(scope,i,key),old[j],j>=3&&j<=5));
   return {...board,position:v.slice(0,3) as [number|null,number|null,number|null],height:v[3]!,width:v[4]!,thickness:v[5]!,xAngle:v[6]!,angle:v[7]!,zAngle:v[8]!};
  });
  return {...scope.element,position:next.slice(0,3) as [number|null,number|null,number|null],height:next[3]!,width:next[4]!,depth:next[5]!,xAngle:next[6]!,angle:next[7]!,zAngle:next[8]!,boards,children:scope.children.map(output)};
 };
 const issues:CorpusGeometryIssue[]=[];
 const analyses=report?analyzeCorpusAssignments(assignments,{...initial,...bounds}):[];
 const byName=new Map(analyses.map(analysis=>[analysis.normalizedName,analysis]));
 const missingReferences=(name:string,visited=new Set<string>()):string[]=>{
  if(visited.has(name))return [];
  visited.add(name);
  const analysis=byName.get(name);
  if(!analysis||analysis.status==='resolved')return [];
  return [...new Set([...analysis.missing,...analysis.dependencies.flatMap(dependency=>missingReferences(dependency,visited))])];
 };
 for(const analysis of analyses){
  const target=targets.get(analysis.name);
  if(!target)continue;
  const value=values[analysis.name];
  if(analysis.status==='resolved'&&typeof value==='number'&&Number.isFinite(value)&&(!target.dimension||value>=0))continue;
  const {dimension,...issue}=target;
  const missing=readableMissing(missingReferences(analysis.normalizedName));
  issues.push({...issue,reason:analysis.status==='resolved'?'value':analysis.status,...(missing.length?{missingReferences:missing}:{})});
 }
 const variableAnalyses=report?scopes.flatMap(scope=>Object.entries(scope.element.variables).map(([name,expression],i)=>{
  const analysis=byName.get(`${scope.prefix}V${i}`)!;
  const missing=analysis?readableMissing(missingReferences(analysis.normalizedName)):[];
  return {elementPath:scope.prefix.match(/\d+/g)!.map(Number),analysis:{...analysis,name,expression,normalizedName:name.toUpperCase(),dependencies:[],missing,status:missing.length?'missing' as const:analysis?.status??'invalid' as const,value:analysis?.value??null}};
 })):[];
 return {element:output(root),issues,variableAnalyses};
}
export function corpusBoardHasRebuildableRectangle(board: CorpusS3dBoard): boolean {
 const near=(a:number,b:number|null)=>b!==null&&Math.abs(a-b)<0.001;
 const points=board.curvePoints;
 const corners=points.map(p=>[near(p.x,0)?0:near(p.x,board.height)?1:-1,near(p.z,0)?0:near(p.z,board.width)?1:-1]);
 return points.length===4&&points.every(p=>p.style===0)&&corners.every(c=>!c.includes(-1))&&new Set(corners.map(c=>c.join(','))).size===4;
}
export function recalculateCorpusE3dVariables(xml:string, options: { rejectInvalidDimensions?: boolean } = {}):string {
 const before=parseCorpusE3d(xml).elements;
 if(options.rejectInvalidDimensions) {
  const invalid = before.flatMap(element=>inspectCorpusGeometryIssues(element)).find(issue=>issue.reason==='value');
  if(invalid) {
   const arrayFit = invalid.field === 'DEBLJINA' && invalid.expression.startsWith('IF(') && invalid.expression.endsWith(';-1)');
   const detail = arrayFit ? `raspored ploče „${invalid.boardName || invalid.elementName}“ ne staje u zadani otvor` : `${invalid.boardName || invalid.elementName} ima nedozvoljenu dimenziju (${invalid.field})`;
   throw new Error(`Promjena nije primijenjena: ${detail}. Provjeri otvor, broj i debljinu ploča, uvlačenje i ručne pozicije. Prethodno stanje je sačuvano.`);
  }
 }

 const after=before.map(element=>applyCorpusVariableVisibility(recalculateCorpusBoards(element)));
 let output=writeCorpusE3dGeometryCopy(xml,before,after);
 // Rebuild only proven four-corner rectangles. Other contours retain their source.
 const rebuild=(root:CorpusS3dElement,next:CorpusS3dElement,path:number[])=>{
 root.boards.forEach((board,i)=>{
   const changed=next.boards[i]!;
   if(board.height===changed.height&&board.width===changed.width)return;
   if(changed.height===null||changed.width===null||changed.height<=0||changed.width<=0)return;
   if(corpusBoardHasRebuildableRectangle(board))
     output=replaceCorpusE3dBoardContour(output,i,[{x:0,z:0},{x:changed.height,z:0},{x:changed.height,z:changed.width},{x:0,z:changed.width}],path);
 });
 root.children.forEach((child,i)=>rebuild(child,next.children[i]!,[...path,i]));
 };
 before.forEach((root,i)=>rebuild(root,after[i]!,[i]));
 return output;
}
