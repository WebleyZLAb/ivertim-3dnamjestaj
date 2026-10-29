import type {DragBody,DragContact} from './corpus-drag-snap.ts';
const eps=0.001;
export function corpusAxisDragSnap(moving:readonly DragBody[],obstacles:readonly DragBody[],direction:readonly [number,number,number],desired:number,room:readonly [number,number,number],tolerance=15):{distance:number;contacts:DragContact[]} {
 const overlap=(a:DragBody,b:DragBody)=>[0,1,2].every(i=>Math.min(a.max[i]!,b.max[i]!)-Math.max(a.min[i]!,b.min[i]!)>eps);
 const limit=(sign:number)=>{
  let maximum=Infinity;
  for(const a of moving){
   for(let i=0;i<3;i++){
    const v=direction[i]!*sign;
    if(a.min[i]!>=-eps&&a.max[i]!<=room[i]!+eps){
     if(v>1e-9)maximum=Math.min(maximum,(room[i]!-a.max[i]!)/v);
     if(v< -1e-9)maximum=Math.min(maximum,-a.min[i]!/v);
    }
   }
   for(const b of obstacles){
    if(overlap(a,b))continue;
    let enter=-Infinity,leave=Infinity,miss=false;
    for(let i=0;i<3;i++){
     const v=direction[i]!*sign;
     if(Math.abs(v)<1e-9){if(Math.min(a.max[i]!,b.max[i]!)-Math.max(a.min[i]!,b.min[i]!)<=eps){miss=true;break;}continue;}
     const p=(b.min[i]!-a.max[i]!)/v,q=(b.max[i]!-a.min[i]!)/v;
     enter=Math.max(enter,Math.min(p,q));leave=Math.min(leave,Math.max(p,q));
    }
    if(!miss&&enter>=-eps&&leave>eps&&enter<=leave)maximum=Math.min(maximum,Math.max(0,enter));
   }
  }
  return Math.max(0,maximum);
 };
 const high=limit(1),low=-limit(-1);
 let distance=Math.max(low,Math.min(high,desired));
 if(Number.isFinite(high)&&Math.abs(distance-high)<=tolerance)distance=high;
 if(Number.isFinite(low)&&Math.abs(distance-low)<=tolerance)distance=low;
 const contacts:DragContact[]=[];
 for(const original of moving){
  const a={...original,min:original.min.map((v,i)=>v+direction[i]!*distance),max:original.max.map((v,i)=>v+direction[i]!*distance)};
  const face=(axis:number,coordinate:number,b:{min:readonly number[];max:readonly number[]},kind:'wall'|'element')=>{
   const others=[0,1,2].filter(i=>i!==axis);
   if(!others.every(i=>Math.min(a.max[i]!,b.max[i]!)-Math.max(a.min[i]!,b.min[i]!)>eps))return;
   const lo=(i:number)=>Math.max(a.min[i]!,b.min[i]!),hi=(i:number)=>Math.min(a.max[i]!,b.max[i]!);
   contacts.push({axis:axis===0?'x':axis===1?'y':'z',coordinate,from:lo(axis===0?2:0),to:hi(axis===0?2:0),bottom:lo(axis===1?2:1),top:hi(axis===1?2:1),kind});
  };
  for(let axis=0;axis<3;axis++){
   for(const coordinate of [0,room[axis]!])if(Math.min(Math.abs(a.min[axis]!-coordinate),Math.abs(a.max[axis]!-coordinate))<eps)face(axis,coordinate,{min:[0,0,0],max:room},'wall');
   for(const b of obstacles){
    if(overlap(original,b))continue;
    if(Math.abs(a.max[axis]!-b.min[axis]!)<eps)face(axis,b.min[axis]!,b,'element');
    else if(Math.abs(a.min[axis]!-b.max[axis]!)<eps)face(axis,b.max[axis]!,b,'element');
   }
  }
 }
 return {distance,contacts};
}
