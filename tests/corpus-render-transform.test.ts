import test from 'node:test';
import assert from 'node:assert/strict';
import {Euler,Vector3} from 'three';
import {corpusBoardRenderTransform} from '../lib/corpus-render-transform.ts';
const near=(a:number,b:number)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
test('nerotirana ploča zadržava dosadašnji položaj',()=>{
 assert.deepEqual(corpusBoardRenderTransform([18,860,600],[2460,7,650],[0,0,0]).position,[1248,863.5,-275]);
});
test('Tijana zidna obloga X90 kreće od izvornog ugla, raste 650mm i ostaje uz zid',()=>{
 const size=[2460,7,650] as const;
 const t=corpusBoardRenderTransform([0,0,0],size,[90,0,0]);
 const corners=[];
 for(const x of [-1230,1230])for(const y of [-3.5,3.5])for(const z of [-325,325]) corners.push(new Vector3(x,y,z).applyEuler(new Euler(...t.rotation)).add(new Vector3(...t.position)));
 near(Math.min(...corners.map(p=>p.y))+860,860);
 near(Math.max(...corners.map(p=>p.y))+860,1510);
 near(Math.min(...corners.map(p=>p.z)),-7);
 near(Math.max(...corners.map(p=>p.z)),0);
});
test('pri kombinovanim uglovima početni ugao ostaje na sačuvanoj tački',()=>{
 const size=[600,18,300] as const;
 const t=corpusBoardRenderTransform([20,40,-60],size,[30,70,15]);
 const corner=new Vector3(-300,-9,-150).applyEuler(new Euler(...t.rotation)).add(new Vector3(...t.position));
 near(corner.x,20);near(corner.y,40);near(corner.z,60);
});

test('fronta i leđa imaju debljinu prema prednjoj strani, bez preklapanja s korpusom',()=>{
 const front=corpusBoardRenderTransform([0,0,0],[405,736,-18],[0,0,0]);
 near(front.position[2]-9,-18); near(front.position[2]+9,0);
 const back=corpusBoardRenderTransform([8,2,-303],[802,716,-3],[0,0,0]);
 near(back.position[2]-1.5,300);near(back.position[2]+1.5,303);
});
