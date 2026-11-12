import {preset,rng,pointAt,observe,teacher,stepVehicle,nearest,DT,INPUTS,HIDDEN,PHYSICS_VERSION} from '../drive-core.mjs';
import {writeFileSync} from 'node:fs';
const random=rng(482),rows=[];
let completed=0;
for(let seed=1;seed<=80;seed++){
 const track=preset(seed*139);
 for(let i=0;i<900;i++){
  const p=pointAt(track,random()*track.length),wide=i%3===0;
  const offset=(random()-.5)*track.width*(wide?1.6:.5);
  const state={x:p.x-Math.sin(p.angle)*offset,y:p.y+Math.cos(p.angle)*offset,angle:p.angle+(random()-.5)*(wide?.9:.3),speed:15+random()*120};
  rows.push([...observe(track,state),...teacher(track,state)]);
 }
 const p=pointAt(track,0);let state={...p,speed:30},distance=0,lastArc=0;
 for(let step=0;step<2400;step++){
  const near=nearest(track,state);if(near.distance>track.width-2)break;
  let delta=near.arc-lastArc;if(delta>track.length/2)delta-=track.length;if(delta< -track.length/2)delta+=track.length;
  distance+=delta;lastArc=near.arc;if(distance>=track.length-3){completed++;break;}
  const action=teacher(track,state);if(step%2===0)rows.push([...observe(track,state,near),...action]);
  state=stepVehicle(state,...action,DT);
 }
}
writeFileSync(new URL('training-data.json',import.meta.url),JSON.stringify({architecture:[INPUTS,HIDDEN,2],physicsVersion:PHYSICS_VERSION,tracks:80,randomSeed:482,rows}));
console.log(`Generated ${rows.length} driving examples on 80 procedural circuits. Teacher completed ${completed}/80.`);
