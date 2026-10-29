import { Box3, Euler, Matrix4, Vector3 } from 'three';
import {corpusBoardDimensions} from './corpus-geometry.ts';
import {corpusBoardRenderTransform} from './corpus-render-transform.ts';
import type {CorpusS3dElement} from './corpus-s3d.ts';
export type DragBody={element:CorpusS3dElement;min:[number,number,number];max:[number,number,number]};
export type DragContact={axis:'x'|'y'|'z';coordinate:number;from:number;to:number;bottom:number;top:number;kind:'wall'|'element'};
export type DragSnapResult={delta:[number,number];contacts:DragContact[]};
/** Visible physical board bounds, including nested fronts, rather than saved element envelopes. */
export function corpusDragBody(element:CorpusS3dElement):DragBody|null {
 const bounds=new Box3();
 const visit=(entry:CorpusS3dElement,parent:Matrix4)=>{
  if(entry.visible===false)return;
  const [x,y,z]=entry.position;if(x===null||y===null||z===null)return;
  const local=new Matrix4().makeRotationFromEuler(new Euler(-(entry.xAngle??0)*Math.PI/180,-(entry.angle??0)*Math.PI/180,(entry.zAngle??0)*Math.PI/180));
  local.setPosition(x,y,-z);const world=parent.clone().multiply(local);
  for(const board of entry.boards){
   if(board.visible===false||[...board.position,board.height,board.width,board.thickness].some(v=>v===null))continue;
   if(board.height!<=0||board.width!<=0||board.thickness!<=0)continue;
   const size=corpusBoardDimensions(board.direction,board.height!,board.width!,board.thickness!);
   const t=corpusBoardRenderTransform(board.position as [number,number,number],[size[0],size[1],board.direction===1?-size[2]:size[2]],[board.xAngle??0,board.angle??0,board.zAngle??0]);
   const transform=new Matrix4().makeRotationFromEuler(new Euler(...t.rotation));transform.setPosition(...t.position);transform.premultiply(world);
   for(const ax of [-1,1])for(const ay of [-1,1])for(const az of [-1,1]){
    const p=new Vector3(ax*size[0]/2,ay*size[1]/2,az*size[2]/2).applyMatrix4(transform);p.z=-p.z;bounds.expandByPoint(p);
   }
  }
  entry.children.forEach(child=>visit(child,world));
 };
 visit(element,new Matrix4());
 return bounds.isEmpty()?null:{element,min:bounds.min.toArray() as [number,number,number],max:bounds.max.toArray() as [number,number,number]};
}
const eps=0.001;
const intersects=(a0:number,a1:number,b0:number,b1:number)=>Math.min(a1,b1)-Math.max(a0,b0)>eps;
const translated=(body:DragBody,d:readonly number[]):DragBody=>({...body,min:[body.min[0]+d[0]!,body.min[1],body.min[2]+d[1]!],max:[body.max[0]+d[0]!,body.max[1],body.max[2]+d[1]!]});
const overlaps=(a:DragBody,b:DragBody)=>[0,1,2].every(i=>intersects(a.min[i]!,a.max[i]!,b.min[i]!,b.max[i]!));
/** Snap near contact, then sweep the full motion so fast mouse moves cannot tunnel through obstacles.
 * Existing intersections are left escapable, never silently repaired.
 */
export function corpusDragSnap(moving:readonly DragBody[],obstacles:readonly DragBody[],room:{x:number;z:number},desired:readonly [number,number],previous:readonly [number,number]=[0,0],tolerance=15):DragSnapResult {
 let target:[number,number]=[...desired];
 const blockedPairs=new Set<string>();
 moving.forEach((a,i)=>obstacles.forEach((b,j)=>{if(overlaps(a,b))blockedPairs.add(`${i}:${j}`);}));
 // Choose the nearest face per axis; alignment alone is not a contact.
 for(const [di,axis,limit] of [[0,0,room.x],[1,2,room.z]] as const){
  let adjustment:number|undefined;
  const offer=(value:number)=>{if(Math.abs(value)<=tolerance&&(adjustment===undefined||Math.abs(value)<Math.abs(adjustment)))adjustment=value;};
  moving.forEach((body,i)=>{
   const a=translated(body,target),other=axis===0?2:0;
   if(body.min[axis]>=-eps&&body.max[axis]<=limit+eps){offer(-a.min[axis]);offer(limit-a.max[axis]);}
   obstacles.forEach((b,j)=>{
    if(blockedPairs.has(`${i}:${j}`)||!intersects(a.min[1],a.max[1],b.min[1],b.max[1])||!intersects(a.min[other]!,a.max[other]!,b.min[other]!,b.max[other]!))return;
    offer(b.min[axis]-a.max[axis]);offer(b.max[axis]-a.min[axis]);
   });
  });
  if(adjustment!==undefined)target[di]+=adjustment;
 }
 const velocity:[number,number]=[target[0]-previous[0],target[1]-previous[1]];
 let fraction=1;
 moving.forEach((body,i)=>{
  const a=translated(body,previous);
  for(const [di,axis,limit] of [[0,0,room.x],[1,2,room.z]] as const){
   const speed=velocity[di];
   if(body.min[axis]>=-eps&&body.max[axis]<=limit+eps){
    if(speed<0)fraction=Math.min(fraction,Math.max(0,-a.min[axis]/speed));
    if(speed>0)fraction=Math.min(fraction,Math.max(0,(limit-a.max[axis])/speed));
   }
  }
  obstacles.forEach((b,j)=>{
   if(blockedPairs.has(`${i}:${j}`)||!intersects(a.min[1],a.max[1],b.min[1],b.max[1]))return;
   let enter=-Infinity,leave=Infinity;
   for(const [di,axis] of [[0,0],[1,2]] as const){
    const speed=velocity[di];
    if(Math.abs(speed)<1e-12){if(!intersects(a.min[axis],a.max[axis],b.min[axis],b.max[axis]))return;continue;}
    const t0=(b.min[axis]-a.max[axis])/speed,t1=(b.max[axis]-a.min[axis])/speed;
    enter=Math.max(enter,Math.min(t0,t1));leave=Math.min(leave,Math.max(t0,t1));
   }
   if(enter>=-1e-9&&enter<=leave&&leave>1e-9)fraction=Math.min(fraction,Math.max(0,enter));
  });
 });
 const delta:[number,number]=[previous[0]+velocity[0]*fraction,previous[1]+velocity[1]*fraction];
 const contacts:DragContact[]=[];
 moving.forEach((body,i)=>{
  const a=translated(body,delta);
  for(const [axis,coordinate,other] of [[0,0,2],[0,room.x,2],[2,0,0],[2,room.z,0]] as const){
   if(Math.min(Math.abs(a.min[axis]-coordinate),Math.abs(a.max[axis]-coordinate))<eps)
    contacts.push({axis:axis===0?'x':'z',coordinate,from:a.min[other],to:a.max[other],bottom:a.min[1],top:a.max[1],kind:'wall'});
  }
  obstacles.forEach((b,j)=>{
   if(blockedPairs.has(`${i}:${j}`)||!intersects(a.min[1],a.max[1],b.min[1],b.max[1]))return;
   for(const [axis,other] of [[0,2],[2,0]] as const){
    if(!intersects(a.min[other],a.max[other],b.min[other],b.max[other]))continue;
    const coordinate=Math.abs(a.max[axis]-b.min[axis])<eps?b.min[axis]:Math.abs(a.min[axis]-b.max[axis])<eps?b.max[axis]:undefined;
    if(coordinate!==undefined)contacts.push({axis:axis===0?'x':'z',coordinate,from:Math.max(a.min[other],b.min[other]),to:Math.min(a.max[other],b.max[other]),bottom:Math.max(a.min[1],b.min[1]),top:Math.min(a.max[1],b.max[1]),kind:'element'});
   }
  });
 });
 return {delta,contacts};
}
