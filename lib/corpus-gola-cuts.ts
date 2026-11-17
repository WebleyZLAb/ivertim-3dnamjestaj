import { parseCorpusE3d, type CorpusS3dBoard, type CorpusS3dCurvePoint } from "./corpus-s3d.ts";
import { corpusElementAtPath } from "./corpus-model.ts";
import { writeCorpusGolaContour, readCorpusGolaSettings } from "./corpus-s3d-writer.ts";
import { validateStraightContour } from "./corpus-contour.ts";

export type GolaCut = { kind:"L"|"C"; enabled:boolean; height:number; depth:number; y:number; radius:number };
export function golaSideAvailable(board:CorpusS3dBoard):boolean { return board.direction===0 && [board.angle,board.xAngle,board.zAngle].every(value=>value===null||Math.abs(value)<0.0001) && board.height!==null && board.width!==null; }
export function golaContour(board:CorpusS3dBoard,cuts:readonly GolaCut[]):CorpusS3dCurvePoint[] {
 const h=board.height!,w=board.width!;
 if(!golaSideAvailable(board)||!Number.isFinite(h)||!Number.isFinite(w)||h<=0||w<=0)throw new Error("Izaberi nerotirane bočne stranice sa poznatim mjerama.");
 const enabled=cuts.filter(c=>c.enabled);
 if(!enabled.length)throw new Error("Uključi najmanje jedan usjek.");
 if(enabled.filter(c=>c.kind==="L").length>1)throw new Error("Dozvoljen je jedan gornji L usjek.");
 const intervals=enabled.map(c=>{
  if([c.height,c.depth,c.radius,c.y].some(v=>!Number.isFinite(v))||c.height<=0||c.depth<=0||c.depth>=w||c.radius<0||c.radius>Math.min(c.depth,c.kind==="C"?c.height/2:c.height))throw new Error("Provjeri visinu, dubinu i radijus usjeka.");
  if(c.kind==="C"&&board.position[1]===null)throw new Error("Y položaj stranice nije poznat.");
  const bottom=c.kind==="L"?h-c.height:c.y-board.position[1]!;
  const top=bottom+c.height;
  if(bottom<=0||top>h+0.001||(c.kind==="C"&&top>=h-0.001))throw new Error(`Usjek izlazi iz stranice „${board.name}“. Y je donja ivica C usjeka, od dna elementa.`);
  return {...c,bottom,top};
 }).sort((a,b)=>a.bottom-b.bottom);
 for(let i=1;i<intervals.length;i++)if(intervals[i]!.bottom<=intervals[i-1]!.top+0.001)throw new Error("Usjeci se dodiruju ili preklapaju.");
 const points:CorpusS3dCurvePoint[]=[];
 const add=(x:number,z:number,r=0)=>{const prev=points.at(-1);if(prev&&Math.abs(prev.x-x)<1e-8&&Math.abs(prev.z-z)<1e-8){if(r){prev.style=2;prev.arcRadius=r;prev.arcSmooth=0;}return;}points.push({index:points.length,x,z,style:r?2:0,arcRadius:r||null,arcSmooth:r?0:null,previousControl:null,nextControl:null});};
 add(0,0);
 for(const c of intervals){add(c.bottom,0);add(c.bottom,c.depth-c.radius,c.radius);if(c.radius)add(c.bottom+c.radius,c.depth);
  if(c.kind==="C"){add(c.top-c.radius,c.depth,c.radius);if(c.radius)add(c.top,c.depth-c.radius);add(c.top,0);}else add(h,c.depth);
 }
 if(intervals.at(-1)?.kind!=="L")add(h,0);
 add(h,w);add(0,w);
 validateStraightContour(points);
 return points;
}
function rectangular(board:CorpusS3dBoard):boolean {
 const p=board.curvePoints;
 if(!p.length)return true;
 return p.length===4 && p.every(v=>v.style===0 && (Math.abs(v.x)<0.05||Math.abs(v.x-board.height!)<0.05) && (Math.abs(v.z)<0.05||Math.abs(v.z-board.width!)<0.05)) && new Set(p.map(v=>`${Math.abs(v.x)<0.05?0:1}:${Math.abs(v.z)<0.05?0:1}`)).size===4;
}
export function applyGolaCuts(xml:string,boardIndexes:readonly number[],cuts:readonly GolaCut[],path:readonly number[]=[0]):string {
 if(!boardIndexes.length||new Set(boardIndexes).size!==boardIndexes.length)throw new Error("Izaberi stranice koje želiš usjeći.");
 let output=xml;
 for(const i of boardIndexes){
  if(!Number.isInteger(i)||i<0)throw new Error("Neispravna stranica.");
  const base=writeCorpusGolaContour(output,i,null,path);
  const root=parseCorpusE3d(base).elements;
  const element=corpusElementAtPath(root,path);
  for(let depth=1;depth<=path.length;depth++){const ancestor=corpusElementAtPath(root,path.slice(0,depth));if(!ancestor||ancestor.locked===true||ancestor.editable===false)throw new Error("Element ili nadređeni element je zaključan.");}
  const board=element?.boards[i];if(!board||!rectangular(board))throw new Error("Početna kontura mora biti pravougaona. Postojeći izrezi nisu prepisani.");
  const points=golaContour(board,cuts);
  const data=points.flatMap((p,index)=>[`PTOCKA=${index}`,`PTSTYLE=${p.style}`,`PTX=${p.x/1000}`,`PTZ=${p.z/1000}`,...(p.arcRadius?[`PTARRA=${p.arcRadius/1000}`,`PTARSM=0`]:[])]).map(value=>`&quot;${value}&quot;`).join(",");
  output=writeCorpusGolaContour(output,i,`<KRIVULJE DATA="${data}"/>`,path,JSON.stringify(cuts));
 }
 return output;
}
export function removeGolaCuts(xml:string,boardIndexes:readonly number[],path:readonly number[]=[0]):string {
 if(!boardIndexes.length)throw new Error("Izaberi stranice.");
 let output=xml;for(const i of boardIndexes)output=writeCorpusGolaContour(output,i,null,path);
 if(output===xml)throw new Error("Na izabranim stranicama nema usjeka napravljenih ovim alatom.");
 return output;
}

export function readGolaCuts(xml:string,boardIndex:number,path:readonly number[]=[0]):GolaCut[]|null {
 try {const raw=readCorpusGolaSettings(xml,boardIndex,path);if(!raw)return null;const rows:unknown=JSON.parse(raw);if(!Array.isArray(rows)||rows.length!==4||rows.some(row=>!row||!["L","C"].includes(row.kind)||typeof row.enabled!=="boolean"||[row.height,row.depth,row.y,row.radius].some(v=>typeof v!=="number"||!Number.isFinite(v))))return null;return rows as GolaCut[];}catch{return null;}
}
