import {corpusDragSnap,type DragBody,type DragContact} from './corpus-drag-snap.ts';
import {corpusAxisDragSnap} from './corpus-axis-drag.ts';
type Point=[number,number,number];
export type CorpusDragMotion={moving:readonly DragBody[];offset:Point;previous:Point;bypass:boolean};
export function createCorpusDragMotion(moving:readonly DragBody[],bypass=false):CorpusDragMotion {
 return {moving,offset:[0,0,0],previous:[0,0,0],bypass};
}
export function resolveCorpusDragMotion(state:CorpusDragMotion,desired:Point,options:{bypass:boolean;origin:Point;obstacles:readonly DragBody[];room:Point;step:number;axis?:Point}):{state:CorpusDragMotion;delta:Point;contacts:DragContact[]} {
 let moving=state.moving,offset=state.offset;
 if(state.bypass&&!options.bypass){
  offset=[...state.previous];
  const shift=offset.map((v,i)=>v-state.offset[i]!);
  moving=moving.map(body=>({...body,min:body.min.map((v,i)=>v+shift[i]!) as Point,max:body.max.map((v,i)=>v+shift[i]!) as Point}));
 }
 let delta:Point,contacts:DragContact[]=[];
 if(options.bypass)delta=[...desired];
 else if(options.axis){
  const axis=options.axis;
  const raw=desired.reduce((sum,v,i)=>sum+v*axis[i]!,0);
  const baseline=offset.reduce((sum,v,i)=>sum+v*axis[i]!,0);
  const snap=corpusAxisDragSnap(moving,options.obstacles,axis,Math.round(raw/options.step)*options.step-baseline,options.room,Math.max(15,options.step));
  delta=axis.map(v=>v*(snap.distance+baseline)) as Point;contacts=snap.contacts;
 }else{
  const candidate=desired.map((v,i)=>i===1?v:Math.round((options.origin[i]!+v)/options.step)*options.step-options.origin[i]!);
  const snap=corpusDragSnap(moving,options.obstacles,{x:options.room[0],z:options.room[2]},[candidate[0]!-offset[0],candidate[2]!-offset[2]],[state.previous[0]-offset[0],state.previous[2]-offset[2]],Math.max(15,options.step));
  delta=[snap.delta[0]+offset[0],0,snap.delta[1]+offset[2]];contacts=snap.contacts;
 }
 return {delta,contacts,state:{moving,offset,previous:[...delta],bypass:options.bypass}};
}
